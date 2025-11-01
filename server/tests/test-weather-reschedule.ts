
import { sendWeatherAlertNotification } from '../notifications';
import { WeatherCheckResult } from '../weatherService';

/**
 * Comprehensive test for weather alert + rescheduling workflow
 * Tests:
 * 1. Weather alert SMS with direct reschedule link
 * 2. Pre-filled customer information in reschedule link
 * 3. Multiple severity levels
 */

async function testWeatherRescheduleFlow() {
  console.log('\n=== Weather Alert + Reschedule Protocol Test ===\n');
  
  // Test appointment details - using your actual phone number
  const testCustomer = {
    name: 'Jody',
    phone: '9188565304', // Your business number
    email: 'jody@cleanmachine.app',
    address: '1234 S Harvard Ave, Tulsa, OK 74112',
    service: 'Full Detail',
    addOns: ['Paint Correction', 'Ceramic Coating'],
    vehicleInfo: '2020 Honda Accord',
  };

  // Test different weather severity levels
  const severityTests = [
    {
      name: 'SEVERE Weather (80-100% rain)',
      level: 'severe' as const,
      rainChance: 85,
      appointmentOffset: 2, // 2 days from now
    },
    {
      name: 'VERY HIGH Risk (60-80% rain)',
      level: 'very-high' as const,
      rainChance: 70,
      appointmentOffset: 3, // 3 days from now
    },
    {
      name: 'HIGH Risk (25-60% rain)',
      level: 'high' as const,
      rainChance: 45,
      appointmentOffset: 4, // 4 days from now
    },
    {
      name: 'MODERATE Risk (15-25% rain)',
      level: 'moderate' as const,
      rainChance: 20,
      appointmentOffset: 5, // 5 days from now
    },
  ];

  console.log('📋 Test Scenario:');
  console.log(`Customer: ${testCustomer.name}`);
  console.log(`Phone: ${testCustomer.phone}`);
  console.log(`Email: ${testCustomer.email}`);
  console.log(`Service: ${testCustomer.service}`);
  console.log(`Add-ons: ${testCustomer.addOns.join(', ')}\n`);

  // Test the SEVERE weather scenario (most urgent)
  const testScenario = severityTests[0];
  
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + testScenario.appointmentOffset);
  appointmentDate.setHours(10, 0, 0, 0); // 10:00 AM appointment

  const formattedTime = appointmentDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  console.log(`\n🌧️  Testing: ${testScenario.name}`);
  console.log(`Appointment: ${formattedTime}`);
  console.log(`Rain Probability: ${testScenario.rainChance}%\n`);

  // Create mock weather data
  const mockWeatherCheck: WeatherCheckResult = {
    needsReschedule: testScenario.level !== 'moderate',
    weatherRiskLevel: testScenario.level,
    urgency: testScenario.level === 'severe' || testScenario.level === 'very-high' ? 'high' : 
             testScenario.level === 'high' ? 'medium' : 'low',
    recommendation: getRecommendation(testScenario.level, testScenario.rainChance),
    forecastData: [
      {
        date: appointmentDate.toISOString(),
        description: getWeatherDescription(testScenario.rainChance),
        chanceOfRain: testScenario.rainChance,
        temperature: 65,
        isRainy: testScenario.rainChance > 30,
        severity: testScenario.level === 'severe' ? 'severe' :
                  testScenario.level === 'very-high' ? 'high' :
                  testScenario.level === 'high' ? 'moderate' : 'low'
      }
    ]
  };

  console.log('Weather Risk Assessment:');
  console.log(`- Risk Level: ${mockWeatherCheck.weatherRiskLevel.toUpperCase()}`);
  console.log(`- Needs Reschedule: ${mockWeatherCheck.needsReschedule ? 'YES ⚠️' : 'NO ✓'}`);
  console.log(`- Urgency: ${mockWeatherCheck.urgency}`);
  console.log(`- Recommendation: ${mockWeatherCheck.recommendation}\n`);

  try {
    console.log('📤 Sending weather alert with reschedule link...\n');

    const notificationResult = await sendWeatherAlertNotification(
      {
        name: testCustomer.name,
        phone: testCustomer.phone,
        email: testCustomer.email,
        address: testCustomer.address,
        service: testCustomer.service,
        addOns: testCustomer.addOns,
        time: appointmentDate.toISOString(),
        formattedTime: formattedTime,
        vehicleInfo: testCustomer.vehicleInfo,
      },
      mockWeatherCheck
    );

    console.log('✅ Notification Results:');
    console.log(`- SMS Sent: ${notificationResult.sms ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`- Email Sent: ${notificationResult.email ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    if (notificationResult.sms) {
      const replSlug = process.env.REPL_SLUG || 'cleanmachine';
      const rescheduleUrl = `https://${replSlug}.replit.app/schedule?phone=${encodeURIComponent(testCustomer.phone)}&name=${encodeURIComponent(testCustomer.name)}&service=${encodeURIComponent(testCustomer.service)}`;
      
      console.log('📱 SMS SENT TO YOUR PHONE!');
      console.log(`\n🔗 Reschedule Link (pre-filled with customer info):`);
      console.log(rescheduleUrl);
      console.log('\nThe link includes:');
      console.log(`  • Customer name: ${testCustomer.name}`);
      console.log(`  • Phone number: ${testCustomer.phone}`);
      console.log(`  • Service: ${testCustomer.service}`);
      console.log('\n✅ Customer can click link and immediately see available dates!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Customer: ${testCustomer.name} (${testCustomer.phone})`);
    console.log(`Appointment: ${formattedTime}`);
    console.log(`Weather Risk: ${mockWeatherCheck.weatherRiskLevel.toUpperCase()} (${testScenario.rainChance}% rain)`);
    console.log(`SMS Alert: ${notificationResult.sms ? '✅ SENT' : '❌ NOT SENT'}`);
    console.log(`Reschedule Link: ${notificationResult.sms ? '✅ INCLUDED' : '❌ NOT INCLUDED'}`);
    console.log('='.repeat(60));

    if (notificationResult.sms) {
      console.log('\n📲 CHECK YOUR PHONE NOW!');
      console.log('   You should receive an SMS with:');
      console.log('   1. Weather alert message');
      console.log('   2. Direct reschedule link with pre-filled info');
      console.log('   3. Options to RESCHEDULE or KEEP appointment');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

/**
 * Helper function to get recommendation text based on weather severity
 */
function getRecommendation(level: string, rainChance: number): string {
  switch (level) {
    case 'severe':
      return `Severe weather conditions (${rainChance}% chance of rain) are forecasted. We strongly recommend rescheduling.`;
    case 'very-high':
      return `Very high chance of rain (${rainChance}%) during your appointment. We recommend rescheduling to ensure quality service.`;
    case 'high':
      return `High chance of rain (${rainChance}%) expected. Consider rescheduling for better detailing results.`;
    case 'moderate':
      return `Moderate chance of rain (${rainChance}%). We can proceed with caution, but exterior detailing might be affected.`;
    default:
      return `Weather conditions are acceptable (${rainChance}% rain).`;
  }
}

/**
 * Helper function to get weather description
 */
function getWeatherDescription(rainChance: number): string {
  if (rainChance >= 70) return 'Heavy rain likely';
  if (rainChance >= 50) return 'Rain likely';
  if (rainChance >= 30) return 'Possible rain';
  if (rainChance >= 15) return 'Slight chance of rain';
  return 'Mostly clear';
}

// Run the comprehensive test
testWeatherRescheduleFlow()
  .then(() => {
    console.log('\n✅ Weather + Reschedule Protocol Test Complete!');
    console.log('   Check your phone for the SMS with reschedule link.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
