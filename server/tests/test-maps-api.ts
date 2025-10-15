import { geocodeAddress, checkDistanceToBusinessLocation } from '../googleMapsApi';

// Addresses to test
const addresses = [
  "1234 S Harvard Ave, Tulsa, OK 74112", // In Tulsa, should be in service area
  "3301 South Yale Avenue, Tulsa, OK",   // In Tulsa, should be in service area
  "1800 S Baltimore Ave, Tulsa, OK",     // In Tulsa, should be in service area
  "301 N Detroit Ave, Tulsa, OK 74120",  // Downtown Tulsa
  "5434 E 81st St, Tulsa, OK 74137",     // South Tulsa
  "3106 S Garnett Rd, Tulsa, OK 74146",  // East Tulsa
  "123 Main St, Oklahoma City, OK",      // Oklahoma City, outside service area
  "123 Main St, Dallas, TX"              // Dallas, outside service area
];

async function testGeocoding() {
  console.log("Testing Geocoding API...");
  
  for (const address of addresses) {
    try {
      console.log(`\nTesting address: ${address}`);
      const result = await geocodeAddress(address);
      
      if (result.success) {
        console.log(`✅ Geocoded successfully: ${result.formattedAddress}`);
        console.log(`   Coordinates: ${JSON.stringify(result.location)}`);
      } else {
        console.log(`❌ Geocoding failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error testing geocoding for ${address}:`, error);
    }
  }
}

async function testDistanceCheck() {
  console.log("\n\nTesting Distance Matrix API...");
  
  for (const address of addresses) {
    try {
      console.log(`\nTesting distance to: ${address}`);
      const result = await checkDistanceToBusinessLocation(address);
      
      if (result.success) {
        console.log(`✅ Distance check successful: ${result.distance.text}`);
        if (result.driveTime) {
          console.log(`   Drive time: ${result.driveTime.text} (${Math.round(result.driveTime.minutes)} minutes)`);
        }
        console.log(`   In service area: ${result.isInServiceArea ? 'YES' : 'NO'}`);
        console.log(`   Formatted address: ${result.formattedAddress}`);
      } else {
        console.log(`❌ Distance check failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error testing distance for ${address}:`, error);
    }
  }
}

async function runTests() {
  try {
    await testGeocoding();
    await testDistanceCheck();
    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Error running tests:", error);
  }
}

// Run tests automatically
runTests();