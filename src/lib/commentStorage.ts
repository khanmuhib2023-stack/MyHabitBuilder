import type { HabitComment } from "@/lib/types";

export const HABIT_COMMENTS_KEY = "habit_comments";

function readRaw(): HabitComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HABIT_COMMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHabitComment);
  } catch {
    return [];
  }
}

function isHabitComment(x: unknown): x is HabitComment {
  if (!x || typeof x !== "object") return false;
  const c = x as HabitComment;
  return (
    typeof c.id === "string" &&
    typeof c.habitId === "string" &&
    typeof c.habitName === "string" &&
    typeof c.createdAt === "string" &&
    typeof c.text === "string" &&
    (c.sentiment === "positive" ||
      c.sentiment === "negative" ||
      c.sentiment === "neutral")
  );
}

export function getHabitComments(): HabitComment[] {
  return readRaw();
}

export function saveHabitComments(comments: HabitComment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HABIT_COMMENTS_KEY, JSON.stringify(comments));
}

export function addHabitComment(comment: HabitComment): void {
  const all = getHabitComments();
  all.push(comment);
  saveHabitComments(all);
}

export function deleteHabitComment(commentId: string): void {
  saveHabitComments(getHabitComments().filter((c) => c.id !== commentId));
}

export function updateHabitComment(
  commentId: string,
  patch: Pick<HabitComment, "text" | "sentiment">
): HabitComment | null {
  const all = getHabitComments();
  const idx = all.findIndex((c) => c.id === commentId);
  if (idx < 0) return null;
  const trimmed = patch.text.trim();
  if (!trimmed) return null;
  const updated: HabitComment = {
    ...all[idx],
    text: trimmed,
    sentiment: patch.sentiment,
    updatedAt: new Date().toISOString(),
  };
  const next = [...all];
  next[idx] = updated;
  saveHabitComments(next);
  return updated;
}

export function getCommentsForHabit(habitId: string): HabitComment[] {
  return getHabitComments()
    .filter((c) => c.habitId === habitId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getLatestCommentForHabit(
  habitId: string
): HabitComment | null {
  const list = getCommentsForHabit(habitId);
  return list[0] ?? null;
}

export function previewCommentText(text: string, max = 48): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function newCommentId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
