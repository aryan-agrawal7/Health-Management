const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, onValue, off } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHtW3B27ezpIGWE0taTzAop3O8DUBMj0o",
    authDomain: "iot-proj-8e2dc.firebaseapp.com",
    databaseURL: "https://iot-proj-8e2dc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iot-proj-8e2dc", 
    storageBucket: "iot-proj-8e2dc.firebasestorage.app",
    messagingSenderId: "426592439572",
    appId: "1:426592439572:web:ecc728c03c34e1c1e8c601",
    measurementId: "G-MFGBK3WVL6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Store references to all listeners for cleanup
const patientRefs = [];
const patientCallbacks = [];

// Create directory structure if it doesn't exist
const healthDir = path.join(__dirname, 'health');
const dataDir = path.join(healthDir, 'data');

// Ensure directories exist
if (!fs.existsSync(healthDir)) {
    try {
        fs.mkdirSync(healthDir);
        console.log(`Created directory: ${healthDir}`);
    } catch (err) {
        console.error(`Failed to create directory ${healthDir}:`, err);
    }
}

if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir);
        console.log(`Created directory: ${dataDir}`);
    } catch (err) {
        console.error(`Failed to create directory ${dataDir}:`, err);
    }
}

// File paths
const vitalsFilePath = path.join(dataDir, 'vitals.json');
console.log(`Vitals file path: ${vitalsFilePath}`);

// Load existing vitals data
let vitalsData = {};
try {
    if (fs.existsSync(vitalsFilePath)) {
        const fileContent = fs.readFileSync(vitalsFilePath, 'utf8');
        vitalsData = JSON.parse(fileContent);
        console.log('✅ Loaded existing vitals data');
    } else {
        console.log('⚠️ No existing vitals file found, creating new one');
        // Create empty vitals file
        fs.writeFileSync(vitalsFilePath, JSON.stringify(vitalsData, null, 2));
    }
} catch (error) {
    console.error('Error handling vitals.json:', error);
}

console.log('✅ Connected to Firebase');
console.log('Waiting for vital updates. Press Ctrl+C to exit.');

// Track most recent data to prevent duplicate processing
const lastProcessedData = {};

// Listen for vital sign updates
for (let i = 1; i <= 10; i++) {
    const patientId = i; // Capture correct patient ID in closure
    const patientRef = ref(database, `patients/${patientId}/vitals`);
    
    // Store ref for cleanup
    patientRefs.push(patientRef);
    
    // Create callback function
    const callback = (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        // Check if this is new data
        const dataString = JSON.stringify(data);
        if (lastProcessedData[patientId] === dataString) {
            // Skip processing for duplicate data
            return;
        }
        
        console.log(`Received vital update for patient ${patientId}:`, data);
        lastProcessedData[patientId] = dataString;
        
        // Extract values from potentially mixed formats
        let tempValue = null;
        let heartRateValue = null;
        let spo2Value = null;
        
        // Try to get temperature (check both 'temperature' and 'temp')
        if (typeof data.temperature === 'number') {
            tempValue = data.temperature;
        } else if (data.temp && typeof data.temp !== 'undefined') {
            if (Array.isArray(data.temp)) {
                // Find first non-empty value in array
                for (let i = 1; i < data.temp.length; i++) {
                    if (data.temp[i] !== null && data.temp[i] !== undefined) {
                        tempValue = data.temp[i];
                        break;
                    }
                }
            } else if (typeof data.temp === 'object') {
                // Handle object form
                for (let i = 5; i >= 1; i--) {
                    if (data.temp[i] !== null && data.temp[i] !== undefined) {
                        tempValue = data.temp[i];
                        break;
                    }
                }
            }
        }
        
        // Try to get heart rate
        if (typeof data.heartRate === 'number') {
            heartRateValue = data.heartRate;
        } else if (data.heartRate && typeof data.heartRate !== 'undefined') {
            if (Array.isArray(data.heartRate)) {
                // Find first non-empty value in array
                for (let i = 1; i < data.heartRate.length; i++) {
                    if (data.heartRate[i] !== null && data.heartRate[i] !== undefined) {
                        heartRateValue = data.heartRate[i];
                        break;
                    }
                }
            } else if (typeof data.heartRate === 'object') {
                // Handle object form
                for (let i = 5; i >= 1; i--) {
                    if (data.heartRate[i] !== null && data.heartRate[i] !== undefined) {
                        heartRateValue = data.heartRate[i];
                        break;
                    }
                }
            }
        }
        
        // Try to get SPO2
        if (typeof data.spo2 === 'number') {
            spo2Value = data.spo2;
        } else if (data.spo2 && typeof data.spo2 !== 'undefined') {
            if (Array.isArray(data.spo2)) {
                // Find first non-empty value in array
                for (let i = 1; i < data.spo2.length; i++) {
                    if (data.spo2[i] !== null && data.spo2[i] !== undefined) {
                        spo2Value = data.spo2[i];
                        break;
                    }
                }
            } else if (typeof data.spo2 === 'object') {
                // Handle object form
                for (let i = 5; i >= 1; i--) {
                    if (data.spo2[i] !== null && data.spo2[i] !== undefined) {
                        spo2Value = data.spo2[i];
                        break;
                    }
                }
            }
        }
        
        console.log(`Extracted values - temp: ${tempValue}, heartRate: ${heartRateValue}, spo2: ${spo2Value}`);
        
        updateVitalsData(patientId, 'temp', tempValue);
        updateVitalsData(patientId, 'heartRate', heartRateValue);
        updateVitalsData(patientId, 'spo2', spo2Value);
        saveVitalsData();
    };
    
    // Store callback for cleanup
    patientCallbacks.push(callback);
    
    // Set up listener
    onValue(patientRef, callback, {
        onlyOnce: false
    });
}

function updateVitalsData(patientNumber, vitalType, value) {
    const patientKey = String(patientNumber);
    
    if (!vitalsData[patientKey]) {
        vitalsData[patientKey] = {
            temp: { "1": null, "2": null, "3": null, "4": null, "5": null },
            spo2: { "1": null, "2": null, "3": null, "4": null, "5": null },
            heartRate: { "1": null, "2": null, "3": null, "4": null, "5": null }
        };
    }

    // Shift older readings down
    for (let i = 1; i < 5; i++) {
        vitalsData[patientKey][vitalType][i] = vitalsData[patientKey][vitalType][(i + 1)];
    }
    
    // Set the newest reading at "5"
    vitalsData[patientKey][vitalType]["5"] = value;
    
    // REMOVED - Don't write back to Firebase to avoid circular updates
}

function saveVitalsData() {
    try {
        fs.writeFileSync(vitalsFilePath, JSON.stringify(vitalsData, null, 2));
        console.log('✅ Vitals data saved successfully');
    } catch (error) {
        console.error('Error saving vitals data:', error);
    }
}

// Improved exit handler
let isShuttingDown = false;

function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\nShutting down...');
    
    // Remove all listeners
    console.log('Detaching Firebase listeners...');
    for (let i = 0; i < patientRefs.length; i++) {
        try {
            off(patientRefs[i], patientCallbacks[i]);
            console.log(`Detached listener for patient ${i+1}`);
        } catch (error) {
            console.error(`Error detaching listener for patient ${i+1}:`, error);
        }
    }
    
    // Save final data
    console.log('Saving final data...');
    try {
        fs.writeFileSync(vitalsFilePath, JSON.stringify(vitalsData, null, 2));
        console.log('✅ Final data saved');
    } catch (error) {
        console.error('Error saving final data:', error);
    }
    
    console.log('Exiting...');
    
    // Force exit after a short delay
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

// Handle application exit
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);