
import { sendWeatherAlertNotification } from '../notifications';
import { WeatherCheckResult } from '../weatherService';

/**
 * Unit test for weather alert system
 * Tests scenario: Monday morning appointment with SIMULATED bad weather requiring SMS alert
 * This test forces bad weather conditions to test SMS functionality
 */

async function testWeatherAlert() {
  console.log('\n=== Weather Alert System Unit Test (FORCED BAD WEATHER) ===\n');
  
  // Simulate a Monday morning appointment
  const nextMonday = getNextMonday();
  const appointmentTime = new Date(nextMonday);
  appointmentTime.setHours(9, 0, 0, 0); // 9:00 AM appointment
  
  console.log(`Testing appointment for: ${appointmentTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  })}\n`);
  
  // Test appointment details - USING YOUR ACTUAL PHONE NUMBER FOR SMS TEST
  const testAppointment = {
    name: 'John Test Customer',
    phone: '9188565304', // Your business number - you will receive the SMS
    email: 'test@cleanmachine.app',
    address: '1234 S Harvard Ave, Tulsa, OK 74112',
    service: 'Full Detail',
    addOns: ['Paint Correction'],
    time: appointmentTime.toISOString(),
    formattedTime: appointmentTime.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }),
    vehicleInfo: '2020 Honda Accord'
  };
  
  console.log('Step 1: SIMULATING BAD WEATHER CONDITIONS...\n');
  
  try {
    // Create MOCK bad weather data to force an alert
    // This simulates a severe weather condition (85% chance of rain)
    const mockWeatherCheck: WeatherCheckResult = {
      needsReschedule: true,
      weatherRiskLevel: 'severe', // Force severe weather
      urgency: 'high',
      recommendation: 'Severe weather conditions (85% chance of rain) are forecasted for this appointment. This will almost certainly prevent detailing work. We strongly recommend rescheduling.',
      forecastData: [
        {
          date: new Date(appointmentTime.getTime()).toISOString(),
          description: 'Heavy rain likely',
          chanceOfRain: 85,
          temperature: 65,
          isRainy: true,
          severity: 'severe'
        },
        {
          date: new Date(appointmentTime.getTime() + 3600000).toISOString(), // +1 hour
          description: 'Heavy rain likely',
          chanceOfRain: 90,
          temperature: 64,
          isRainy: true,
          severity: 'severe'
        },
        {
          date: new Date(appointmentTime.getTime() + 7200000).toISOString(), // +2 hours
          description: 'Heavy rain likely',
          chanceOfRain: 88,
          temperature: 63,
          isRainy: true,
          severity: 'severe'
        },
        {
          date: new Date(appointmentTime.getTime() + 10800000).toISOString(), // +3 hours
          description: 'Rain likely',
          chanceOfRain: 75,
          temperature: 64,
          isRainy: true,
          severity: 'high'
        }
      ]
    };
    
    console.log('🌧️  MOCK Weather Check Results (SIMULATED BAD WEATHER):');
    console.log(`- Risk Level: ${mockWeatherCheck.weatherRiskLevel.toUpperCase()}`);
    console.log(`- Needs Reschedule: ${mockWeatherCheck.needsReschedule ? 'YES' : 'NO'}`);
    console.log(`- Urgency: ${mockWeatherCheck.urgency}`);
    console.log(`- Recommendation: ${mockWeatherCheck.recommendation}\n`);
    
    // Display mock forecast details
    console.log('Simulated Hourly Forecast for Appointment Day:');
    mockWeatherCheck.forecastData.forEach((forecast) => {
      const time = new Date(forecast.date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      console.log(`  ${time}: ${forecast.description} - ${forecast.chanceOfRain}% rain, ${forecast.temperature}°F (Severity: ${forecast.severity})`);
    });
    console.log('');
    
    // Determine if alert should be sent
    const shouldSendAlert = ['moderate', 'high', 'very-high', 'severe'].includes(
      mockWeatherCheck.weatherRiskLevel
    );
    
    if (shouldSendAlert) {
      console.log('Step 2: ⚠️  Bad weather conditions detected! Sending SMS alert...\n');
      
      // Send the weather alert using the mock weather data
      const notificationResult = await sendWeatherAlertNotification(
        testAppointment,
        mockWeatherCheck
      );
      
      console.log('Notification Results:');
      console.log(`- SMS Sent: ${notificationResult.sms ? '✅ YES' : '❌ NO'}`);
      console.log(`- Email Sent: ${notificationResult.email ? '✅ YES' : '❌ NO'}`);
      
      if (notificationResult.sms) {
        console.log('\n✅ TEST PASSED: Weather alert SMS successfully sent!');
        console.log(`📱 Check your phone (${testAppointment.phone}) for the SMS alert.`);
      } else {
        console.log('\n❌ TEST FAILED: Weather alert SMS was not sent');
        console.log('   Check Twilio credentials and phone number configuration.');
      }
      
    } else {
      console.log('❌ TEST CONFIGURATION ERROR: Weather severity was not high enough to trigger alert.');
    }
    
    console.log('\n=== Test Summary ===');
    console.log(`Appointment Date: ${testAppointment.formattedTime}`);
    console.log(`Customer: ${testAppointment.name}`);
    console.log(`Phone: ${testAppointment.phone}`);
    console.log(`Weather Risk: ${mockWeatherCheck.weatherRiskLevel} (SIMULATED)`);
    console.log(`Alert Triggered: ${shouldSendAlert ? 'YES' : 'NO'}`);
    console.log(`SMS Notification: Check your phone!`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    throw error;
  }
}

/**
 * Helper function to get the next Monday
 */
function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  return nextMonday;
}

// Run the test
testWeatherAlert()
  .then(() => {
    console.log('\n✅ Test execution completed - Check your phone for the SMS!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
