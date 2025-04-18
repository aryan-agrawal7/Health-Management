const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

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

// Random number generator within range
function getRandomValue(min, max, decimals = 0) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

// Generate random vital signs
function generateRandomVitals() {
    return {
        temperature: getRandomValue(36.0, 38.0, 1),   // Normal body temperature range
        heartRate: getRandomValue(60, 100, 0),        // Normal heart rate range
        spo2: getRandomValue(95, 100, 0)              // Normal SpO2 range
    };
}

// Simulate abnormal conditions occasionally (about 10% of the time)
function maybeAddAbnormalCondition(vitals, patientId) {
    const abnormalChance = Math.random();
    
    // Every 10th patient always has fever (for demo purposes)
    if (patientId === 10 || abnormalChance > 0.9) {
        console.log(`Adding fever to patient ${patientId}`);
        vitals.temperature = getRandomValue(38.1, 39.5, 1);
    }
    
    // Random low oxygen for some patients
    if (abnormalChance > 0.93) {
        console.log(`Adding low SpO2 to patient ${patientId}`);
        vitals.spo2 = getRandomValue(88, 94, 0);
    }
    
    // Random high heart rate for some patients
    if (abnormalChance > 0.95) {
        console.log(`Adding tachycardia to patient ${patientId}`);
        vitals.heartRate = getRandomValue(100, 130, 0);
    }
    
    return vitals;
}

// Upload vitals for a specific patient
async function uploadVitalsForPatient(patientId) {
    try {
        const vitals = generateRandomVitals();
        const abnormalVitals = maybeAddAbnormalCondition(vitals, patientId);
        
        // Create data structure compatible with mqtt_vitals_updater
        // Send only simple number values, not arrays or complex objects
        const formattedVitals = {
            temperature: abnormalVitals.temperature,
            heartRate: abnormalVitals.heartRate,
            spo2: abnormalVitals.spo2
        };
        
        const patientRef = ref(database, `patients/${patientId}/vitals`);
        await set(patientRef, formattedVitals);
        
        console.log(`Updated vitals for patient ${patientId}:`, formattedVitals);
    } catch (error) {
        console.error(`Error updating vitals for patient ${patientId}:`, error);
    }
}

// Upload vitals for all patients
async function uploadAllVitals() {
    console.log("Uploading new vitals data...");
    
    // Process patients sequentially to avoid Firebase rate limits
    for (let i = 1; i <= 10; i++) {
        await uploadVitalsForPatient(i);
        // Add a small delay between patients to avoid overwhelming Firebase
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log("Finished uploading vitals data");
}

// Main function: Run the generator at regular intervals
function main() {
    console.log("Starting random vitals generator...");
    console.log("Press Ctrl+C to stop");
    
    // Upload initial data
    uploadAllVitals();
    
    // Set interval for regular updates (every 30 seconds)
    const intervalId = setInterval(uploadAllVitals, 30000);
    
    // Handle application exit properly
    process.on('SIGINT', () => {
        console.log('\nStopping random vitals generator...');
        clearInterval(intervalId);
        
        // Give Firebase time to complete any pending operations
        setTimeout(() => {
            console.log('Exiting...');
            process.exit(0);
        }, 1000);
    });
}

// Start the generator
main();