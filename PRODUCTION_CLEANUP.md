# Production Cleanup Checklist

This document tracks hardcoded values and configuration items that need to be replaced with user-configurable settings before full production deployment.

## Settings Page - Notifications Tab
**File:** `client/src/pages/settings.tsx`

### Hardcoded Values to Make Configurable:

1. **Business Phone Number**
   - Current: Hardcoded as `+1 (918) 555-0123`
   - Location: Line ~154 in settings.tsx
   - Action: Replace with database-backed setting that loads from backend
   - Backend: Create `systemSettings` table with key-value pairs

2. **Timeout Duration**
   - Current: Hardcoded as `12` hours
   - Location: Line ~158 in settings.tsx  
   - Action: Make configurable slider (1-48 hours)
   - Backend: Store in `systemSettings` table, update timeout monitoring service

3. **AI Model Selection**
   - Current: Hardcoded as `gpt-4o`
   - Location: Line ~162 in settings.tsx
   - Action: Create dropdown with available models (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
   - Backend: Pass model selection to OpenAI API calls

4. **Demo Mode**
   - Current: Hardcoded as enabled
   - Location: Line ~166 in settings.tsx
   - Action: Create toggle switch for demo mode
   - Backend: Control demo restrictions via environment variable

## Settings Page - Templates Tab
**File:** `client/src/pages/settings.tsx`

5. **Template Categories**
   - Current: Hardcoded example categories ("Greetings", "Scheduling", "Pricing")
   - Location: Lines ~79-93 in settings.tsx
   - Action: Categories are already database-backed, just need to populate with real data
   - Backend: Already implemented via quick_reply_categories table

## PWA Configuration
**File:** `public/manifest.json`

6. **App Icons**
   - Current: Using placeholder `/icon-192.png` and `/icon-512.png`
   - Location: manifest.json lines 11-20
   - Action: Create proper app icons for Clean Machine branding
   - Required sizes:
     - 192x192 PNG (for home screen)
     - 512x512 PNG (for splash screen)
   - Design: Should include Clean Machine logo and brand colors

7. **Theme Color**
   - Current: Using `#0f172a` (dark blue)
   - Location: manifest.json line 7
   - Action: Match to actual Clean Machine brand color
   - Update: Both `theme_color` and `background_color`

## Environment Variables
**File:** `.env` (not tracked in git)

8. **Production API Keys**
   - Ensure all API keys are production-ready:
     - `OPENAI_API_KEY` - Production OpenAI key
     - `STRIPE_SECRET_KEY` - Production Stripe key  
     - `TWILIO_ACCOUNT_SID` - Production Twilio account
     - `TWILIO_AUTH_TOKEN` - Production Twilio auth
     - `TWILIO_PHONE_NUMBER` - Production Twilio number
     - `SENDGRID_API_KEY` - Production SendGrid key
     - `GOOGLE_API_CREDENTIALS` - Production service account

## Twilio Configuration
**Manual Setup Required**

9. **Fallback Webhook Configuration**
   - Location: Twilio Console → Phone Numbers → (Your Number) → Messaging Configuration
   - Action: Set fallback URL to `/sms-fallback` endpoint
   - Timeout: 5 seconds
   - See: Task 22 in task list for detailed instructions

## Future Enhancements (Post-MVP)

10. **Push Notifications**
    - Status: Deferred to post-MVP
    - See: Task 18 in task list
    - Requires: Firebase Cloud Messaging or similar service
    - Impact: Real-time alerts for handoffs and new messages

## Testing Checklist Before Production

- [ ] Replace all hardcoded phone numbers with actual business number
- [ ] Create and upload proper app icons (192x192, 512x512)
- [ ] Test PWA installation on iOS and Android
- [ ] Configure Twilio fallback webhooks
- [ ] Verify all environment variables are production keys
- [ ] Test SMS fallback system with app intentionally down
- [ ] Test timeout auto-return after 12 hours
- [ ] Validate handoff detection accuracy with real conversations
- [ ] Test booking panel CRUD operations
- [ ] Verify quick reply templates work correctly
- [ ] Test settings page persistence (notifications + templates)

## Notes

- **Demo Mode**: Currently enabled by default to prevent accidental charges during development
- **AI Model**: Using GPT-4o for production quality, can downgrade to GPT-4o-mini for cost savings
- **Timeout Duration**: 12 hours is a reasonable default but should be configurable per business needs
