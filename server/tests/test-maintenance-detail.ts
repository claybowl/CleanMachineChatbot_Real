import { shouldOfferMaintenanceDetail, mightNeedDeeperCleaning } from '../maintenanceDetail';

// Test different scenarios for maintenance detail recommendations
console.log('\n=== Maintenance Detail Program Recommendation Tests ===\n');

// Test cases for well-maintained vehicles
const wellMaintainedMessages = [
  'I keep my car regularly detailed every month',
  'My car is always garage kept and in pristine condition',
  'I try to maintain my car\'s appearance with regular cleaning',
  'I like to keep my vehicle in showroom condition',
  'I need just a light touch-up, I detail it regularly myself'
];

// Test cases for vehicles needing deeper cleaning
const dirtyVehicleMessages = [
  'My car is pretty dirty with a lot of stains',
  'My kids made a big mess in the backseat',
  'I spilled coffee all over the interior last week',
  'It hasn\'t been cleaned in about a year',
  'There\'s dog hair everywhere in my car'
];

// Test well-maintained vehicle messages
console.log('=== Well-Maintained Vehicle Tests ===');
wellMaintainedMessages.forEach(message => {
  const shouldOffer = shouldOfferMaintenanceDetail('', message);
  console.log(`"${message}"\n-> Should offer maintenance detail: ${shouldOffer ? 'YES' : 'NO'}\n`);
});

// Test dirty vehicle messages
console.log('=== Dirty Vehicle Tests ===');
dirtyVehicleMessages.forEach(message => {
  const shouldOffer = shouldOfferMaintenanceDetail('', message);
  const needsDeeper = mightNeedDeeperCleaning(message);
  console.log(`"${message}"\n-> Should offer maintenance detail: ${shouldOffer ? 'YES' : 'NO'}`);
  console.log(`-> Needs deeper cleaning: ${needsDeeper ? 'YES' : 'NO'}\n`);
});

// Test repeat customer scenario
console.log('=== Repeat Customer Test ===');
console.log('Note: This would require a populated customer memory to test fully')