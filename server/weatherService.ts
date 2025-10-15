import axios from 'axios';

// Types for OpenWeatherMap API responses
export interface WeatherForecast {
  date: string;
  description: string;
  chanceOfRain: number;
  temperature: number;
  isRainy: boolean;
  severity: 'none' | 'low' | 'moderate' | 'high' | 'severe';
}

export interface WeatherCheckResult {
  needsReschedule: boolean;
  forecastData: WeatherForecast[];
  recommendation: string;
  urgency: 'none' | 'low' | 'medium' | 'high';
  weatherRiskLevel: 'none' | 'low' | 'moderate' | 'high' | 'very-high' | 'severe';
}

/**
 * Get hourly weather forecast for a location
 * @param latitude Location latitude
 * @param longitude Location longitude
 * @param days Number of days to forecast (max 4)
 */
/**
 * Simplified alias for getHourlyForecast with a consistent name used in routes
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  days: number = 3
): Promise<WeatherForecast[]> {
  return getHourlyForecast(latitude, longitude, days);
}

/**
 * Get hourly weather forecast for a location using Open-Meteo API (free, no key required)
 */
export async function getHourlyForecast(
  latitude: number, 
  longitude: number, 
  days: number = 3
): Promise<WeatherForecast[]> {
  try {
    // Use Open-Meteo free weather API
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: latitude,
        longitude: longitude,
        hourly: 'temperature_2m,precipitation_probability,weathercode',
        temperature_unit: 'fahrenheit',
        timezone: 'America/Chicago', // Tulsa timezone
        forecast_days: Math.min(days, 7) // Open-Meteo supports up to 7 days
      }
    });

    if (response.status !== 200) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = response.data;
    const forecasts: WeatherForecast[] = [];
    
    // Process hourly data
    const hourlyData = data.hourly;
    const times = hourlyData.time;
    const temperatures = hourlyData.temperature_2m;
    const precipProbabilities = hourlyData.precipitation_probability || [];
    const weatherCodes = hourlyData.weathercode || [];
    
    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const hour = date.getHours();
      
      // Only include business hours (9am to 5pm) when detailing work would be performed
      if (hour >= 9 && hour <= 17) {
        const weatherCode = weatherCodes[i] || 0;
        const precipProb = precipProbabilities[i] || 0;
        
        // Weather codes: 0=clear, 1-3=cloudy, 51-67=rain, 71-77=snow, 80-99=showers/thunderstorms
        const isRainy = weatherCode >= 51 && weatherCode <= 99;
        
        // Get weather description based on WMO weather codes
        let description = 'Clear';
        if (weatherCode === 0) description = 'Clear sky';
        else if (weatherCode <= 3) description = 'Partly cloudy';
        else if (weatherCode <= 49) description = 'Foggy';
        else if (weatherCode <= 67) description = 'Rain';
        else if (weatherCode <= 77) description = 'Snow';
        else if (weatherCode <= 82) description = 'Rain showers';
        else if (weatherCode <= 99) description = 'Thunderstorm';
        
        // Determine severity based on precipitation probability
        let severity: 'none' | 'low' | 'moderate' | 'high' | 'severe' = 'none';
        
        if (isRainy || precipProb > 0) {
          if (precipProb > 70) {
            severity = 'severe';
          } else if (precipProb > 50) {
            severity = 'high';
          } else if (precipProb > 30) {
            severity = 'moderate';
          } else if (precipProb > 15) {
            severity = 'low';
          }
        }
        
        forecasts.push({
          date: date.toISOString(),
          description,
          chanceOfRain: Math.round(precipProb),
          temperature: Math.round(temperatures[i]),
          isRainy,
          severity
        });
      }
    }
    
    return forecasts;
  } catch (error: any) {
    console.error('Error fetching weather forecast:', error);
    throw new Error(`Failed to fetch weather forecast: ${error.message}`);
  }
}

/**
 * Check if the weather for a specific appointment date and location requires rescheduling
 * @param latitude Location latitude
 * @param longitude Location longitude
 * @param appointmentDate Date of the appointment
 */
