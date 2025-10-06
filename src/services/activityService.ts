import { supabase } from "@/integrations/supabase/client";
import { ApiResponse, UserActivity, ActivityType } from "./types";
import { getDeviceId, getUsername } from "./userService";

export async function logActivity(
  type: ActivityType,
  cafeId: string,
  metadata: any = {}
): Promise<ApiResponse<UserActivity>> {
  const { data: { user } } = await supabase.auth.getUser();
  const usernameRes = await getUsername();
  const username = usernameRes.success ? usernameRes.data : null;
  const { data, error } = await supabase
    .from("user_activities")
    .insert([
      {
        user_id: user?.id || null,
        username: username || null,
        activity_type: type,
        cafe_id: cafeId,
        metadata,
      }
    ])
    .select()
    .single();
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data };
}

export async function getUserActivities(userId: string): Promise<ApiResponse<UserActivity[]>> {
  const { data, error } = await supabase
    .from("user_activities")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

export async function getActivityFeed(): Promise<ApiResponse<UserActivity[]>> {
  const { data, error } = await supabase
    .from("user_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}
