import { supabase } from "@/integrations/supabase/client";
import { ApiResponse } from "./types";

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

export const setUsername = async (username: string): Promise<ApiResponse<null>> => {
  const { data: { user } } = await supabase.auth.getUser();
  const deviceId = getDeviceId();
  
  if (!user) {
    // For anonymous users, we'll store the username in localStorage
    // and use it in posts and activities
    localStorage.setItem("anonymousUsername", username);
    return { success: true, data: null };
  }
  
  // For authenticated users, update the database
  const { error } = await supabase
    .from("users")
    .update({ username })
    .eq("id", user.id);
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data: null };
};

export const getUsername = async (): Promise<ApiResponse<string | null>> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // For anonymous users, get username from localStorage
    const anonymousUsername = localStorage.getItem("anonymousUsername");
    return { success: true, data: anonymousUsername };
  }
  
  // For authenticated users, get from database
  const { data, error } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data: data?.username || null };
};

export const getUserByUsername = async (username: string): Promise<ApiResponse<any>> => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();
  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data };
};
