import type {
  HabitDefaultValue,
  HabitScoringKey,
  HabitTarget,
  HabitType,
} from "@/lib/flexHabitTypes";
import { getSupabase } from "@/lib/supabaseClient";

export type CloudCategory = {
  id: string;
  sync_code: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type CloudHabit = {
  id: string;
  sync_code: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  habit_type: HabitType;
  unit: string | null;
  target: HabitTarget | null;
  default_value: HabitDefaultValue | null;
  scoring_key: HabitScoringKey | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CloudLog = {
  id: string;
  sync_code: string;
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
  score: number | null;
  payload: Record<string, unknown> | null;
};

export type CloudComment = {
  id: string;
  sync_code: string;
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
  sync_code: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  habit_type: HabitType;
  unit?: string | null;
  target?: HabitTarget | null;
  default_value?: HabitDefaultValue | null;
  scoring_key?: HabitScoringKey | null;
  meta?: Record<string, unknown> | null;
};

export type CloudLogInput = {
  sync_code: string;
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
  score?: number | null;
  payload?: Record<string, unknown> | null;
};

export type CloudCategoryInput = {
  sync_code: string;
  name: string;
  is_default?: boolean;
};

export type CloudCommentInput = {
  id?: string;
  sync_code: string;
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

export async function getCloudHabits(syncCode: string): Promise<CloudHabit[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habits")
    .select("*")
    .eq("sync_code", syncCode)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudHabit[];
}

export async function saveCloudHabit(
  habit: CloudHabitInput
): Promise<CloudHabit> {
  const row = {
    sync_code: habit.sync_code,
    name: habit.name,
    category_id: habit.category_id ?? null,
    category_name: habit.category_name ?? null,
    habit_type: habit.habit_type,
    unit: habit.unit ?? null,
    target: habit.target ?? null,
    default_value: habit.default_value ?? null,
    scoring_key: habit.scoring_key ?? null,
    meta: habit.meta ?? null,
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
      scoring_key: habit.scoring_key ?? null,
      meta: habit.meta ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habit.id)
    .eq("sync_code", habit.sync_code)
    .select()
    .single();
  if (error) throw error;
  return data as CloudHabit;
}

export async function deleteCloudHabit(
  habitId: string,
  syncCode: string
): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("sync_code", syncCode);
  if (error) throw error;
}

export async function getCloudLogs(syncCode: string): Promise<CloudLog[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_logs")
    .select("*")
    .eq("sync_code", syncCode)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudLog[];
}

export async function upsertCloudLog(log: CloudLogInput): Promise<CloudLog> {
  const row = {
    sync_code: log.sync_code,
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
    score: log.score ?? null,
    payload: log.payload ?? null,
  };
  const { data, error } = await supabaseOrThrow()
    .from("habit_logs")
    .upsert(row, { onConflict: "sync_code,habit_id,log_date" })
    .select()
    .single();
  if (error) throw error;
  return data as CloudLog;
}

export async function getCloudCategories(
  syncCode: string
): Promise<CloudCategory[]> {
  const { data, error } = await supabaseOrThrow()
    .from("categories")
    .select("*")
    .eq("sync_code", syncCode)
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
      sync_code: category.sync_code,
      name: category.name,
      is_default: category.is_default ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CloudCategory;
}

export async function deleteCloudCategory(
  categoryId: string,
  syncCode: string
): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("sync_code", syncCode);
  if (error) throw error;
}

export async function getCloudComments(
  syncCode: string
): Promise<CloudComment[]> {
  const { data, error } = await supabaseOrThrow()
    .from("habit_comments")
    .select("*")
    .eq("sync_code", syncCode)
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
      sync_code: comment.sync_code,
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
    .eq("sync_code", comment.sync_code)
    .select()
    .single();
  if (error) throw error;
  return data as CloudComment;
}

export async function deleteCloudComment(
  commentId: string,
  syncCode: string
): Promise<void> {
  const { error } = await supabaseOrThrow()
    .from("habit_comments")
    .delete()
    .eq("id", commentId)
    .eq("sync_code", syncCode);
  if (error) throw error;
}
