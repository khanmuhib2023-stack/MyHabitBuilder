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
import { useAuth } from "@/components/providers/AuthProvider";
import {
  createCustomCategory,
  deleteCustomCategory,
  ensureCategoryForHabits,
  loadCategories,
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
  categoryLabel,
} from "@/lib/categoryUtils";
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
  onAddHabit: (partial: Omit<HabitDefinition, "id">) => Promise<void>;
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
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const isSynced = Boolean(userId && isSupabaseConfigured());

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
      setDefinitions(bundle.definitions);
      setValues(bundle.values);
      setCategories(bundle.categories);
      setComments(bundle.comments);
    },
    []
  );

  const loadFromSource = useCallback(async () => {
    const token = ++loadToken.current;
    setDataLoading(true);
    setError(null);
    try {
      if (userId && isSupabaseConfigured()) {
        const bundle = await fetchCloudBundle(userId);
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
      const msg =
        e instanceof Error &&
        (e.message.includes("JWT") ||
          e.message.includes("401") ||
          e.message.toLowerCase().includes("not authenticated"))
          ? "Could not load cloud data. Try logging out and back in."
          : "Could not load your data. Try again.";
      setError(msg);
      if (!userId) {
        applyBundle(loadLocalBundle());
      }
    } finally {
      if (token === loadToken.current) setDataLoading(false);
    }
  }, [userId, applyBundle]);

  useEffect(() => {
    if (authLoading) return;
    const id = window.setTimeout(() => {
      void loadFromSource().finally(() => setHydrated(true));
    }, 0);
    return () => window.clearTimeout(id);
  }, [authLoading, userId, loadFromSource]);

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
      if (!isSynced || !userId) return;
      setSaving(true);
      setError(null);
      try {
        await fn();
      } catch {
        setError("Could not save. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [isSynced, userId]
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
        if (isSynced && userId) {
          const enc = next[ymd]?.[habit.id];
          if (enc) {
            void withCloudSave(async () => {
              await upsertCloudLog(
                encodeValueForCloud(
                  enc,
                  habit,
                  userId,
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
    [isSynced, userId, categories, withCloudSave]
  );

  const onAddHabit = useCallback(
    async (partial: Omit<HabitDefinition, "id">) => {
      if (isSynced && userId) {
        await withCloudSave(async () => {
          const created = await saveCloudHabit(
            habitToCloudInput(partial, userId, categories)
          );
          const nextHabit: HabitDefinition = {
            id: created.id,
            name: created.name,
            category: partial.category,
            type: created.habit_type,
            unit: created.unit ?? undefined,
            ...(created.target ? { target: created.target } : {}),
            ...(created.default_value
              ? { defaultValue: created.default_value }
              : {}),
          };
          setDefinitions((prev) => [...prev, nextHabit]);
        });
        return;
      }
      setDefinitions((prev) => {
        const next = appendDefinition(prev, partial);
        saveDefinitions(next);
        return next;
      });
    },
    [isSynced, userId, categories, withCloudSave]
  );

  const onUpdateHabit = useCallback(
    async (habitId: string, patch: Partial<HabitDefinition>) => {
      setDefinitions((prev) => {
        const next = updateHabitDefinition(prev, habitId, patch);
        if (!isSynced) saveDefinitions(next);
        if (isSynced && userId) {
          const updated = next.find((h) => h.id === habitId);
          if (updated) {
            void withCloudSave(async () => {
              await updateCloudHabit({
                ...habitToCloudInput(updated, userId, categories),
                id: habitId,
              });
            });
          }
        }
        return next;
      });
    },
    [isSynced, userId, categories, withCloudSave]
  );

  const onDeleteHabit = useCallback(
    async (habitId: string) => {
      setDefinitions((prev) => {
        const next = prev.filter((h) => h.id !== habitId);
        if (!isSynced) saveDefinitions(next);
        return next;
      });
      if (isSynced && userId) {
        await withCloudSave(async () => {
          await deleteCloudHabit(habitId);
        });
      }
    },
    [isSynced, userId, withCloudSave]
  );

  const onCreateCategory = useCallback(
    (name: string): string | null => {
      const c = createCustomCategory(categories, name);
      if (!c) return null;
      const next = sortCategoriesForDisplay([...categories, c]);
      persistCategories(next);
      if (isSynced && userId) {
        void withCloudSave(async () => {
          const row = await saveCloudCategory({
            user_id: userId,
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
    [categories, persistCategories, isSynced, userId, withCloudSave]
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
        if (isSynced && userId) {
          await withCloudSave(async () => {
            for (const h of r.nextHabits!) {
              await updateCloudHabit({
                ...habitToCloudInput(h, userId, r.nextCategories ?? categories),
                id: h.id,
              });
            }
            if (!categories.find((c) => c.id === categoryId)?.isDefault) {
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  categoryId
                );
              if (isUuid) await deleteCloudCategory(categoryId);
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
      userId,
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
      if (isSynced && userId) {
        await withCloudSave(async () => {
          const row = await addCloudComment({
            user_id: userId,
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
    [comments, isSynced, userId, withCloudSave]
  );

  const editComment = useCallback(
    async (
      commentId: string,
      patch: Pick<HabitComment, "text" | "sentiment">
    ) => {
      if (isSynced && userId) {
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
            user_id: userId,
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
    [comments, isSynced, userId, withCloudSave]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (isSynced && userId) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        await withCloudSave(async () => {
          await deleteCloudComment(commentId);
        });
        return;
      }
      deleteHabitComment(commentId);
      setComments(getHabitComments());
    },
    [isSynced, userId, withCloudSave]
  );

  const uploadLocal = useCallback(async () => {
    if (!userId) return "Sign in to upload data.";
    setSaving(true);
    setError(null);
    try {
      const stats = await uploadLocalToCloud(userId);
      await loadFromSource();
      return `Uploaded: ${stats.habits} habits, ${stats.logs} logs, ${stats.categories} categories, ${stats.comments} comments.`;
    } catch {
      setError("Could not upload. Try again.");
      return "Upload failed.";
    } finally {
      setSaving(false);
    }
  }, [userId, loadFromSource]);

  const downloadCloud = useCallback(async () => {
    if (!userId) return "Sign in to download data.";
    setSaving(true);
    setError(null);
    try {
      await downloadCloudToLocal(userId);
      await loadFromSource();
      return "Cloud data saved to this device.";
    } catch {
      setError("Could not download. Try again.");
      return "Download failed.";
    } finally {
      setSaving(false);
    }
  }, [userId, loadFromSource]);

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
