"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSyncCode } from "@/components/providers/SyncCodeProvider";
import {
  categoryLabel,
  createCustomCategory,
  deleteCustomCategory,
  ensureCategoryForHabits,
  ensureDefaultCategories,
  loadCategories,
  resolveHabitCategoryId,
  saveCategories,
  sortCategoriesForDisplay,
  type FlexCategory,
} from "@/lib/categoryUtils";
import { habitToCloudInput, encodeValueForCloud } from "@/lib/cloudMappers";
import {
  addCloudComment,
  deleteCloudCategory,
  deleteCloudComment,
  deleteCloudHabit,
  saveCloudCategory,
  saveCloudHabit,
  updateCloudComment,
  updateCloudHabit,
  upsertCloudLog,
} from "@/lib/cloudStorage";
import type { HabitDefinition, HabitTarget, HabitValue } from "@/lib/flexHabitTypes";
import {
  appendDefinition,
  DEFAULT_HABIT_DEFINITIONS,
  FLEX_HABIT_DEFINITIONS_KEY,
  loadDefinitions,
  loadValues,
  saveDefinitions,
  saveValues,
  setValueForHabit,
  updateHabitDefinition,
  type ValuesByDate,
} from "@/lib/flexHabitStorage";
import {
  addHabitComment,
  deleteHabitComment,
  getHabitComments,
  newCommentId,
  saveHabitComments,
  updateHabitComment,
} from "@/lib/commentStorage";
import type { HabitComment } from "@/lib/types";
import {
  downloadCloudToLocal,
  fetchCloudBundle,
  uploadLocalToCloud,
  writeLocalBackup,
} from "@/lib/syncBridge";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/supabaseErrors";
import type { HabitLogSource } from "@/lib/flexHabitTypes";

