"use client";



import { useState } from "react";

import DeleteCategoryModal from "@/components/DeleteCategoryModal";

import { useAppData } from "@/components/providers/AppDataProvider";

import { habitCountInCategory } from "@/lib/categoryDelete";
import { ui } from "@/lib/uiClasses";



export default function CategoryManager() {

  const {

    hydrated,

    dataLoading,

    categories,

    definitions,

    removeCategoryById,

  } = useAppData();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);



  const pendingCat = pendingDeleteId

    ? categories.find((c) => c.id === pendingDeleteId)

    : null;

  const pendingCount = pendingDeleteId

    ? habitCountInCategory(definitions, pendingDeleteId)

    : 0;



  const finishRemove = async (catId: string, moveToId?: string) => {

    const r = await removeCategoryById(catId, moveToId);

    if (!r.ok) {

      window.alert(r.error ?? "Could not remove category.");

      return;

    }

    setMessage("Category removed.");

    setPendingDeleteId(null);

    window.setTimeout(() => setMessage(null), 3000);

  };



  const startRemove = (cat: { id: string; isDefault: boolean }) => {

    if (cat.isDefault) return;

    const count = habitCountInCategory(definitions, cat.id);

    if (count === 0) {

      if (!window.confirm("Remove this category?")) return;

      void finishRemove(cat.id);

      return;

    }

    setPendingDeleteId(cat.id);

  };



  if (!hydrated || dataLoading) {

    return (

      <p className="text-sm text-[var(--foreground)]/50">Loading categories…</p>

    );

  }



  return (

    <section className="space-y-4">

      <div>

        <h2 className="text-lg font-semibold text-[var(--foreground)]">

          Categories

        </h2>

        <p className="mt-1 text-sm text-[var(--foreground)]/50">

          Remove custom categories. Habits are moved, never deleted. Default

          categories cannot be removed.

        </p>

      </div>



      {message ? (

        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/90">

          {message}

        </p>

      ) : null}



      <ul className="space-y-2">

        {categories.map((cat) => {

          const count = habitCountInCategory(definitions, cat.id);

          return (

            <li

              key={cat.id}

              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${ui.card}`}

            >

              <div className="min-w-0">

                <p className="font-medium text-[var(--foreground)]">{cat.name}</p>

                <p className="mt-0.5 text-xs text-[var(--foreground)]/45">

                  {count} habit{count === 1 ? "" : "s"}

                  {cat.isDefault ? " · Default category" : ""}

                </p>

              </div>

              {cat.isDefault ? (

                <span className="shrink-0 text-[11px] font-medium text-[var(--foreground)]/35">

                  Default category

                </span>

              ) : (

                <button

                  type="button"

                  onClick={() => startRemove(cat)}

                  className="shrink-0 rounded-lg border border-[var(--foreground)]/12 px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/70 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"

                >

                  Remove category

                </button>

              )}

            </li>

          );

        })}

      </ul>



      {pendingCat ? (

        <DeleteCategoryModal

          category={pendingCat}

          habitCount={pendingCount}

          categories={categories}

          onClose={() => setPendingDeleteId(null)}

          onConfirmDelete={() => void finishRemove(pendingCat.id)}

          onConfirmMove={(toId) => void finishRemove(pendingCat.id, toId)}

          onConfirmMoveToStudy={() => void finishRemove(pendingCat.id, "study")}

        />

      ) : null}

    </section>

  );

}

