const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// GET room data from JSON file
router.get('/room/:id', async (req, res) => {
  try {
    const vitalsPath = path.join(__dirname, '../data/vitals.json');
    console.log(`Reading vitals data from: ${vitalsPath}`);
    const vitalsData = fs.readFileSync(vitalsPath, 'utf8');
    let vitals;
    try {
      vitals = JSON.parse(vitalsData);
    } catch (parseError) {
      console.error('Error parsing vitals JSON:', parseError);
      return res.status(500).json({
        error: "Invalid JSON in vitals data file",
        details: parseError.message
      });
    }
    const roomId = req.params.id;
    console.log(`Request for vitals in room: ${roomId}`);
    if (!vitals[roomId]) {
      console.log(`No vitals data found for room ${roomId}`);
      return res.status(404).json({error: "Room data not found"});
    }
    const roomVitals = vitals[roomId];
    console.log(`Room vitals data:`, roomVitals);
    
    const latestVitals = getLatestVitals(roomVitals);
    const historicalData = getAllVitalsOrdered(roomVitals);
    
    const response = {
      currentVitals: latestVitals,
      historicalData: historicalData
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching room data:', error);
    res.status(500).json({error: "Failed to fetch data", details: error.message});
  }
});

// POST to update a room's vitals – using the new structure.
router.post('/room/:id', express.json(), (req, res) => {
  try {
    const roomId = req.params.id;
    const vitalsPath = path.join(__dirname, '../data/vitals.json');
    const vitalsData = fs.readFileSync(vitalsPath, 'utf8');
    const vitals = JSON.parse(vitalsData);
    
    // Initialize new structure if missing
    if (!vitals[roomId]) {
      vitals[roomId] = { heartRate: {}, spo2: {}, temp: {} };
    }
    
    // Expecting req.body to have: { heartRate, spo2, temperature }
    const newVitalsData = {
      heartRate: req.body.heartRate,
      spo2: req.body.spo2,
      temperature: req.body.temperature
    };
    
    rotateVitalsData(vitals[roomId], newVitalsData);
    
    fs.writeFileSync(vitalsPath, JSON.stringify(vitals, null, 2));

    // Helper to determine if the new vitals are abnormal  
    function isAbnormal(data) {
      return (
        data.heartRate < 60 || data.heartRate > 100 ||
        data.spo2 < 95 ||
        data.temperature > 37.5
      );
    }
    
    if (isAbnormal(newVitalsData)) {
      const alerts = require('../alerts');
      alerts.sendAlert(`Abnormal vitals in room ${roomId}: HeartRate: ${newVitalsData.heartRate}, SpO2: ${newVitalsData.spo2}, Temperature: ${newVitalsData.temperature}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating room data:', error);
    res.status(500).json({ error: "Failed to update data", details: error.message });
  }
});

// Update the getLatestVitals function to handle mixed data formats
function getLatestVitals(roomVitals) {
  if (!roomVitals) return null;
  
  // Find the last non-null heart rate value
  let latestHeartRate = null;
  for (let i = 5; i >= 1; i--) {
    if (roomVitals.heartRate && roomVitals.heartRate[i] !== null) {
      latestHeartRate = roomVitals.heartRate[i];
      break;
    }
  }
  
  // Find the last non-null SpO2 value
  let latestSpo2 = null;
  for (let i = 5; i >= 1; i--) {
    if (roomVitals.spo2 && roomVitals.spo2[i] !== null) {
      latestSpo2 = roomVitals.spo2[i];
      break;
    }
  }
  
  // Find the last non-null temperature value
  let latestTemp = null;
  for (let i = 5; i >= 1; i--) {
    if (roomVitals.temp && roomVitals.temp[i] !== null) {
      latestTemp = roomVitals.temp[i];
      break;
    }
  }
  
  return {
    heartRate: latestHeartRate,
    spo2: latestSpo2,
    temperature: latestTemp
  };
}

// Also update the getAllVitalsOrdered function to handle missing data
function getAllVitalsOrdered(roomVitals) {
  if (!roomVitals) return [];
  
  // Find the maximum number of readings across all vital types
  const heartRateKeys = roomVitals.heartRate ? Object.keys(roomVitals.heartRate).map(Number) : [];
  const spo2Keys = roomVitals.spo2 ? Object.keys(roomVitals.spo2).map(Number) : [];
  const tempKeys = roomVitals.temp ? Object.keys(roomVitals.temp).map(Number) : [];
  
  const allKeys = [...heartRateKeys, ...spo2Keys, ...tempKeys];
  if (allKeys.length === 0) return [];
  
  const maxCount = Math.max(...allKeys);
  let vitalsArray = [];
  
  for (let i = 1; i <= maxCount; i++) {
    const key = i.toString();
    vitalsArray.push({
      heartRate: roomVitals.heartRate && roomVitals.heartRate[key] !== undefined ? roomVitals.heartRate[key] : 0,
      spo2: roomVitals.spo2 && roomVitals.spo2[key] !== undefined ? roomVitals.spo2[key] : 0,
      temperature: roomVitals.temp && roomVitals.temp[key] !== undefined ? roomVitals.temp[key] : 0
    });
  }
  
  return vitalsArray;
}

// New helper: rotates the readings so that at most 5 appear.
function rotateVitalsData(roomVitals, newData) {
  if (!roomVitals.heartRate) {
    roomVitals.heartRate = {};
    roomVitals.spo2 = {};
    roomVitals.temp = {};
  }
  
  const count = Object.keys(roomVitals.heartRate).length;
  
  if (count >= 5) {
    delete roomVitals.heartRate["1"];
    delete roomVitals.spo2["1"];
    delete roomVitals.temp["1"];
    
    for (let i = 2; i <= count; i++) {
      roomVitals.heartRate[(i - 1).toString()] = roomVitals.heartRate[i.toString()];
      roomVitals.spo2[(i - 1).toString()] = roomVitals.spo2[i.toString()];
      roomVitals.temp[(i - 1).toString()] = roomVitals.temp[i.toString()];
    }
    
    delete roomVitals.heartRate[count.toString()];
    delete roomVitals.spo2[count.toString()];
    delete roomVitals.temp[count.toString()];
    
    roomVitals.heartRate[count.toString()] = newData.heartRate;
    roomVitals.spo2[count.toString()] = newData.spo2;
    roomVitals.temp[count.toString()] = newData.temperature;
  } else {
    const newIndex = (count + 1).toString();
    roomVitals.heartRate[newIndex] = newData.heartRate;
    roomVitals.spo2[newIndex] = newData.spo2;
    roomVitals.temp[newIndex] = newData.temperature;
  }
}

module.exports = router;