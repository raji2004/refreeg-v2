# ConvertKit Integration - Quick Start Checklist

## ✅ Implementation Complete

The ConvertKit integration has been successfully implemented. Follow these steps to activate it:

## Setup Steps

### 1. Get ConvertKit Credentials

- [ ] Log in to [ConvertKit](https://app.convertkit.com)
- [ ] Go to Settings → Advanced → API
- [ ] Copy your API Key
- [ ] Copy your API Secret
- [ ] Note your Form ID (from Forms section)

### 2. Configure Environment Variables

- [ ] Create or open `.env.local` file in project root
- [ ] Add the following variables:
  ```env
  CONVERTKIT_API_KEY=your_api_key_here
  CONVERTKIT_API_SECRET=your_api_secret_here
  CONVERTKIT_FORM_ID=your_form_id_here
  ```
- [ ] Save the file
- [ ] Restart your development server

### 3. Test the Integration

- [ ] Run `npm run dev`
- [ ] Go to signup page
- [ ] Create a test account with a real email you can check
- [ ] Complete the signup process
- [ ] Check ConvertKit dashboard → Subscribers
- [ ] Verify the new subscriber appears with correct data

### 4. Production Deployment

- [ ] Add the same environment variables to your production environment
  - Vercel: Project Settings → Environment Variables
  - Other platforms: Follow their env var configuration docs
- [ ] Deploy your changes
- [ ] Test with a production signup

## What Was Implemented

### New Files Created

1. **`services/convertkit.ts`** - ConvertKit API service

   - `subscribeToConvertKit()` - Main subscription function
   - `addTagsToSubscriber()` - Add tags to existing subscribers
   - `updateSubscriberFields()` - Update custom fields

2. **`.env.example`** - Environment variables template

3. **`CONVERTKIT_SETUP.md`** - Comprehensive documentation

### Modified Files

1. **`hooks/use-auth.ts`** - Added ConvertKit subscription to signup flow
   - Imports ConvertKit service
   - Calls subscription after successful account creation
   - Sends user email, first name, account type, and signup date

## How It Works

When a user signs up:

1. ✅ Supabase account created
2. ✅ Profile created in database
3. ✅ Welcome email sent
4. ✅ **User automatically subscribed to ConvertKit**
5. ✅ User redirected to onboarding

## Data Sent to ConvertKit

For each new user:

- Email address
- First name (extracted from full name)
- Custom field: `account_type` (individual/organization)
- Custom field: `signup_date` (ISO timestamp)

## Error Handling

✅ **Safe Implementation**: ConvertKit subscription errors will NOT prevent signup

- Errors are logged to console
- User account is still created
- User can proceed normally

## Optional: Set Up Custom Fields in ConvertKit

To get the most from this data:

1. Go to ConvertKit → Settings → Custom Fields
2. Add these fields:
   - `account_type` (text)
   - `signup_date` (date or text)
3. You can now use these for segmentation and automation

## Next Steps (Optional)

Consider adding ConvertKit subscriptions for:

- KYC verification completion (add tag)
- First donation (add tag + update field)
- Cause creation (add tag)
- Email preferences updates

See `CONVERTKIT_SETUP.md` for advanced usage examples.

## Troubleshooting

**Users not appearing in ConvertKit?**

- Check `.env.local` has correct values
- Verify API credentials in ConvertKit
- Check console logs for errors
- Ensure form is published in ConvertKit

**Need help?**

- Review `CONVERTKIT_SETUP.md` for detailed documentation
- Check ConvertKit API docs: https://developers.convertkit.com/

---

**✨ Integration Status: Ready to Use**

Once you add your ConvertKit credentials, all new signups will automatically be added to your email list!
