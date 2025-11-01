# 🚨 API Connection Issues - Must Fix Before Production

This document tracks all API connections that are currently not working and need to be fixed.

**Status:** All mock/fallback data has been REMOVED. System will now ERROR properly when APIs are unavailable instead of silently using fake data.

---

## ❌ 1. Google Calendar API - NOT CONNECTED

**Current Status:** Calendar service initialization may be failing  
**Impact:** Cannot fetch real appointment availability or create bookings  
**Location:** `server/calendarApi.ts`

**Error Messages to Watch For:**
- `❌ CALENDAR API NOT CONNECTED - Google Calendar service not initialized`
- `❌ CALENDAR API ERROR - Failed to fetch availability`

**What Was Removed:**
- ✅ Removed `generateMockTimeSlots()` - no longer returns fake appointment times
- ✅ Calendar API errors now return HTTP 503 instead of mock data

**To Fix:**
1. Verify `GOOGLE_API_CREDENTIALS` environment variable is set correctly
2. Ensure service account has Calendar API enabled in Google Cloud Console
3. Verify calendar ID: `cleanmachinetulsa@gmail.com` exists and is accessible
4. Test calendar access: Check server logs for "Calendar access test successful" message

**Required Environment Variables:**
- `GOOGLE_API_CREDENTIALS` (JSON string of service account credentials)
- Correct calendar ID configured in the code

---

## ❌ 2. Google Sheets API - CONNECTION UNCERTAIN

**Current Status:** May not be connected, "Services" and "Add-Ons" tabs may be unavailable  
**Impact:** Cannot load service pricing, add-on services, customer database  
**Location:** `server/realServices.ts`, `server/knowledge.ts`

**Error Messages to Watch For:**
- `❌ GOOGLE SHEETS NOT CONNECTED - No services found in sheets data`
- `❌ GOOGLE SHEETS NOT CONNECTED - No add-ons found in sheets data`
- `SHEETS_NOT_CONNECTED: Services data unavailable`
- `SHEETS_PARSE_ERROR: Unable to parse services data`

**What Was Removed:**
- ✅ Removed `fallbackServices` array - no longer returns hardcoded pricing ($250-350, etc.)
- ✅ Removed `fallbackAddOns` array - no longer returns hardcoded add-on prices
- ✅ System now THROWS ERROR instead of silently using old pricing

**To Fix:**
1. Verify Google Sheets API connection in `server/knowledge.ts`
2. Confirm spreadsheet ID: `1-xeX82TPoxxeyWXoCEXh-TdMkBHuJSXjoUSaiFjfv9g`
3. Ensure these tabs exist in the sheet:
   - **"Services"** tab with columns: Service Name, Price, Service Description, Duration
   - **"Add-Ons"** tab with columns: Add-On Service, Price, Description
   - **"Customer Database"** tab with columns: Name, Phone, Email, Vehicle 1, Last Service, etc.
4. Verify service account has read access to the spreadsheet

**Required Sheet Structure:**
```
Services Tab:
- Service Name (e.g., "Full Detail")
- Price (e.g., "$225-300")
- Service Description
- Duration (e.g., "4-5 hours")

Add-Ons Tab:
- Add-On Service (e.g., "Leather Protector")
- Price (e.g., "$50")
- Description

Customer Database Tab:
- Name, Phone Number, Email, Vehicle 1, Vehicle 2, Last Service, Last Service Date
```

---

## ❌ 3. Google Reviews API - FAILING (404 Error)

**Current Status:** Request failed with status code 404  
**Impact:** Reviews section on website shows empty  
**Location:** Server logs show "Error fetching Google reviews: Request failed with status code 404"

**Error Messages to Watch For:**
- `Error fetching Google reviews: Request failed with status code 404`
- Returns empty reviews array instead of real reviews

**To Fix:**
1. Verify Google Places API is enabled in Google Cloud Console
2. Check if correct Place ID is being used
3. Confirm API key has proper permissions for Places API
4. Alternative: Fetch reviews from Google Business Profile API instead

**Options:**
- Set up Google Places API properly
- OR switch to Google Business Profile API (My Business API)
- OR fetch reviews via third-party service

---

## ❌ 4. Google Maps API - STATUS UNKNOWN

**Current Status:** May be working, needs verification  
**Impact:** Cannot validate customer addresses or calculate drive times  
**Location:** `server/schedulingTools.ts` (`validateAddress` function)

**Error Messages to Watch For:**
- `❌ MAPS API ERROR - Address validation failed`
- `TODO: Verify Google Maps API credentials are configured`

**To Fix:**
1. Verify Google Maps Geocoding API is enabled
2. Verify Google Maps Distance Matrix API is enabled
3. Confirm API key has proper permissions
4. Test address validation: "123 S Main St, Tulsa, OK 74103"

**Business Rules:**
- Service area: 26-minute drive time radius from base location (Tulsa)
- Outside service area: Can proceed with extended service fee

---

## ⚠️ 5. Stripe Payment Processing - TESTING KEYS MISSING

**Current Status:** Testing keys not configured  
**Impact:** Cannot test payment flows in development  
**Location:** Noted in missing secrets

**Missing Environment Variables:**
- `TESTING_STRIPE_SECRET_KEY`
- `TESTING_VITE_STRIPE_PUBLIC_KEY`

**To Fix:**
1. Get testing keys from Stripe Dashboard
2. Add to Replit Secrets
3. Verify integration works with test card numbers

---

## 📋 How Errors Now Work (After Fixes)

### Before (BAD):
- Calendar API fails → Returns fake appointment times → Customer books invalid slot ❌
- Sheets fails → Shows outdated hardcoded pricing ($250-350) ❌
- Silently fails → User never knows something is wrong ❌

### After (GOOD):
- Calendar API fails → Returns HTTP 503 error → Clear error message to user ✅
- Sheets fails → Throws SHEETS_NOT_CONNECTED error → Website shows error ✅
- Loud failures → Developer immediately knows what to fix ✅

---

## 🔧 Quick Diagnostic Commands

**Check if Calendar API is working:**
```bash
# Look for this in logs:
grep "Calendar access test successful" /tmp/logs/*.log
```

**Check if Sheets API is loading data:**
```bash
# Look for this in logs:
grep "Successfully loaded.*services from Google Sheet" /tmp/logs/*.log
grep "Found.*add-ons in sheets data" /tmp/logs/*.log
```

**Check for API errors:**
```bash
# Look for these error markers:
grep "❌" /tmp/logs/*.log
grep "TODO:" /tmp/logs/*.log
```

---

## 📝 Testing Checklist (Once APIs Fixed)

- [ ] Calendar API: Can fetch real appointment availability
- [ ] Calendar API: Can create appointments successfully
- [ ] Sheets API: Loads current service pricing (not hardcoded)
- [ ] Sheets API: Loads current add-on pricing (not hardcoded)
- [ ] Sheets API: Can lookup existing customers
- [ ] Maps API: Can validate addresses
- [ ] Maps API: Can calculate drive times
- [ ] Reviews API: Fetches real Google reviews
- [ ] Stripe: Test payments work in development

---

## 🎯 Priority Order

1. **CRITICAL**: Google Sheets API (Services + Add-Ons tabs) - Needed for pricing
2. **CRITICAL**: Google Calendar API - Needed for appointments
3. **HIGH**: Google Maps API - Needed for address validation
4. **MEDIUM**: Google Reviews API - Needed for social proof
5. **MEDIUM**: Stripe Testing Keys - Needed for payment testing

---

**Last Updated:** October 18, 2025  
**All mock/fallback data removed:** ✅ Complete
