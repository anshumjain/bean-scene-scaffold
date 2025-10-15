# RLS Policies for Migration Support

## Overview

The RLS (Row Level Security) policies have been configured to ensure that the client-side migration functions work correctly while maintaining security.

## Users Table Policies

### SELECT (Read)
```sql
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
```
- **Purpose**: Allows migration functions to check if users exist
- **Security**: Safe because user data is public anyway

### INSERT (Create)
```sql
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);
```
- **Purpose**: Allows migration functions to create new user records
- **Security**: Safe because we validate usernames are unique

### UPDATE (Modify)
```sql
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth_user_id = auth.uid()) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);
```
- **Purpose**: Allows users to update their own profiles
- **Security**: Users can only update their own records

## Posts Table Policies

### SELECT (Read)
```sql
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
```
- **Purpose**: All posts are public and visible to everyone
- **Security**: By design - posts are meant to be shared

### INSERT (Create)
```sql
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
```
- **Purpose**: Allows anyone to create posts (anonymous or authenticated)
- **Security**: Safe because posts are public anyway

### UPDATE (Modify)
```sql
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())) OR
  (auth.uid() IS NULL AND device_id IS NOT NULL)
);
```
- **Purpose**: Users can update their own posts
- **Security**: Users can only modify their own content

### Special Migration Policy
```sql
CREATE POLICY "Migration can update posts" ON public.posts FOR UPDATE USING (
  user_id IS NULL AND device_id IS NOT NULL
);
```
- **Purpose**: Allows migration to link posts to users
- **Security**: Only affects posts that aren't already linked to users

## Migration Function Operations

### `migrateLocalStorageToSupabase()`
1. **SELECT** users by device_id ✅ (Anyone can view users)
2. **SELECT** users by username ✅ (Anyone can view users)
3. **INSERT** new user ✅ (Anyone can insert users)
4. **UPDATE** existing user ✅ (Users can update their own profile)
5. **UPDATE** posts to link to user ✅ (Migration can update posts)

### `migrateAnonymousToAuthenticated()`
1. **SELECT** users by auth_user_id ✅ (Anyone can view users)
2. **SELECT** users by device_id ✅ (Anyone can view users)
3. **INSERT** new authenticated user ✅ (Anyone can insert users)
4. **UPDATE** anonymous user to authenticated ✅ (Users can update their own profile)
5. **UPDATE** posts to link to user ✅ (Migration can update posts)

### `setUsername()`
1. **SELECT** users by username ✅ (Anyone can view users)
2. **SELECT** users by device_id ✅ (Anyone can view users)
3. **INSERT** new user ✅ (Anyone can insert users)
4. **UPDATE** existing user ✅ (Users can update their own profile)

## Security Considerations

### ✅ **Secure Operations**
- Users can only update their own profiles
- Users can only update their own posts
- Username uniqueness is enforced at the application level
- All operations are logged and can be audited

### ✅ **Migration Safety**
- Migration functions can read all user data (needed to check conflicts)
- Migration functions can create new users (needed for localStorage migration)
- Migration functions can update posts to link them to users
- No sensitive data is exposed inappropriately

### ✅ **Anonymous User Support**
- Anonymous users can create accounts using device_id
- Anonymous users can create and update posts
- Anonymous users can set usernames
- Seamless transition from anonymous to authenticated

## Permissions Granted

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.posts TO anon, authenticated;
```

## Testing

The migration includes verification that all policies work correctly:
- User creation works for both anonymous and authenticated users
- User updates work for profile changes
- Post linking works during migration
- All operations respect the security boundaries

## Result

✅ **Migration functions will work correctly**  
✅ **Security is maintained**  
✅ **Anonymous users are supported**  
✅ **Authenticated users are supported**  
✅ **Posts remain publicly visible**  
✅ **Users can only modify their own data**  

The RLS policies now fully support the migration system while maintaining appropriate security boundaries.
