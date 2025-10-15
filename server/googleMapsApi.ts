import axios from 'axios';
import { getAuthClient } from './googleIntegration';

// Central business location (Tulsa-based coordinates)
const BUSINESS_LOCATION = {
  lat: 36.1540,
  lng: -95.9928
};

// Maximum drive time in minutes
const MAX_DRIVE_TIME_MINUTES = 26;

// We'll keep this for conversion if needed
const METERS_PER_MILE = 1609.34;

/**
 * Geocode an address to get its coordinates
 */
export async function geocodeAddress(address: string) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      return { success: false, error: 'API key configuration error' };
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      console.error('Geocoding error:', response.data.status, response.data.error_message);
      return { success: false, error: 'Failed to geocode address' };
    }

    if (!response.data.results || response.data.results.length === 0) {
      return { success: false, error: 'No results found for address' };
    }

    const location = response.data.results[0].geometry.location;
    const formattedAddress = response.data.results[0].formatted_address;

    return {
      success: true,
      location,
      formattedAddress
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return { success: false, error: 'Failed to geocode address' };
  }
}

/**
 * Check if an address is within the service area
 */
export async function checkDistanceToBusinessLocation(address: string) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      return { success: false, error: 'API key configuration error' };
    }

    // First geocode the address
    const geocodeResult = await geocodeAddress(address);
    if (!geocodeResult.success) {
      return geocodeResult; // Return the error from geocoding
    }

    // Get coordinates for origin (business) and destination (customer)
    const origins = `${BUSINESS_LOCATION.lat},${BUSINESS_LOCATION.lng}`;
    const destinations = `${geocodeResult.location.lat},${geocodeResult.location.lng}`;

    // Call the Distance Matrix API
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origins,
        destinations: destinations,
        mode: 'driving',
        units: 'imperial', // Using miles
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      console.error('Distance Matrix API error:', response.data.status, response.data.error_message);
      return { success: false, error: 'Failed to check distance' };
    }

    if (!response.data.rows || response.data.rows.length === 0 || 
        !response.data.rows[0].elements || response.data.rows[0].elements.length === 0) {
      return { success: false, error: 'No distance results found' };
    }

    const distanceElement = response.data.rows[0].elements[0];
    if (distanceElement.status !== 'OK') {
      console.error('Distance calculation error:', distanceElement.status);
      return { success: false, error: 'Failed to calculate distance' };
    }

    // Extract driving time in minutes from the response
    const distanceText = distanceElement.distance.text;
    const driveTimeText = distanceElement.duration.text;
    const driveTimeMinutes = distanceElement.duration.value / 60; // Convert seconds to minutes

    // Determine if the address is within the service area based on drive time
    const isInServiceArea = driveTimeMinutes <= MAX_DRIVE_TIME_MINUTES;

    return {
      success: true,
      distance: {
        text: distanceText
      },
      driveTime: {
        text: driveTimeText,
        minutes: driveTimeMinutes
      },
      isInServiceArea,
      formattedAddress: geocodeResult.formattedAddress
    };
  } catch (error) {
    console.error('Error checking distance:', error);
    return { success: false, error: 'Failed to check distance to business location' };
  }
}