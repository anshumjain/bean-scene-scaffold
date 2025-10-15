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
  // Validate username format
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: "Username must be 3-20 characters long", data: null };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { success: false, error: "Username can only contain letters, numbers, and underscores", data: null };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  const deviceId = getDeviceId();
  
  // Check if username is already taken by someone else
  const { data: existingUsername, error: usernameCheckError } = await supabase
    .from("users")
    .select("id, device_id, auth_user_id")
    .eq("username", username)
    .single();
  
  if (usernameCheckError && usernameCheckError.code !== 'PGRST116') { // PGRST116 = no rows found
    return { success: false, error: "Error checking username availability", data: null };
  }
  
  if (existingUsername) {
    // Username exists - check if it's the same user
    if (user) {
      // For authenticated users
      if (existingUsername.auth_user_id !== user.id) {
        return { success: false, error: "Username is already taken", data: null };
      }
    } else {
      // For anonymous users
      if (existingUsername.device_id !== deviceId) {
        return { success: false, error: "Username is already taken", data: null };
      }
    }
  }
  
  if (!user) {
    // For anonymous users, create or update a record in the database
    localStorage.setItem("anonymousUsername", username);
    
    // Check if user already exists with this device_id
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("device_id", deviceId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      return { success: false, error: fetchError.message, data: null };
    }
    
    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("users")
        .update({ username, updated_at: new Date().toISOString() })
        .eq("device_id", deviceId);
      
      if (updateError) return { success: false, error: updateError.message, data: null };
    } else {
      // Create new anonymous user
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          device_id: deviceId,
          username: username,
          name: username, // Use username as display name for anonymous users
          email: `anonymous-${deviceId}@beanscene.local`, // Placeholder email
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) return { success: false, error: insertError.message, data: null };
    }
    
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
  const deviceId = getDeviceId();
  
  if (!user) {
    // For anonymous users, first check database, then localStorage as fallback
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("username")
      .eq("device_id", deviceId)
      .single();
    
    if (dbUser && dbUser.username) {
      return { success: true, data: dbUser.username };
    }
    
    // Fallback to localStorage if not in database
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

export const getOrCreateAnonymousUser = async (): Promise<ApiResponse<any>> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // For authenticated users, get from database
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();
    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };
  }
  
  // For anonymous users
  const deviceId = getDeviceId();
  const anonymousUsername = localStorage.getItem("anonymousUsername");
  
  // Check if user already exists with this device_id
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("device_id", deviceId)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
    return { success: false, error: fetchError.message, data: null };
  }
  
  if (existingUser) {
    return { success: true, data: existingUser };
  }
  
  // Create new anonymous user if username exists
  if (anonymousUsername) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        device_id: deviceId,
        username: anonymousUsername,
        name: anonymousUsername,
        email: `anonymous-${deviceId}@beanscene.local`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) return { success: false, error: insertError.message, data: null };
    return { success: true, data: newUser };
  }
  
  return { success: true, data: null };
};

/**
 * Client-side migration function to automatically migrate localStorage data to Supabase
 * This runs when users visit the app to ensure their data is properly stored
 */
export const migrateLocalStorageToSupabase = async (): Promise<ApiResponse<{
  migrated: boolean;
  message: string;
}>> => {
  try {
    const deviceId = getDeviceId();
    const anonymousUsername = localStorage.getItem("anonymousUsername");
    const migrationKey = `migration_completed_${deviceId}`;
    
    // Check if migration has already been completed for this device
    const alreadyMigrated = localStorage.getItem(migrationKey);
    if (alreadyMigrated === 'true') {
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: "Migration already completed for this device" 
        } 
      };
    }
    
    // Check if user has a username in localStorage
    if (!anonymousUsername) {
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: "No username found in localStorage to migrate" 
        } 
      };
    }
    
    // Check if user already exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("device_id", deviceId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      return { 
        success: false, 
        error: `Error checking existing user: ${fetchError.message}`, 
        data: null 
      };
    }
    
    if (existingUser) {
      // User already exists in database, mark migration as complete
      localStorage.setItem(migrationKey, 'true');
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: "User already exists in database" 
        } 
      };
    }
    
    // Check if username is already taken by someone else
    const { data: usernameTaken, error: usernameCheckError } = await supabase
      .from("users")
      .select("id, device_id")
      .eq("username", anonymousUsername)
      .single();
    
    if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
      return { 
        success: false, 
        error: `Error checking username availability: ${usernameCheckError.message}`, 
        data: null 
      };
    }
    
    if (usernameTaken && usernameTaken.device_id !== deviceId) {
      // Username is taken by someone else, we can't migrate
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: `Username "${anonymousUsername}" is already taken by another user. Please choose a different username.` 
        } 
      };
    }
    
    // Create user record in database
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        device_id: deviceId,
        username: anonymousUsername,
        name: anonymousUsername,
        email: `migrated-${deviceId}@beanscene.local`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      return { 
        success: false, 
        error: `Failed to create user record: ${insertError.message}`, 
        data: null 
      };
    }
    
    // Mark migration as completed
    localStorage.setItem(migrationKey, 'true');
    
    // Also migrate any posts that might be linked to this device_id
    try {
      const { error: updatePostsError } = await supabase
        .from("posts")
        .update({ user_id: newUser.id })
        .eq("device_id", deviceId)
        .is("user_id", null);
      
      if (updatePostsError) {
        console.warn("Failed to link posts to user:", updatePostsError.message);
      }
    } catch (error) {
      console.warn("Error linking posts to user:", error);
    }
    
    return { 
      success: true, 
      data: { 
        migrated: true, 
        message: `Successfully migrated username "${anonymousUsername}" to database!` 
      } 
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during migration", 
      data: null 
    };
  }
};

