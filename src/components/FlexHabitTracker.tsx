"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddHabitModal from "@/components/AddHabitModal";
import GoalModal from "@/components/GoalModal";
import DefaultValueModal from "@/components/DefaultValueModal";
import CommentModal from "@/components/CommentModal";
import DeleteCategoryModal from "@/components/DeleteCategoryModal";
import { valueFromDefault } from "@/lib/defaultValueUtils";
import type { HabitDefaultValue } from "@/lib/flexHabitTypes";
import { previewCommentText } from "@/lib/commentStorage";
import HabitCategorySection from "@/components/HabitCategorySection";
import type { HabitDefinition, HabitTarget, HabitValue } from "@/lib/flexHabitTypes";
import {
  CATEGORY_DEFAULT_OPEN,
  DEFAULT_CATEGORY_IDS,
  type DefaultCategoryId,
} from "@/lib/flexHabitTypes";
import { categoryLabel } from "@/lib/categoryUtils";
import { habitCountInCategory } from "@/lib/categoryDelete";
import { useAppData } from "@/components/providers/AppDataProvider";
import { toYmd } from "@/lib/weekRange";

function initialSectionOpen(
  cats: { id: string }[]
): Record<string, boolean> {
  const o: Record<string, boolean> = {};
  for (const c of cats) {
    const id = c.id as DefaultCategoryId;
    o[c.id] =
      DEFAULT_CATEGORY_IDS.includes(id) && id in CATEGORY_DEFAULT_OPEN
        ? CATEGORY_DEFAULT_OPEN[id]
        : true;
  }
  return o;
}

