import type { HabitDefinition } from "@/lib/flexHabitTypes";

export const FLEX_CATEGORIES_KEY = "flexHabitCategories";

export type FlexCategory = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
};

export const DEFAULT_CATEGORY_LIST: FlexCategory[] = [
  { id: "good", name: "Good Habits", isDefault: true, createdAt: "0" },
  { id: "health", name: "Health", isDefault: true, createdAt: "0" },
  { id: "binary", name: "Binary", isDefault: true, createdAt: "0" },
  { id: "bad", name: "Bad Habits", isDefault: true, createdAt: "0" },
];

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  good: "good",
  health: "health",
  binary: "binary",
  bad: "bad",
  "good habits": "good",
  "bad habits": "bad",
};

function normalizeAlias(raw: string): string {
  const k = raw.trim().toLowerCase();
  return LEGACY_CATEGORY_ALIASES[k] ?? k;
}

function newCatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cat_${crypto.randomUUID()}`;
  }
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStoredCategory(raw: unknown): FlexCategory | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.length > 0 ? o.id : null;
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : null;
  const isDefault = o.isDefault === true;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  if (!id || !name) return null;
  return { id, name, isDefault, createdAt };
}

export function loadCategories(): FlexCategory[] {
  if (typeof window === "undefined") return [...DEFAULT_CATEGORY_LIST];
  try {
    const raw = localStorage.getItem(FLEX_CATEGORIES_KEY);
    if (raw == null || raw === "") return [...DEFAULT_CATEGORY_LIST];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORY_LIST];
    const customs: FlexCategory[] = [];
    for (const item of parsed) {
      const c = normalizeStoredCategory(item);
      if (c && !c.isDefault) customs.push(c);
    }
    const byId = new Map<string, FlexCategory>();
    for (const d of DEFAULT_CATEGORY_LIST) byId.set(d.id, d);
    for (const c of customs) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
    return sortCategoriesForDisplay([...byId.values()]);
  } catch {
    return [...DEFAULT_CATEGORY_LIST];
  }
}

export function saveCategories(list: FlexCategory[]): void {
  if (typeof window === "undefined") return;
  const customs = list.filter((c) => !c.isDefault);
  localStorage.setItem(FLEX_CATEGORIES_KEY, JSON.stringify(customs));
}

export function sortCategoriesForDisplay(list: FlexCategory[]): FlexCategory[] {
  const order = new Map(DEFAULT_CATEGORY_LIST.map((c, i) => [c.id, i]));
  return [...list].sort((a, b) => {
    const oa = order.has(a.id) ? (order.get(a.id) as number) : 100;
    const ob = order.has(b.id) ? (order.get(b.id) as number) : 100;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}

export function categoryLabel(list: FlexCategory[], id: string): string {
  const c = list.find((x) => x.id === id);
  return c?.name ?? id;
}

/** Always include built-in Good / Health / Binary / Bad categories. */
export function ensureDefaultCategories(list: FlexCategory[]): FlexCategory[] {
  const byId = new Map<string, FlexCategory>();
  for (const d of DEFAULT_CATEGORY_LIST) byId.set(d.id, d);
  for (const c of list) byId.set(c.id, c);
  return sortCategoriesForDisplay([...byId.values()]);
}

/** Map habit category to a valid category id (defaults to good). */
export function resolveHabitCategoryId(
  categoryId: string | undefined,
  list: FlexCategory[]
): string {
  const cats = ensureDefaultCategories(list);
  return migrateHabitCategoryId(categoryId ?? "good", cats);
}

/** Map stored habit category string to canonical id. */
export function migrateHabitCategoryId(raw: string, list: FlexCategory[]): string {
  const t = raw.trim();
  if (!t) return "good";
  if (list.some((c) => c.id === t)) return t;
  const norm = normalizeAlias(t);
  if (list.some((c) => c.id === norm)) return norm;
  const lower = t.toLowerCase();
  const match = list.find((c) => c.name.trim().toLowerCase() === lower);
  if (match) return match.id;
  if (t.length > 0) return t;
  return "good";
}

export function ensureCategoryForHabits(
  list: FlexCategory[],
  habits: HabitDefinition[]
): FlexCategory[] {
  const ids = new Set(list.map((c) => c.id));
  const next = [...list];
  for (const h of habits) {
    if (!ids.has(h.category)) {
      next.push({
        id: h.category,
        name: h.category,
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
      ids.add(h.category);
    }
  }
  return sortCategoriesForDisplay(next);
}

export function createCustomCategory(
  list: FlexCategory[],
  name: string
): FlexCategory | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (list.some((c) => c.name.trim().toLowerCase() === lower)) return null;
  const cat: FlexCategory = {
    id: newCatId(),
    name: trimmed,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };
  const merged = sortCategoriesForDisplay([...list, cat]);
  saveCategories(merged);
  return cat;
}

export function isProtectedCategory(id: string): boolean {
  return DEFAULT_CATEGORY_LIST.some((c) => c.id === id);
}

export function deleteCustomCategory(
  list: FlexCategory[],
  id: string,
  habits: HabitDefinition[],
  moveHabitsToId?: string
): { nextCategories: FlexCategory[]; nextHabits: HabitDefinition[]; error?: string } {
  const cat = list.find((c) => c.id === id);
  if (!cat) return { nextCategories: list, nextHabits: habits };
  if (cat.isDefault || isProtectedCategory(id)) {
    return {
      nextCategories: list,
      nextHabits: habits,
      error: "Built-in categories cannot be removed.",
    };
  }
  const using = habits.filter((h) => h.category === id);
  let nextHabits = habits;
  if (using.length > 0) {
    if (!moveHabitsToId) {
      return {
        nextCategories: list,
        nextHabits: habits,
        error: "needs_move",
      };
    }
    if (!list.some((c) => c.id === moveHabitsToId)) {
      return {
        nextCategories: list,
        nextHabits: habits,
        error: "Choose a valid category to move habits into.",
      };
    }
    nextHabits = moveHabitsToCategory(habits, id, moveHabitsToId);
  }
  const nextCategories = list.filter((c) => c.id !== id);
  saveCategories(nextCategories);
  return { nextCategories, nextHabits };
}

export function moveHabitsToCategory(
  habits: HabitDefinition[],
  fromId: string,
  toId: string
): HabitDefinition[] {
  return habits.map((h) =>
    h.category === fromId ? { ...h, category: toId } : h
  );
}
