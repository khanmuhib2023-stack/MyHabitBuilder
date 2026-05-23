import type { FlexCategory } from "@/lib/categoryUtils";
import {
  DEFAULT_CATEGORY_LIST,
  saveCategories,
} from "@/lib/categoryUtils";
import type {
  CloudCategory,
  CloudComment,
  CloudHabit,
  CloudLog,
} from "@/lib/cloudStorage";
import {
  addCloudComment,
  getCloudCategories,
  getCloudComments,
  getCloudHabits,
  getCloudLogs,
  saveCloudCategory,
  saveCloudHabit,
  updateCloudHabit,
  upsertCloudLog,
} from "@/lib/cloudStorage";
import type { HabitDefinition, HabitType, HabitValue } from "@/lib/flexHabitTypes";
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_IDS,
  type DefaultCategoryId,
} from "@/lib/flexHabitTypes";
import {
  loadDefinitions,
  loadValues,
  saveDefinitions,
  saveValues,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import { getHabitComments, saveHabitComments } from "@/lib/commentStorage";
import type { HabitComment } from "@/lib/types";
import { categoryLabel, loadCategories } from "@/lib/categoryUtils";
import {
  decodeValueFromCloud,
  encodeValueForCloud,
  habitToCloudInput,
} from "@/lib/cloudMappers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function defaultIdFromName(name: string | null | undefined): DefaultCategoryId | null {
  if (!name) return null;
  for (const id of DEFAULT_CATEGORY_IDS) {
    if (CATEGORY_LABELS[id].toLowerCase() === name.trim().toLowerCase()) {
      return id;
    }
  }
  return null;
}

function categoryNameForId(
  cats: FlexCategory[],
  categoryId: string
): string {
  return categoryLabel(cats, categoryId);
}

export function cloudBundleToApp(
  cloudCats: CloudCategory[],
  cloudHabits: CloudHabit[],
  cloudLogs: CloudLog[],
  cloudComments: CloudComment[]
): {
  definitions: HabitDefinition[];
  values: ValuesByDate;
  categories: FlexCategory[];
  comments: HabitComment[];
} {
  const customCats: FlexCategory[] = cloudCats
    .filter((c) => !c.is_default)
    .map((c) => ({
      id: c.id,
      name: c.name,
      isDefault: false,
      createdAt: c.created_at,
    }));

  const byId = new Map<string, FlexCategory>();
  for (const d of DEFAULT_CATEGORY_LIST) byId.set(d.id, d);
  for (const c of customCats) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const categories = [...byId.values()];

  const definitions: HabitDefinition[] = cloudHabits.map((h) => {
    const defaultCat = defaultIdFromName(h.category_name);
    const category =
      defaultCat ??
      (h.category_id && byId.has(h.category_id)
        ? h.category_id
        : defaultCat ?? "good");
    const def: HabitDefinition = {
      id: h.id,
      name: h.name,
      category,
      type: h.habit_type,
      unit: h.unit ?? undefined,
    };
    if (h.target) def.target = h.target;
    if (h.default_value) def.defaultValue = h.default_value;
    return def;
  });

  const habitById = new Map(definitions.map((h) => [h.id, h]));
  const values: ValuesByDate = {};
  for (const log of cloudLogs) {
    const habit = log.habit_id ? habitById.get(log.habit_id) : null;
    const type = (habit?.type ?? log.log_type ?? "number") as HabitType;
    const enc = decodeValueFromCloud(log, type);
    if (!enc || !log.habit_id) continue;
    if (!values[log.log_date]) values[log.log_date] = {};
    values[log.log_date][log.habit_id] = enc;
  }

  const comments: HabitComment[] = cloudComments.map((c) => ({
    id: c.id,
    habitId: c.habit_id ?? "",
    habitName: c.habit_name,
    habitCategory: c.category_name ?? undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at ?? undefined,
    text: c.text,
    sentiment: (c.sentiment === "positive" ||
    c.sentiment === "negative"
      ? c.sentiment
      : "neutral") as HabitComment["sentiment"],
  }));

  return { definitions, values, categories, comments };
}

export async function fetchCloudBundle(syncCode: string) {
  const [cloudCats, cloudHabits, cloudLogs, cloudComments] = await Promise.all([
    getCloudCategories(syncCode),
    getCloudHabits(syncCode),
    getCloudLogs(syncCode),
    getCloudComments(syncCode),
  ]);
  return cloudBundleToApp(
    cloudCats,
    cloudHabits,
    cloudLogs,
    cloudComments
  );
}

