# Push Notifications Setup Guide

## ✅ Implementation Complete!

Push notifications are now implemented with **OPT-IN ONLY** - users must explicitly enable them. No harassment!

## 🔧 Setup Steps

### 1. Generate VAPID Keys

Install web-push globally (if not already installed):
```bash
npm install -g web-push
```

Generate VAPID keys:
```bash
web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI...
Private Key: 8BWl62iUYgUivxIkv69yViEuiBIa40HI...
```

### 2. Add Environment Variables

Add to `.env.local`:
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

Add to Supabase Dashboard → Settings → Edge Functions → Secrets:
- `VAPID_PUBLIC_KEY` = your public key
- `VAPID_PRIVATE_KEY` = your private key
- `VAPID_SUBJECT` = `mailto:your-email@example.com` (your email)

### 3. Run Database Migration

Run the push subscriptions migration in Supabase Dashboard:
```sql
-- File: supabase/migrations/20250130000003_add_push_subscriptions_table.sql
```

### 4. Deploy Supabase Edge Function

Deploy the push notification function:
```bash
supabase functions deploy send-push-notification
```

Or manually upload `supabase/functions/send-push-notification/index.ts` via Supabase Dashboard.

### 5. Install Deno Web Push Module

The Edge Function uses `webpush` from Deno. Make sure it's available or update the import in the function.

## 🎯 How It Works

### User Experience (OPT-IN ONLY)
1. User goes to Profile → Settings
2. Sees "Push Notifications" toggle (OFF by default)
3. User clicks toggle to enable
4. Browser shows permission prompt
5. If granted, notifications are enabled
6. User can disable anytime

### What Triggers Push Notifications
- ✅ New follower (when someone follows you)
- ✅ Badge earned (when you unlock a badge)
- ✅ Level up (when you level up)

### Privacy & Respect
- **No automatic prompts** - users must opt-in
- **Easy to disable** - toggle in settings
- **Respects browser permissions** - won't work if denied
- **No spam** - only important updates

## 📱 Browser Support

- ✅ **Chrome/Edge (Desktop & Android)**: Full support
- ✅ **Firefox (Desktop)**: Full support
- ⚠️ **Safari (iOS)**: Limited - must be installed as PWA
- ⚠️ **Safari (macOS)**: Full support
- ❌ **Opera**: May have limitations

## 🧪 Testing

1. Enable push notifications in Profile → Settings
2. Grant browser permission
3. Have someone follow you (or earn a badge)
4. You should receive a push notification even if the app is closed!

## 🔒 Security Notes

- VAPID keys are used for authentication
- Private key stays on server (Supabase Edge Function)
- Public key is safe to expose in frontend
- Subscriptions are stored securely in database

## 🐛 Troubleshooting

**"Push notifications are not supported"**
- Make sure you're on HTTPS (required for push)
- Check browser compatibility

**"VAPID keys are not configured"**
- Add `VITE_VAPID_PUBLIC_KEY` to `.env.local`
- Restart dev server

**"Permission denied"**
- User must enable in browser settings
- Clear browser cache and try again

**Push notifications not sending**
- Check Supabase Edge Function logs
- Verify VAPID keys are set in Supabase secrets
- Check that subscription is saved in database

## 📝 Next Steps

1. Generate VAPID keys
2. Add to environment variables
3. Run migration
4. Deploy Edge Function
5. Test with a real device!
