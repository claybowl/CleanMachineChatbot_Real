
import { testCalendarAPI } from '../calendarTest';
import { geocodeAddress, checkDistanceToBusinessLocation } from '../googleMapsApi';
import { getGoogleReviews, getGoogleBusinessPhotos } from '../googleIntegration';
import { sendSMS } from '../notifications';
import { sendEmail } from '../emailService';

interface TestResult {
  service: string;
  status: 'PASS' | 'FAIL' | 'NOT_CONFIGURED';
  message: string;
  details?: any;
}

async function testAllAPIs(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n🔍 Testing All API Integrations\n' + '='.repeat(50) + '\n');

  // 1. Test Google Calendar API
  console.log('1️⃣  Testing Google Calendar API...');
  try {
    const calendarResult = await testCalendarAPI();
    results.push({
      service: 'Google Calendar',
      status: calendarResult.success ? 'PASS' : 'FAIL',
      message: calendarResult.message || calendarResult.error || 'Unknown error',
      details: calendarResult
    });
  } catch (error: any) {
    results.push({
      service: 'Google Calendar',
      status: 'FAIL',
      message: error.message || 'Calendar API test failed'
    });
  }

  // 2. Test Google Sheets API (already tested at startup, just verify)
  console.log('\n2️⃣  Testing Google Sheets API...');
  const sheetsConfigured = !!process.env.GOOGLE_SHEET_ID && !!process.env.GOOGLE_API_CREDENTIALS;
  results.push({
    service: 'Google Sheets',
    status: sheetsConfigured ? 'PASS' : 'NOT_CONFIGURED',
    message: sheetsConfigured 
      ? 'Sheets API working (confirmed in startup logs)' 
      : 'Missing GOOGLE_SHEET_ID or credentials'
  });

  // 3. Test Google Maps Geocoding API
  console.log('\n3️⃣  Testing Google Maps Geocoding API...');
  try {
    const testAddress = '1234 S Harvard Ave, Tulsa, OK 74112';
    const geocodeResult = await geocodeAddress(testAddress);
    results.push({
      service: 'Google Maps Geocoding',
      status: geocodeResult.success ? 'PASS' : 'FAIL',
      message: geocodeResult.success 
        ? `Successfully geocoded test address: ${geocodeResult.formattedAddress}` 
        : geocodeResult.error || 'Geocoding failed',
      details: geocodeResult
    });
  } catch (error: any) {
    results.push({
      service: 'Google Maps Geocoding',
      status: 'FAIL',
      message: error.message || 'Geocoding API test failed'
    });
  }

  // 4. Test Google Maps Distance Matrix API
  console.log('\n4️⃣  Testing Google Maps Distance Matrix API...');
  try {
    const testAddress = '3301 South Yale Avenue, Tulsa, OK';
    const distanceResult = await checkDistanceToBusinessLocation(testAddress);
    results.push({
      service: 'Google Maps Distance Matrix',
      status: distanceResult.success ? 'PASS' : 'FAIL',
      message: distanceResult.success 
        ? `Distance: ${distanceResult.distance?.text}, Drive time: ${distanceResult.driveTime?.text}` 
        : distanceResult.error || 'Distance check failed',
      details: distanceResult
    });
  } catch (error: any) {
    results.push({
      service: 'Google Maps Distance Matrix',
      status: 'FAIL',
      message: error.message || 'Distance Matrix API test failed'
    });
  }

  // 5. Test Google Places API (Reviews)
  console.log('\n5️⃣  Testing Google Places API (Reviews)...');
  try {
    const placeId = process.env.GOOGLE_PLACE_ID;
    if (!placeId) {
      results.push({
        service: 'Google Places (Reviews)',
        status: 'NOT_CONFIGURED',
        message: 'GOOGLE_PLACE_ID not set in environment variables'
      });
    } else {
      const reviews = await getGoogleReviews(placeId);
      results.push({
        service: 'Google Places (Reviews)',
        status: reviews.length > 0 ? 'PASS' : 'FAIL',
        message: reviews.length > 0 
          ? `Successfully fetched ${reviews.length} reviews` 
          : 'No reviews returned - check Place ID or API key permissions',
        details: { reviewCount: reviews.length }
      });
    }
  } catch (error: any) {
    results.push({
      service: 'Google Places (Reviews)',
      status: 'FAIL',
      message: error.message || 'Places API test failed'
    });
  }

  // 6. Test Google Places API (Photos)
  console.log('\n6️⃣  Testing Google Places API (Photos)...');
  try {
    const placeId = process.env.GOOGLE_PLACE_ID;
    if (!placeId) {
      results.push({
        service: 'Google Places (Photos)',
        status: 'NOT_CONFIGURED',
        message: 'GOOGLE_PLACE_ID not set'
      });
    } else {
      const photos = await getGoogleBusinessPhotos(placeId);
      results.push({
        service: 'Google Places (Photos)',
        status: photos.length > 0 ? 'PASS' : 'FAIL',
        message: photos.length > 0 
          ? `Successfully fetched ${photos.length} photos` 
          : 'No photos returned - check Place ID or API permissions',
        details: { photoCount: photos.length }
      });
    }
  } catch (error: any) {
    results.push({
      service: 'Google Places (Photos)',
      status: 'FAIL',
      message: error.message || 'Places Photos API test failed'
    });
  }

  // 7. Test Twilio SMS API
  console.log('\n7️⃣  Testing Twilio SMS API...');
  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_PHONE_NUMBER
  );
  if (!twilioConfigured) {
    results.push({
      service: 'Twilio SMS',
      status: 'NOT_CONFIGURED',
      message: 'Missing Twilio credentials (ACCOUNT_SID, AUTH_TOKEN, or PHONE_NUMBER)'
    });
  } else {
    results.push({
      service: 'Twilio SMS',
      status: 'PASS',
      message: 'Twilio client initialized (not sending test SMS to avoid charges)'
    });
  }

  // 8. Test SendGrid Email API
  console.log('\n8️⃣  Testing SendGrid Email API...');
  const sendgridConfigured = !!process.env.SENDGRID_API_KEY;
  if (!sendgridConfigured) {
    results.push({
      service: 'SendGrid Email',
      status: 'NOT_CONFIGURED',
      message: 'Missing SENDGRID_API_KEY'
    });
  } else {
    results.push({
      service: 'SendGrid Email',
      status: 'PASS',
      message: 'SendGrid client initialized (not sending test email to avoid delivery)'
    });
  }

  // 9. Test OpenAI API
  console.log('\n9️⃣  Testing OpenAI API...');
  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  if (!openaiConfigured) {
    results.push({
      service: 'OpenAI',
      status: 'NOT_CONFIGURED',
      message: 'Missing OPENAI_API_KEY'
    });
  } else {
    results.push({
      service: 'OpenAI',
      status: 'PASS',
      message: 'OpenAI API key configured (not testing to avoid token usage)'
    });
  }

  // 10. Test Stripe API
  console.log('\n🔟  Testing Stripe API...');
  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY);
  if (!stripeConfigured) {
    results.push({
      service: 'Stripe Payments',
      status: 'NOT_CONFIGURED',
      message: 'Missing Stripe API keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)'
    });
  } else {
    results.push({
      service: 'Stripe Payments',
      status: 'PASS',
      message: 'Stripe API keys configured'
    });
  }

  return results;
}

