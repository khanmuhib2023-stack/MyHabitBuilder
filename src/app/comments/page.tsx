"use client";

import { useMemo, useState } from "react";
import type { HabitComment } from "@/lib/types";
import EditCommentModal from "@/components/EditCommentModal";
import { useAppData } from "@/components/providers/AppDataProvider";
import { ui } from "@/lib/uiClasses";
type SentimentFilter = "all" | HabitComment["sentiment"];

function formatCommentWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: "—", time: "" };
  }
  return {
    date: d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function sentimentBadge(sentiment: HabitComment["sentiment"]): string {
  if (sentiment === "positive") return "👍 Positive";
  if (sentiment === "negative") return "👎 Negative";
  return "Neutral";
}

export default function CommentsPage() {
  const {
    hydrated,
    dataLoading,
    comments,
    categories,
    removeComment,
  } = useAppData();
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<HabitComment | null>(null);

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [comments]
  );

  const categoryNames = useMemo(() => {
    const fromComments = new Set(
      sortedComments.map((c) => c.habitCategory).filter(Boolean) as string[]
    );
    const fromCats = categories.map((c) => c.name);
    return [...new Set([...fromCats, ...fromComments])].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [sortedComments, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedComments.filter((c) => {
      if (sentimentFilter !== "all" && c.sentiment !== sentimentFilter) {
        return false;
      }
      if (
        categoryFilter !== "all" &&
        (c.habitCategory ?? "") !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.text.toLowerCase().includes(q) ||
        c.habitName.toLowerCase().includes(q)
      );
    });
  }, [sortedComments, sentimentFilter, categoryFilter, search]);

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    void removeComment(id);
  };

  if (!hydrated || dataLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-[var(--foreground)]/50">
          {dataLoading ? "Loading your data…" : "Loading…"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Comments
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/50">
          Your habit reflections, ordered by most recent.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--foreground)]/55">
          Sentiment
          <select
            value={sentimentFilter}
            onChange={(e) =>
              setSentimentFilter(e.target.value as SentimentFilter)
            }
            className={`px-3 py-2 text-sm ${ui.input}`}
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--foreground)]/55">
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 text-sm ${ui.input}`}
          >
            <option value="all">All categories</option>
            {categoryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--foreground)]/55 sm:col-span-2">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Habit name or comment text…"
            className={`px-3 py-2 text-sm ${ui.input}`}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm leading-relaxed text-[var(--foreground)]/45">
          {sortedComments.length === 0
            ? "No comments yet. Add a comment from any habit card to start reflecting."
            : "No comments match these filters."}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((c) => {
            const { date, time } = formatCommentWhen(c.createdAt);
            return (
              <li
                key={c.id}
                className={`${ui.card} p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">
                      {c.habitName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--foreground)]/45">
                      {c.habitCategory ? `${c.habitCategory} · ` : ""}
                      {date}
                      {time ? ` · ${time}` : ""}
                      {c.updatedAt ? (
                        <span className="ml-1 text-[var(--foreground)]/35">
                          · Edited
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-[var(--foreground)]/55">
                      {sentimentBadge(c.sentiment)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="text-[11px] font-medium text-[var(--foreground)]/50 hover:text-[var(--foreground)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="text-[11px] font-medium text-[var(--foreground)]/40 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]/80">
                  &ldquo;{c.text}&rdquo;
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <EditCommentModal
          comment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
    </main>
  );
}
