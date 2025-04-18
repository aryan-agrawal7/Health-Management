/**
 * Utility script to simulate vitals data updates for all occupied rooms
 * Run with: node utils/simulate-vitals.js
 */
const fs = require('fs');
const path = require('path');

const vitalsPath = path.join(__dirname, '../data/vitals.json');
const roomsPath = path.join(__dirname, '../data/rooms.json');

function getOccupiedRooms() {
  try {
    const roomsData = fs.readFileSync(roomsPath, 'utf8');
    const rooms = JSON.parse(roomsData);
    return rooms.filter(room => room.status === 'occupied');
  } catch (err) {
    console.error('Error reading rooms data:', err);
    return [];
  }
}

function getVitalsData() {
  try {
    const vitalsData = fs.readFileSync(vitalsPath, 'utf8');
    return JSON.parse(vitalsData);
  } catch (err) {
    console.error('Error parsing vitals JSON. Fixing...');
    return {};
  }
}

function randomVital(base, variance) {
  return base + (Math.random() * variance * 2 - variance);
}

function updateVitalsForRoom(roomId) {
  let vitals = getVitalsData();
  
  // Initialize new structure if missing without base values.
  if (!vitals[roomId]) {
    vitals[roomId] = { temp: {}, spo2: {}, heartRate: {} };
  }
  
  const roomVitals = vitals[roomId];
  const currentCount = Object.keys(roomVitals.temp).length;
  const latestKey = currentCount.toString();
  let baseReading = {
    spo2: roomVitals.spo2[latestKey] || 98,
    temp: roomVitals.temp[latestKey] || 36.7, // Changed from temperature to temp
    heartRate: roomVitals.heartRate[latestKey] || 80
  };

  const newVitalsData = {
    spo2: Math.max(92, Math.min(100, randomVital(baseReading.spo2, 1))),
    temp: Math.max(36.0, Math.min(38.0, randomVital(baseReading.temp, 0.1))), // Changed from temperature to temp
    heartRate: Math.max(60, Math.min(100, randomVital(baseReading.heartRate, 5)))
  };
  
  if (currentCount >= 5) {
    delete roomVitals.temp["1"];
    delete roomVitals.spo2["1"];
    delete roomVitals.heartRate["1"];
    
    for (let i = 2; i <= currentCount; i++) {
      roomVitals.temp[(i - 1).toString()] = roomVitals.temp[i.toString()];
      roomVitals.spo2[(i - 1).toString()] = roomVitals.spo2[i.toString()];
      roomVitals.heartRate[(i - 1).toString()] = roomVitals.heartRate[i.toString()];
    }
    
    delete roomVitals.temp[currentCount.toString()];
    delete roomVitals.spo2[currentCount.toString()];
    delete roomVitals.heartRate[currentCount.toString()];
    
    roomVitals.temp[currentCount.toString()] = newVitalsData.temp; // Changed from temperature to temp
    roomVitals.spo2[currentCount.toString()] = newVitalsData.spo2;
    roomVitals.heartRate[currentCount.toString()] = newVitalsData.heartRate;
  } else {
    const newIndex = (currentCount + 1).toString();
    roomVitals.temp[newIndex] = newVitalsData.temp; // Changed from temperature to temp
    roomVitals.spo2[newIndex] = newVitalsData.spo2;
    roomVitals.heartRate[newIndex] = newVitalsData.heartRate;
  }
  
  fs.writeFileSync(vitalsPath, JSON.stringify(vitals, null, 2));
  console.log(`Updated vitals for Room ${roomId} at ${new Date().toLocaleTimeString()}`);
}

function updateAllOccupiedRooms() {
  const occupiedRooms = getOccupiedRooms();
  if (occupiedRooms.length === 0) {
    console.log('No occupied rooms found at this time.');
    return;
  }
  
  console.log(`Updating vitals for ${occupiedRooms.length} occupied rooms`);
  occupiedRooms.forEach(room => {
    updateVitalsForRoom(room.id.toString());
  });
  console.log(`Updated vitals for all rooms at ${new Date().toLocaleTimeString()}`);
}

updateAllOccupiedRooms();
const intervalId = setInterval(updateAllOccupiedRooms, 5000);
console.log('Simulation running continuously. Press Ctrl+C to stop.');

process.on('SIGINT', () => {
  clearInterval(intervalId);
  console.log('Simulation stopped.');
  process.exit(0);
});