type AppDataContextValue = {
  hydrated: boolean;
  dataLoading: boolean;
  saving: boolean;
  error: string | null;
  isSynced: boolean;
  definitions: HabitDefinition[];
  values: ValuesByDate;
  categories: FlexCategory[];
  comments: HabitComment[];
  reload: () => void;
  setDefinitions: React.Dispatch<React.SetStateAction<HabitDefinition[]>>;
  setValues: React.Dispatch<React.SetStateAction<ValuesByDate>>;
  setCategories: React.Dispatch<React.SetStateAction<FlexCategory[]>>;
  persistDefinitions: (next: HabitDefinition[]) => void;
  persistValues: (next: ValuesByDate) => void;
  persistCategories: (next: FlexCategory[]) => void;
  onValueChange: (
    habit: HabitDefinition,
    val: HabitValue,
    ymd: string,
    source?: HabitLogSource
  ) => void;
  onAddHabit: (
    partial: Omit<HabitDefinition, "id">
  ) => Promise<{ error: string | null }>;
  onUpdateHabit: (
    habitId: string,
    patch: Partial<HabitDefinition>
  ) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onCreateCategory: (name: string) => string | null;
  removeCategoryById: (
    categoryId: string,
    moveHabitsToId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  addComment: (input: Omit<HabitComment, "id" | "createdAt">) => Promise<void>;
  editComment: (
    commentId: string,
    patch: Pick<HabitComment, "text" | "sentiment">
  ) => Promise<HabitComment | null>;
  removeComment: (commentId: string) => Promise<void>;
  uploadLocalToCloud: () => Promise<string>;
  downloadCloudToDevice: () => Promise<string>;
  clearError: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function prepareBundle(bundle: {
  definitions: HabitDefinition[];
  values: ValuesByDate;
  categories: FlexCategory[];
  comments: HabitComment[];
}) {
  let categories = ensureDefaultCategories(bundle.categories);
  const definitions = bundle.definitions.map((h) => ({
    ...h,
    category: resolveHabitCategoryId(h.category, categories),
  }));
  categories = ensureCategoryForHabits(categories, definitions);
  return { ...bundle, categories, definitions };
}

function loadLocalBundle() {
  const defs = loadDefinitions();
  let cats = loadCategories();
  cats = ensureCategoryForHabits(cats, defs);
  saveCategories(cats);
  return {
    definitions: defs,
    values: loadValues(),
    categories: cats,
    comments: getHabitComments(),
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { syncCode, loading: syncLoading } = useSyncCode();
  const isSynced = Boolean(syncCode && isSupabaseConfigured());

  const [hydrated, setHydrated] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState<HabitDefinition[]>([]);
  const [values, setValues] = useState<ValuesByDate>({});
  const [categories, setCategories] = useState<FlexCategory[]>([]);
  const [comments, setComments] = useState<HabitComment[]>([]);
  const loadToken = useRef(0);

  const applyBundle = useCallback(
    (bundle: {
      definitions: HabitDefinition[];
      values: ValuesByDate;
      categories: FlexCategory[];
      comments: HabitComment[];
    }) => {
      const prepared = prepareBundle(bundle);
      setDefinitions(prepared.definitions);
      setValues(prepared.values);
      setCategories(prepared.categories);
      setComments(prepared.comments);
    },
    []
  );

  const loadFromSource = useCallback(async () => {
    const token = ++loadToken.current;
    setDataLoading(true);
    setError(null);
    try {
      if (syncCode && isSupabaseConfigured()) {
        const bundle = await fetchCloudBundle(syncCode);
        if (token !== loadToken.current) return;
        applyBundle(bundle);
      } else {
        if (typeof window !== "undefined") {
          if (localStorage.getItem(FLEX_HABIT_DEFINITIONS_KEY) == null) {
            saveDefinitions(DEFAULT_HABIT_DEFINITIONS);
          }
        }
        const bundle = loadLocalBundle();
        if (token !== loadToken.current) return;
        applyBundle(bundle);
      }
    } catch (e) {
      if (token !== loadToken.current) return;
      console.error("[loadFromSource]", e);
      const detail = formatSupabaseError(e);
      const msg =
        e instanceof Error &&
        (e.message.includes("JWT") ||
          e.message.includes("401") ||
          e.message.toLowerCase().includes("not authenticated"))
          ? "Could not load cloud data. Try switching sync code and reconnecting."
          : `Could not load your data: ${detail}`;
      setError(msg);
      if (!syncCode) {
        applyBundle(loadLocalBundle());
      }
    } finally {
      if (token === loadToken.current) setDataLoading(false);
    }
  }, [syncCode, applyBundle]);

  useEffect(() => {
    if (syncLoading) return;
    const id = window.setTimeout(() => {
      void loadFromSource().finally(() => setHydrated(true));
    }, 0);
    return () => window.clearTimeout(id);
  }, [syncLoading, syncCode, loadFromSource]);

  const reload = useCallback(() => {
    void loadFromSource();
  }, [loadFromSource]);

  const persistDefinitions = useCallback(
    (next: HabitDefinition[]) => {
      setDefinitions(next);
      if (!isSynced) saveDefinitions(next);
    },
    [isSynced]
  );

  const persistValues = useCallback(
    (next: ValuesByDate) => {
      setValues(next);
      if (!isSynced) saveValues(next);
    },
    [isSynced]
  );

  const persistCategories = useCallback(
    (next: FlexCategory[]) => {
      const sorted = sortCategoriesForDisplay(next);
      setCategories(sorted);
      if (!isSynced) saveCategories(sorted);
    },
    [isSynced]
  );

  const withCloudSave = useCallback(
    async (fn: () => Promise<void>) => {
      if (!isSynced || !syncCode) return;
      setSaving(true);
      setError(null);
      try {
        await fn();
      } catch (e) {
        const msg = formatSupabaseError(e);
        console.error("[cloud save]", e);
        setError(`Could not save: ${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [isSynced, syncCode]
  );

  const onValueChange = useCallback(
    (
      habit: HabitDefinition,
      val: HabitValue,
      ymd: string,
      source: HabitLogSource = "manual"
    ) => {
      setValues((prev) => {
        const next = setValueForHabit(prev, ymd, habit, val, source);
        if (!isSynced) saveValues(next);
        if (isSynced && syncCode) {
          const enc = next[ymd]?.[habit.id];
          if (enc) {
            void withCloudSave(async () => {
              await upsertCloudLog(
                encodeValueForCloud(
                  enc,
                  habit,
                  syncCode,
                  habit.id,
                  ymd,
                  categoryLabel(categories, habit.category)
                )
              );
            });
          }
        }
        return next;
      });
    },
    [isSynced, syncCode, categories, withCloudSave]
  );

  const onAddHabit = useCallback(
    async (
      partial: Omit<HabitDefinition, "id">
    ): Promise<{ error: string | null }> => {
      const cats = ensureDefaultCategories(categories);
      const categoryId = resolveHabitCategoryId(partial.category, cats);
      const normalized: Omit<HabitDefinition, "id"> = {
        ...partial,
        name: partial.name.trim(),
        category: categoryId,
      };

      if (!isSynced || !syncCode) {
        setDefinitions((prev) => {
          const next = appendDefinition(prev, normalized);
          saveDefinitions(next);
          return next;
        });
        return { error: null };
      }

      const tempId = `pending_${Date.now()}`;
      const optimistic: HabitDefinition = { id: tempId, ...normalized };
      setDefinitions((prev) => [...prev, optimistic]);
      setError(null);

      try {
        setSaving(true);
        const created = await saveCloudHabit(
          habitToCloudInput(normalized, syncCode, cats)
        );
        const saved: HabitDefinition = {
          id: created.id,
          name: created.name,
          category: categoryId,
          type: created.habit_type,
          unit: created.unit ?? undefined,
          ...(created.target ? { target: created.target } : {}),
          ...(created.default_value
            ? { defaultValue: created.default_value }
            : {}),
        };
        setDefinitions((prev) =>
          prev.map((h) => (h.id === tempId ? saved : h))
        );
        return { error: null };
      } catch (e) {
        const msg = formatSupabaseError(e);
        console.error("[onAddHabit]", e);
        setDefinitions((prev) => prev.filter((h) => h.id !== tempId));
        setError(`Could not add habit: ${msg}`);
        return { error: msg };
      } finally {
        setSaving(false);
      }
    },
    [isSynced, syncCode, categories]
  );

  const onUpdateHabit = useCallback(
    async (habitId: string, patch: Partial<HabitDefinition>) => {
      setDefinitions((prev) => {
        const next = updateHabitDefinition(prev, habitId, patch);
        if (!isSynced) saveDefinitions(next);
        if (isSynced && syncCode) {
          const updated = next.find((h) => h.id === habitId);
          if (updated) {
            void withCloudSave(async () => {
              await updateCloudHabit({
                ...habitToCloudInput(updated, syncCode, categories),
                id: habitId,
              });
            });
          }
        }
        return next;
      });
    },
    [isSynced, syncCode, categories, withCloudSave]
  );

  const onDeleteHabit = useCallback(
    async (habitId: string) => {
      setDefinitions((prev) => {
        const next = prev.filter((h) => h.id !== habitId);
        if (!isSynced) saveDefinitions(next);
        return next;
      });
      if (isSynced && syncCode) {
        await withCloudSave(async () => {
          await deleteCloudHabit(habitId, syncCode);
        });
      }
    },
    [isSynced, syncCode, withCloudSave]
  );

  const onCreateCategory = useCallback(
    (name: string): string | null => {
      const c = createCustomCategory(categories, name);
      if (!c) return null;
      const next = sortCategoriesForDisplay([...categories, c]);
      persistCategories(next);
      if (isSynced && syncCode) {
        void withCloudSave(async () => {
          const row = await saveCloudCategory({
            sync_code: syncCode,
            name: c.name,
            is_default: false,
          });
          setCategories((prev) =>
            prev.map((cat) => (cat.id === c.id ? { ...cat, id: row.id } : cat))
          );
          setDefinitions((prev) =>
            prev.map((h) =>
              h.category === c.id ? { ...h, category: row.id } : h
            )
          );
        });
      }
      return c.id;
    },
    [categories, persistCategories, isSynced, syncCode, withCloudSave]
  );

  const removeCategoryById = useCallback(
    async (categoryId: string, moveHabitsToId?: string) => {
      const r = deleteCustomCategory(
        categories,
        categoryId,
        definitions,
        moveHabitsToId
      );
      if (r.error) return { ok: false, error: r.error };
      if (r.nextCategories) persistCategories(r.nextCategories);
      if (r.nextHabits) {
        persistDefinitions(r.nextHabits);
        if (isSynced && syncCode) {
          await withCloudSave(async () => {
            for (const h of r.nextHabits!) {
              await updateCloudHabit({
                ...habitToCloudInput(h, syncCode, r.nextCategories ?? categories),
                id: h.id,
              });
            }
            if (!categories.find((c) => c.id === categoryId)?.isDefault) {
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  categoryId
                );
              if (isUuid) await deleteCloudCategory(categoryId, syncCode);
            }
          });
        }
      }
      return { ok: true };
    },
    [
      categories,
      definitions,
      persistCategories,
      persistDefinitions,
      isSynced,
      syncCode,
      withCloudSave,
    ]
  );

  const addComment = useCallback(
    async (input: Omit<HabitComment, "id" | "createdAt">) => {
      const comment: HabitComment = {
        ...input,
        id: newCommentId(),
        createdAt: new Date().toISOString(),
      };
      if (isSynced && syncCode) {
        await withCloudSave(async () => {
          const row = await addCloudComment({
            sync_code: syncCode,
            habit_id: input.habitId || null,
            habit_name: input.habitName,
            category_name: input.habitCategory ?? null,
            text: input.text,
            sentiment: input.sentiment,
          });
          const saved: HabitComment = {
            ...comment,
            id: row.id,
          };
          setComments((prev) => [...prev, saved]);
        });
        return;
      }
      const next = [...comments, comment];
      setComments(next);
      saveHabitComments(next);
    },
    [comments, isSynced, syncCode, withCloudSave]
  );

  const editComment = useCallback(
    async (
      commentId: string,
      patch: Pick<HabitComment, "text" | "sentiment">
    ) => {
      if (isSynced && syncCode) {
        const existing = comments.find((c) => c.id === commentId);
        if (!existing) return null;
        const trimmed = patch.text.trim();
        if (!trimmed) return null;
        const updated: HabitComment = {
          ...existing,
          text: trimmed,
          sentiment: patch.sentiment,
          updatedAt: new Date().toISOString(),
        };
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? updated : c))
        );
        await withCloudSave(async () => {
          await updateCloudComment({
            id: commentId,
            sync_code: syncCode,
            habit_id: updated.habitId || null,
            habit_name: updated.habitName,
            category_name: updated.habitCategory ?? null,
            text: updated.text,
            sentiment: updated.sentiment,
          });
        });
        return updated;
      }
      const updated = updateHabitComment(commentId, patch);
      if (updated) setComments(getHabitComments());
      return updated;
    },
    [comments, isSynced, syncCode, withCloudSave]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (isSynced && syncCode) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        await withCloudSave(async () => {
          await deleteCloudComment(commentId, syncCode);
        });
        return;
      }
      deleteHabitComment(commentId);
      setComments(getHabitComments());
    },
    [isSynced, syncCode, withCloudSave]
  );

  const uploadLocal = useCallback(async () => {
    if (!syncCode) return "Enter a sync code to upload data.";
    setSaving(true);
    setError(null);
    try {
      const stats = await uploadLocalToCloud(syncCode);
      await loadFromSource();
      return `Uploaded: ${stats.habits} habits, ${stats.logs} logs, ${stats.categories} categories, ${stats.comments} comments.`;
    } catch {
      setError("Could not upload. Try again.");
      return "Upload failed.";
    } finally {
      setSaving(false);
    }
  }, [syncCode, loadFromSource]);

  const downloadCloud = useCallback(async () => {
    if (!syncCode) return "Enter a sync code to download data.";
    setSaving(true);
    setError(null);
    try {
      await downloadCloudToLocal(syncCode);
      await loadFromSource();
      return "Cloud data saved to this device.";
    } catch {
      setError("Could not download. Try again.");
      return "Download failed.";
    } finally {
      setSaving(false);
    }
  }, [syncCode, loadFromSource]);

  const value = useMemo(
    () => ({
      hydrated,
      dataLoading,
      saving,
      error,
      isSynced,
      definitions,
      values,
      categories,
      comments,
      reload,
      setDefinitions,
      setValues,
      setCategories,
      persistDefinitions,
      persistValues,
      persistCategories,
      onValueChange,
      onAddHabit,
      onUpdateHabit,
      onDeleteHabit,
      onCreateCategory,
      removeCategoryById,
      addComment,
      editComment,
      removeComment,
      uploadLocalToCloud: uploadLocal,
      downloadCloudToDevice: downloadCloud,
      clearError: () => setError(null),
    }),
    [
      hydrated,
      dataLoading,
      saving,
      error,
      isSynced,
      definitions,
      values,
      categories,
      comments,
      reload,
      persistDefinitions,
      persistValues,
      persistCategories,
      onValueChange,
      onAddHabit,
      onUpdateHabit,
      onDeleteHabit,
      onCreateCategory,
      removeCategoryById,
      addComment,
      editComment,
      removeComment,
      uploadLocal,
      downloadCloud,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