/**
 * Migrate anonymous user data to authenticated user when they sign up
 * This should be called after a user successfully authenticates
 */
export const migrateAnonymousToAuthenticated = async (): Promise<ApiResponse<{
  migrated: boolean;
  message: string;
}>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { 
        success: false, 
        error: "No authenticated user found", 
        data: null 
      };
    }
    
    const deviceId = getDeviceId();
    const anonymousUsername = localStorage.getItem("anonymousUsername");
    const migrationKey = `auth_migration_completed_${user.id}`;
    
    // Check if migration has already been completed for this auth user
    const alreadyMigrated = localStorage.getItem(migrationKey);
    if (alreadyMigrated === 'true') {
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: "Migration already completed for this authenticated user" 
        } 
      };
    }
    
    // Check if user already has a record in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      return { 
        success: false, 
        error: `Error checking existing user: ${fetchError.message}`, 
        data: null 
      };
    }
    
    if (existingUser) {
      // User already exists, mark migration as complete
      localStorage.setItem(migrationKey, 'true');
      return { 
        success: true, 
        data: { 
          migrated: false, 
          message: "Authenticated user already exists in database" 
        } 
      };
    }
    
    // Check if there's anonymous data to migrate
    const { data: anonymousUser, error: anonymousFetchError } = await supabase
      .from("users")
      .select("*")
      .eq("device_id", deviceId)
      .is("auth_user_id", null)
      .single();
    
    if (anonymousFetchError && anonymousFetchError.code !== 'PGRST116') {
      return { 
        success: false, 
        error: `Error checking anonymous user: ${anonymousFetchError.message}`, 
        data: null 
      };
    }
    
    let finalUsername = anonymousUsername || user.user_metadata?.name || user.email?.split('@')[0] || 'user';
    
    // If we have anonymous data, merge it
    if (anonymousUser) {
      // Check if the anonymous username is still available
      if (anonymousUser.username) {
        const { data: usernameTaken, error: usernameCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("username", anonymousUser.username)
          .neq("id", anonymousUser.id)
          .single();
        
        if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
          return { 
            success: false, 
            error: `Error checking username availability: ${usernameCheckError.message}`, 
            data: null 
          };
        }
        
        if (!usernameTaken) {
          finalUsername = anonymousUser.username;
        }
      }
      
      // Update the anonymous user to be the authenticated user
      const { error: updateError } = await supabase
        .from("users")
        .update({
          auth_user_id: user.id,
          name: user.user_metadata?.name || anonymousUser.name,
          email: user.email || anonymousUser.email,
          username: finalUsername,
          updated_at: new Date().toISOString()
        })
        .eq("id", anonymousUser.id);
      
      if (updateError) {
        return { 
          success: false, 
          error: `Failed to update user record: ${updateError.message}`, 
          data: null 
        };
      }
      
      // Link any posts from device_id to the user
      const { error: linkPostsError } = await supabase
        .from("posts")
        .update({ user_id: anonymousUser.id })
        .eq("device_id", deviceId)
        .is("user_id", null);
      
      if (linkPostsError) {
        console.warn("Failed to link posts to user:", linkPostsError.message);
      }
      
      localStorage.setItem(migrationKey, 'true');
      
      return { 
        success: true, 
        data: { 
          migrated: true, 
          message: `Successfully migrated anonymous data to authenticated account! Username: ${finalUsername}` 
        } 
      };
    } else {
      // No anonymous data, create new authenticated user
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          auth_user_id: user.id,
          name: user.user_metadata?.name || finalUsername,
          email: user.email || '',
          username: finalUsername,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        return { 
          success: false, 
          error: `Failed to create user record: ${insertError.message}`, 
          data: null 
        };
      }
      
      localStorage.setItem(migrationKey, 'true');
      
      return { 
        success: true, 
        data: { 
          migrated: true, 
          message: `Created new authenticated user account! Username: ${finalUsername}` 
        } 
      };
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error during authentication migration", 
      data: null 
    };
  }
};