export default function FlexHabitTracker() {
  const {
    hydrated,
    dataLoading,
    definitions,
    values,
    categories,
    comments,
    onValueChange,
    onAddHabit,
    onUpdateHabit,
    onDeleteHabit,
    onCreateCategory,
    removeCategoryById,
  } = useAppData();

  const [todayYmd, setTodayYmd] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    {}
  );
  const [goalHabit, setGoalHabit] = useState<HabitDefinition | null>(null);
  const [defaultHabit, setDefaultHabit] = useState<HabitDefinition | null>(
    null
  );
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(
    null
  );
  const [commentHabit, setCommentHabit] = useState<HabitDefinition | null>(
    null
  );

  useEffect(() => {
    if (!hydrated) return;
    setTodayYmd(toYmd(new Date()));
    setOpenSections(initialSectionOpen(categories));
  }, [hydrated, categories]);

  const latestCommentByHabit = useMemo(() => {
    const map: Record<string, string> = {};
    const sorted = [...comments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const c of sorted) {
      if (!map[c.habitId]) {
        map[c.habitId] = previewCommentText(c.text);
      }
    }
    return map;
  }, [comments]);

  const byCategory = useMemo(() => {
    const map: Record<string, HabitDefinition[]> = {};
    for (const c of categories) map[c.id] = [];
    for (const h of definitions) {
      if (!map[h.category]) map[h.category] = [];
      map[h.category].push(h);
    }
    return map;
  }, [definitions, categories]);

  const handleValueChange = useCallback(
    (habit: HabitDefinition, val: HabitValue) => {
      if (!todayYmd) return;
      onValueChange(habit, val, todayYmd, "manual");
    },
    [todayYmd, onValueChange]
  );

  const onAdd = useCallback(
    (habit: Omit<HabitDefinition, "id">) => {
      void onAddHabit(habit);
    },
    [onAddHabit]
  );

  const handleDeleteHabit = useCallback(
    (habitId: string) => {
      const habit = definitions.find((h) => h.id === habitId);
      const name = habit?.name ?? "this habit";
      const ok = window.confirm(
        `Delete "${name}"?\n\nThis removes the habit from your dashboard. Existing logs and comments are kept so your history and graphs are not lost.`
      );
      if (!ok) return;
      void onDeleteHabit(habitId);
    },
    [definitions, onDeleteHabit]
  );

  const finishDeleteCategory = useCallback(
    async (catId: string, moveToId?: string) => {
      const r = await removeCategoryById(catId, moveToId);
      if (!r.ok) {
        window.alert(r.error ?? "Could not remove category.");
        return;
      }
      setDeleteCategoryId(null);
    },
    [removeCategoryById]
  );

  const onDeleteCategory = useCallback(
    (catId: string) => {
      const cat = categories.find((c) => c.id === catId);
      if (!cat || cat.isDefault) {
        window.alert("Built-in categories cannot be removed.");
        return;
      }
      const count = habitCountInCategory(definitions, catId);
      if (count === 0) {
        if (!window.confirm("Remove this category?")) return;
        void finishDeleteCategory(catId);
        return;
      }
      setDeleteCategoryId(catId);
    },
    [categories, definitions, finishDeleteCategory]
  );

  const onUseDefault = useCallback(
    (habit: HabitDefinition) => {
      const val = valueFromDefault(habit);
      if (!val || !todayYmd) return;
      onValueChange(habit, val, todayYmd, "default");
    },
    [todayYmd, onValueChange]
  );

  const onSaveDefault = useCallback(
    (defaultValue: HabitDefaultValue | undefined) => {
      if (!defaultHabit) return;
      void onUpdateHabit(defaultHabit.id, { defaultValue });
      setDefaultHabit(null);
    },
    [defaultHabit, onUpdateHabit]
  );

  const onSaveGoal = useCallback(
    (target: HabitTarget | undefined) => {
      if (!goalHabit) return;
      void onUpdateHabit(goalHabit.id, { target });
      setGoalHabit(null);
    },
    [goalHabit, onUpdateHabit]
  );

  if (!hydrated || !todayYmd || dataLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-[var(--foreground)]/50">
          {dataLoading ? "Loading your data…" : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Habits
          </h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/50">
            Today · {todayYmd}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditMode((e) => !e)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              editMode
                ? "bg-[var(--foreground)]/15 text-[var(--foreground)]"
                : "text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/8 hover:text-[var(--foreground)]"
            }`}
          >
            {editMode ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Add habit"
            className="flex size-10 items-center justify-center rounded-full border border-[var(--foreground)]/12 bg-[var(--foreground)]/8 text-lg font-medium text-[var(--foreground)] transition hover:bg-[var(--foreground)]/14"
          >
            +
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {categories.map((cat) => (
          <HabitCategorySection
            key={cat.id}
            categoryId={cat.id}
            label={categoryLabel(categories, cat.id)}
            isDefaultCategory={cat.isDefault}
            habits={byCategory[cat.id] ?? []}
            values={values}
            todayYmd={todayYmd}
            onValueChange={handleValueChange}
            onUseDefault={onUseDefault}
            editMode={editMode}
            onDeleteHabit={handleDeleteHabit}
            onDeleteCategory={onDeleteCategory}
            isOpen={openSections[cat.id] ?? true}
            onToggle={() =>
              setOpenSections((prev) => ({
                ...prev,
                [cat.id]: !prev[cat.id],
              }))
            }
            onOpenGoal={(h) => setGoalHabit(h)}
            onOpenDefault={(h) => setDefaultHabit(h)}
            onOpenComment={(h) => setCommentHabit(h)}
            latestCommentByHabit={latestCommentByHabit}
          />
        ))}
      </div>

      {definitions.length === 0 && (
        <p className="mt-8 text-center text-sm text-[var(--foreground)]/45">
          No habits yet. Tap + to add one.
        </p>
      )}

      {addOpen && (
        <AddHabitModal
          onClose={() => setAddOpen(false)}
          onAdd={onAdd}
          categories={categories}
          onCreateCategory={onCreateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}

      {goalHabit && (
        <GoalModal
          habit={goalHabit}
          onClose={() => setGoalHabit(null)}
          onSave={onSaveGoal}
        />
      )}

      {defaultHabit && (
        <DefaultValueModal
          habit={defaultHabit}
          onClose={() => setDefaultHabit(null)}
          onSave={onSaveDefault}
        />
      )}

      {deleteCategoryId && (() => {
        const cat = categories.find((c) => c.id === deleteCategoryId);
        if (!cat) return null;
        const habitCount = definitions.filter(
          (h) => h.category === deleteCategoryId
        ).length;
        return (
          <DeleteCategoryModal
            category={cat}
            habitCount={habitCount}
            categories={categories}
            onClose={() => setDeleteCategoryId(null)}
            onConfirmDelete={() =>
              void finishDeleteCategory(deleteCategoryId)
            }
            onConfirmMove={(toId) =>
              void finishDeleteCategory(deleteCategoryId, toId)
            }
            onConfirmMoveToGood={() =>
              void finishDeleteCategory(deleteCategoryId, "good")
            }
          />
        );
      })()}

      {commentHabit && (
        <CommentModal
          habit={commentHabit}
          categoryLabel={categoryLabel(categories, commentHabit.category)}
          onClose={() => setCommentHabit(null)}
        />
      )}
    </div>
  );
}