export function writeLocalBackup(bundle: {
  definitions: HabitDefinition[];
  values: ValuesByDate;
  categories: FlexCategory[];
  comments: HabitComment[];
}): void {
  saveDefinitions(bundle.definitions);
  saveValues(bundle.values);
  saveCategories(bundle.categories);
  saveHabitComments(bundle.comments);
}

export async function downloadCloudToLocal(syncCode: string): Promise<void> {
  const bundle = await fetchCloudBundle(syncCode);
  writeLocalBackup(bundle);
}

export async function uploadLocalToCloud(syncCode: string): Promise<{
  habits: number;
  logs: number;
  categories: number;
  comments: number;
}> {
  const localCats = loadCategories();
  const localDefs = loadDefinitions();
  const localValues = loadValues();
  const localComments = getHabitComments();

  const existingCats = await getCloudCategories(syncCode);
  const existingHabits = await getCloudHabits(syncCode);
  const existingLogs = await getCloudLogs(syncCode);
  const existingComments = await getCloudComments(syncCode);

  const catNameToCloudId = new Map<string, string>();
  for (const c of existingCats) {
    catNameToCloudId.set(c.name.toLowerCase(), c.id);
  }

  let categoriesUploaded = 0;
  for (const cat of localCats.filter((c) => !c.isDefault)) {
    const key = cat.name.toLowerCase();
    if (catNameToCloudId.has(key)) {
      catNameToCloudId.set(key, catNameToCloudId.get(key)!);
      continue;
    }
    const row = await saveCloudCategory({
      sync_code: syncCode,
      name: cat.name,
      is_default: false,
    });
    catNameToCloudId.set(key, row.id);
    categoriesUploaded++;
  }

  const habitKeyToCloudId = new Map<string, string>();
  for (const h of existingHabits) {
    habitKeyToCloudId.set(h.name.toLowerCase(), h.id);
    if (isUuid(h.id)) habitKeyToCloudId.set(h.id, h.id);
  }

  const localIdToCloudId = new Map<string, string>();
  let habitsUploaded = 0;

  for (const habit of localDefs) {
    const byName = habitKeyToCloudId.get(habit.name.toLowerCase());
    if (byName) {
      localIdToCloudId.set(habit.id, byName);
      await updateCloudHabit({
        ...habitToCloudInput(habit, syncCode, localCats),
        id: byName,
      });
      continue;
    }
    if (isUuid(habit.id) && existingHabits.some((h) => h.id === habit.id)) {
      localIdToCloudId.set(habit.id, habit.id);
      await updateCloudHabit({
        ...habitToCloudInput(habit, syncCode, localCats),
        id: habit.id,
      });
      continue;
    }
    const created = await saveCloudHabit(
      habitToCloudInput(habit, syncCode, localCats)
    );
    localIdToCloudId.set(habit.id, created.id);
    habitKeyToCloudId.set(habit.name.toLowerCase(), created.id);
    habitsUploaded++;
  }

  const logKeys = new Set(
    existingLogs.map((l) => `${l.habit_id ?? ""}:${l.log_date}`)
  );
  let logsUploaded = 0;

  for (const [ymd, day] of Object.entries(localValues)) {
    if (!day) continue;
    for (const [localHabitId, enc] of Object.entries(day)) {
      const cloudHabitId = localIdToCloudId.get(localHabitId) ?? localHabitId;
      const key = `${cloudHabitId}:${ymd}`;
      if (logKeys.has(key)) continue;
      const habit =
        localDefs.find((h) => h.id === localHabitId) ??
        localDefs.find((h) => localIdToCloudId.get(h.id) === cloudHabitId);
      if (!habit) continue;
      const payload = encodeValueForCloud(
        enc,
        habit,
        syncCode,
        cloudHabitId,
        ymd,
        categoryNameForId(localCats, habit.category)
      );
      await upsertCloudLog(payload);
      logKeys.add(key);
      logsUploaded++;
    }
  }

  const commentIds = new Set(existingComments.map((c) => c.id));
  let commentsUploaded = 0;

  for (const c of localComments) {
    if (commentIds.has(c.id) && isUuid(c.id)) continue;
    const cloudHabitId =
      localIdToCloudId.get(c.habitId) ??
      (isUuid(c.habitId) ? c.habitId : null);
    await addCloudComment({
      sync_code: syncCode,
      habit_id: cloudHabitId,
      habit_name: c.habitName,
      category_name: c.habitCategory ?? null,
      text: c.text,
      sentiment: c.sentiment,
      created_at: c.createdAt,
      updated_at: c.updatedAt ?? null,
    });
    commentsUploaded++;
  }

  return {
    habits: habitsUploaded,
    logs: logsUploaded,
    categories: categoriesUploaded,
    comments: commentsUploaded,
  };
}