export async function checkAppointmentWeather(
  latitude: number,
  longitude: number,
  appointmentDate: string
): Promise<WeatherCheckResult> {
  try {
    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    const daysDiff = Math.ceil((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // If appointment is too far in the future (>4 days), we can't check weather yet
    if (daysDiff > 4) {
      return {
        needsReschedule: false,
        forecastData: [],
        recommendation: "Appointment is more than 4 days away. Weather forecast not available yet.",
        urgency: 'none',
        weatherRiskLevel: 'none'
      };
    }
    
    // Get the hourly forecast
    const forecasts = await getHourlyForecast(latitude, longitude, Math.max(daysDiff, 1));
    
    // Filter forecasts for the appointment date
    const appointmentDateString = appointmentDateTime.toISOString().split('T')[0];
    const appointmentForecasts = forecasts.filter(f => 
      f.date.split('T')[0] === appointmentDateString
    );
    
    // If no forecasts found for the appointment date
    if (appointmentForecasts.length === 0) {
      return {
        needsReschedule: false,
        forecastData: forecasts,
        recommendation: "No weather data available for the appointment date.",
        urgency: 'none',
        weatherRiskLevel: 'none'
      };
    }
    
    // Calculate average rain probability
    const avgRainProbability = appointmentForecasts.reduce((sum, f) => sum + f.chanceOfRain, 0) / appointmentForecasts.length;
    
    // Check if any hour during the appointment time has severe or high weather conditions
    const hasSevereWeather = appointmentForecasts.some(f => 
      f.severity === 'severe' || f.severity === 'high'
    );
    
    // Check if majority of appointment hours have at least moderate weather conditions
    const hasModerateWeather = appointmentForecasts.filter(f => 
      f.severity === 'moderate' || f.severity === 'high' || f.severity === 'severe'
    ).length > (appointmentForecasts.length / 2);
    
    let needsReschedule = false;
    let recommendation = "";
    let urgency: 'none' | 'low' | 'medium' | 'high' = 'none';
    let weatherRiskLevel: 'none' | 'low' | 'moderate' | 'high' | 'very-high' | 'severe' = 'none'; // For marking high weather risk appointments
    
    // Apply the client's specific rain probability thresholds
    if (avgRainProbability >= 80) {
      needsReschedule = true;
      recommendation = "Severe weather conditions (80-100% chance of rain) are forecasted for this appointment. This will almost certainly prevent detailing work. We strongly recommend rescheduling.";
      urgency = 'high';
      weatherRiskLevel = 'severe';
    } else if (avgRainProbability >= 60) {
      needsReschedule = true;
      recommendation = "Very high chance of rain (60-80%) during this appointment time. We recommend rescheduling to ensure quality service.";
      urgency = 'high';
      weatherRiskLevel = 'very-high';
    } else if (avgRainProbability >= 25) {
      needsReschedule = true;
      recommendation = "High chance of rain (25-60%) expected during this appointment. Consider rescheduling for better detailing results.";
      urgency = 'medium';
      weatherRiskLevel = 'high';
    } else if (avgRainProbability >= 15) {
      needsReschedule = false;
      recommendation = "Moderate chance of rain (15-25%) during this appointment. We can still perform the service, but exterior detailing might be affected.";
      urgency = 'low';
      weatherRiskLevel = 'moderate';
    } else {
      recommendation = "Weather looks good for this appointment (less than 15% chance of rain).";
      urgency = 'none';
      weatherRiskLevel = 'low';
    }
    
    return {
      needsReschedule,
      forecastData: appointmentForecasts,
      recommendation,
      urgency,
      weatherRiskLevel
    };
  } catch (error: any) {
    console.error('Error checking appointment weather:', error);
    throw new Error(`Failed to check appointment weather: ${error.message}`);
  }
}

/**
 * Check weather forecasts for all upcoming appointments
 * @param appointments List of appointments to check
 * @returns Weather check results for each appointment
 */
export async function checkWeatherForAppointments(
  appointments: Array<{
    id: string;
    date: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  }>
): Promise<Record<string, WeatherCheckResult>> {
  const results: Record<string, WeatherCheckResult> = {};
  
  for (const appointment of appointments) {
    try {
      // Use provided coordinates or geocode the location if needed
      const lat = appointment.latitude || 36.1236407; // Default to Tulsa coordinates
      const lon = appointment.longitude || -95.9359214;
      
      const weatherCheck = await checkAppointmentWeather(
        lat,
        lon,
        appointment.date
      );
      
      results[appointment.id] = weatherCheck;
    } catch (error: any) {
      console.error(`Error checking weather for appointment ${appointment.id}:`, error);
      results[appointment.id] = {
        needsReschedule: false,
        forecastData: [],
        recommendation: `Error checking weather: ${error.message}`,
        urgency: 'none',
        weatherRiskLevel: 'none'
      };
    }
  }
  
  return results;
}

/**
 * Check weather for all upcoming appointments and return appointments that need rescheduling
 * This is used for proactive weather notifications
 */
export async function checkAndAlertForUpcomingAppointments(): Promise<{
  totalAppointments: number;
  appointmentsChecked: number;
  appointmentsNeedingReschedule: number;
  detailedResults: Array<{
    id: string;
    customerName: string;
    date: string;
    needsReschedule: boolean;
    recommendation: string;
    urgency: 'none' | 'low' | 'medium' | 'high';
    weatherRiskLevel: 'none' | 'low' | 'moderate' | 'high' | 'very-high' | 'severe';
  }>;
}> {
  try {
    // Get upcoming appointments from the calendar API
    // This would typically come from your dashboard/calendar API
    // For now, we'll use test data for development until we connect to the real calendar
    const testAppointments = [
      {
        id: 'appt-1',
        customerName: 'John Smith',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        location: 'Tulsa, OK',
        latitude: 36.1236407,
        longitude: -95.9359214
      },
      {
        id: 'appt-2',
        customerName: 'Jane Doe',
        date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // day after tomorrow
        location: 'Tulsa, OK',
        latitude: 36.1236407,
        longitude: -95.9359214
      }
    ];
    
    // Get weather forecasts for these appointments
    const weatherResults = await checkWeatherForAppointments(testAppointments);
    
    // Process the results
    const detailedResults = testAppointments.map(appointment => {
      const weatherResult = weatherResults[appointment.id];
      return {
        id: appointment.id,
        customerName: appointment.customerName,
        date: appointment.date,
        needsReschedule: weatherResult?.needsReschedule || false,
        recommendation: weatherResult?.recommendation || 'No weather data available',
        urgency: weatherResult?.urgency || 'none',
        weatherRiskLevel: weatherResult?.weatherRiskLevel || 'none'
      };
    });
    
    // Count appointments needing rescheduling
    const appointmentsNeedingReschedule = detailedResults.filter(
      result => result.needsReschedule
    ).length;
    
    return {
      totalAppointments: testAppointments.length,
      appointmentsChecked: detailedResults.length,
      appointmentsNeedingReschedule,
      detailedResults
    };
  } catch (error: any) {
    console.error('Error checking upcoming appointments weather:', error);
    return {
      totalAppointments: 0,
      appointmentsChecked: 0,
      appointmentsNeedingReschedule: 0,
      detailedResults: []
    };
  }
}