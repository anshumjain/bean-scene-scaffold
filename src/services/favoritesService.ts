import { supabase } from "@/integrations/supabase/client";
import { ApiResponse, Favorite } from "./types";
import { getDeviceId } from "./userService";

export async function addFavorite(cafeId: string): Promise<ApiResponse<Favorite>> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Ensure we have either a user_id or device_id
  if (!user && !deviceId) {
    return { success: false, error: "No user or device ID available", data: null };
  }
  
  const { data, error } = await supabase
    .from("favorites")
    .insert([
      {
        user_id: user?.id || null,
        device_id: deviceId,
        cafe_id: cafeId,
      }
    ])
    .select()
    .single();
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data };
}

export async function removeFavorite(cafeId: string): Promise<ApiResponse<null>> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Build the OR condition properly
  let orCondition = "";
  if (user?.id) {
    orCondition = `user_id.eq.${user.id}`;
  }
  if (deviceId) {
    if (orCondition) orCondition += `,device_id.eq.${deviceId}`;
    else orCondition = `device_id.eq.${deviceId}`;
  }
  
  if (!orCondition) {
    return { success: false, error: "No user or device ID available", data: null };
  }
  
  const { error } = await supabase
    .from("favorites")
    .delete()
    .or(orCondition)
    .eq("cafe_id", cafeId);
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data: null };
}

export async function getFavorites(): Promise<ApiResponse<Favorite[]>> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Build the OR condition properly
  let orCondition = "";
  if (user?.id) {
    orCondition = `user_id.eq.${user.id}`;
  }
  if (deviceId) {
    if (orCondition) orCondition += `,device_id.eq.${deviceId}`;
    else orCondition = `device_id.eq.${deviceId}`;
  }
  
  if (!orCondition) {
    return { success: true, data: [] };
  }
  
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .or(orCondition);
  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

export async function isFavorited(cafeId: string): Promise<ApiResponse<boolean>> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Build the OR condition properly
  let orCondition = "";
  if (user?.id) {
    orCondition = `user_id.eq.${user.id}`;
  }
  if (deviceId) {
    if (orCondition) orCondition += `,device_id.eq.${deviceId}`;
    else orCondition = `device_id.eq.${deviceId}`;
  }
  
  if (!orCondition) {
    return { success: true, data: false };
  }
  
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .or(orCondition)
    .eq("cafe_id", cafeId)
    .maybeSingle();
  if (error) return { success: false, error: error.message, data: false };
  return { success: true, data: !!data };
}