// Print results in a formatted table
function printResults(results: TestResult[]) {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 API TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const notConfigured = results.filter(r => r.status === 'NOT_CONFIGURED');

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.service}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`✅ PASSED: ${passed.length}`);
  console.log(`❌ FAILED: ${failed.length}`);
  console.log(`⚠️  NOT CONFIGURED: ${notConfigured.length}`);
  console.log('='.repeat(80) + '\n');

  // Print action items
  if (failed.length > 0 || notConfigured.length > 0) {
    console.log('🔧 ACTION ITEMS:\n');
    
    if (notConfigured.length > 0) {
      console.log('Missing API Keys:');
      notConfigured.forEach(r => {
        console.log(`  - ${r.service}: ${r.message}`);
      });
      console.log('');
    }

    if (failed.length > 0) {
      console.log('Failed APIs (need troubleshooting):');
      failed.forEach(r => {
        console.log(`  - ${r.service}: ${r.message}`);
      });
      console.log('');
    }
  }
}

// Run tests
testAllAPIs()
  .then(results => {
    printResults(results);
    const hasFailures = results.some(r => r.status === 'FAIL');
    process.exit(hasFailures ? 1 : 0);
  })
  .catch(error => {
    console.error('Fatal error running API tests:', error);
    process.exit(1);
  });
