import type { HabitDefaultValue, HabitTarget, HabitType } from "@/lib/flexHabitTypes";
import type { HabitComment } from "@/lib/types";
import { getSupabase } from "@/lib/supabaseClient";

export type CloudCategory = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type CloudHabit = {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  habit_type: HabitType;
  unit: string | null;
  target: HabitTarget | null;
  default_value: HabitDefaultValue | null;
  created_at: string;
  updated_at: string;
};

export type CloudLog = {
  id: string;
  user_id: string;
  habit_id: string | null;
  habit_name: string;
  category_name: string | null;
  log_type: string | null;
  value: number | null;
  count: number | null;
  unit: string | null;
  comment: string | null;
  source: string | null;
  log_date: string;
  timestamp: string;
  created_at: string;
};

export type CloudComment = {
  id: string;
  user_id: string;
  habit_id: string | null;
  habit_name: string;
  category_name: string | null;
  text: string;
  sentiment: string;
  created_at: string;
  updated_at: string | null;
};

export type CloudHabitInput = {
  id?: string;
  user_id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  habit_type: HabitType;
  unit?: string | null;
  target?: HabitTarget | null;
  default_value?: HabitDefaultValue | null;
};

export type CloudLogInput = {
  user_id: string;
  habit_id: string | null;
  habit_name: string;
  category_name?: string | null;
  log_type: string;
  value?: number | null;
  count?: number | null;
  unit?: string | null;
  source?: string | null;
  log_date: string;
  timestamp: string;
};

export type CloudCategoryInput = {
  user_id: string;
  name: string;
  is_default?: boolean;
};

export type CloudCommentInput = {
  id?: string;
  user_id: string;
  habit_id: string | null;
  habit_name: string;
  category_name?: string | null;
  text: string;
  sentiment: string;
  created_at?: string;
  updated_at?: string | null;
};

function supabaseOrThrow() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

export async function getCloudHabits(userId: string): Promise<CloudHabit[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudHabit[];
}

export async function saveCloudHabit(
  habit: CloudHabitInput
): Promise<CloudHabit> {
  const row = {
    user_id: habit.user_id,
    name: habit.name,
    category_id: habit.category_id ?? null,
    category_name: habit.category_name ?? null,
    habit_type: habit.habit_type,
    unit: habit.unit ?? null,
    target: habit.target ?? null,
    default_value: habit.default_value ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseOrThrow()
    .from("habits")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as CloudHabit;
}

export async function updateCloudHabit(
  habit: CloudHabitInput & { id: string }
): Promise<CloudHabit> {
  const { data, error } = await supabaseOrThrow()
    .from("habits")
    .update({
      name: habit.name,
      category_id: habit.category_id ?? null,
      category_name: habit.category_name ?? null,
      habit_type: habit.habit_type,
      unit: habit.unit ?? null,
      target: habit.target ?? null,
      default_value: habit.default_value ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habit.id)
    .eq("user_id", habit.user_id)
    .select()
    .single();
  if (error) throw error;
  return data as CloudHabit;
}

export async function deleteCloudHabit(habitId: string): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("habits")
    .delete()
    .eq("id", habitId);
  if (error) throw error;
}

export async function getCloudLogs(userId: string): Promise<CloudLog[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudLog[];
}

export async function upsertCloudLog(log: CloudLogInput): Promise<CloudLog> {
  const row = {
    user_id: log.user_id,
    habit_id: log.habit_id,
    habit_name: log.habit_name,
    category_name: log.category_name ?? null,
    log_type: log.log_type,
    value: log.value ?? null,
    count: log.count ?? null,
    unit: log.unit ?? null,
    source: log.source ?? "manual",
    log_date: log.log_date,
    timestamp: log.timestamp,
  };
  const { data, error } = await supabaseOrThrow()
    .from("habit_logs")
    .upsert(row, { onConflict: "user_id,habit_id,log_date" })
    .select()
    .single();
  if (error) throw error;
  return data as CloudLog;
}

export async function getCloudCategories(userId: string): Promise<CloudCategory[]> {
  const { data, error } = await supabaseOrThrow()
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudCategory[];
}

export async function saveCloudCategory(
  category: CloudCategoryInput
): Promise<CloudCategory> {
  const { data, error } = await supabaseOrThrow()
    .from("categories")
    .insert({
      user_id: category.user_id,
      name: category.name,
      is_default: category.is_default ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CloudCategory;
}

export async function deleteCloudCategory(categoryId: string): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("categories")
    .delete()
    .eq("id", categoryId);
  if (error) throw error;
}

export async function getCloudComments(userId: string): Promise<CloudComment[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudComment[];
}

export async function addCloudComment(
  comment: CloudCommentInput
): Promise<CloudComment> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_comments")
    .insert({
      user_id: comment.user_id,
      habit_id: comment.habit_id,
      habit_name: comment.habit_name,
      category_name: comment.category_name ?? null,
      text: comment.text,
      sentiment: comment.sentiment,
      created_at: comment.created_at ?? new Date().toISOString(),
      updated_at: comment.updated_at ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CloudComment;
}

export async function updateCloudComment(
  comment: CloudCommentInput & { id: string }
): Promise<CloudComment> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_comments")
    .update({
      text: comment.text,
      sentiment: comment.sentiment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", comment.id)
    .eq("user_id", comment.user_id)
    .select()
    .single();
  if (error) throw error;
  return data as CloudComment;
}

export async function deleteCloudComment(commentId: string): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("habit_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}
