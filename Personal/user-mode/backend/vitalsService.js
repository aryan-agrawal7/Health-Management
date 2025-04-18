const fs = require('fs');
const path = require('path');

const vitalsFilePath = path.join(__dirname, 'data', 'vitals.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize vitals file if it doesn't exist
if (!fs.existsSync(vitalsFilePath)) {
    const initialData = {
        "1": {  // Personal mode patient
            "temp": {
                "1": 37.0,
                "2": 37.0,
                "3": 37.0,
                "4": 37.0,
                "5": 37.0
            },
            "spo2": {
                "1": 98,
                "2": 98,
                "3": 98,
                "4": 98,
                "5": 98
            },
            "heartRate": {
                "1": 75,
                "2": 75,
                "3": 75,
                "4": 75,
                "5": 75
            }
        }
    };
    fs.writeFileSync(vitalsFilePath, JSON.stringify(initialData, null, 2));
    console.log('Created new vitals.json file for personal mode');
}

function readVitals() {
    try {
        const data = fs.readFileSync(vitalsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading vitals:', error);
        return null;
    }
}

function updateVitals(patientId, vitalType, value) {
    try {
        const vitalsData = readVitals();
        if (!vitalsData) return false;

        // Ensure patient exists
        if (!vitalsData[patientId]) {
            vitalsData[patientId] = {
                temp: { "1": null, "2": null, "3": null, "4": null, "5": null },
                spo2: { "1": null, "2": null, "3": null, "4": null, "5": null },
                heartRate: { "1": null, "2": null, "3": null, "4": null, "5": null }
            };
        }

        // Shift older readings down
        for (let i = 1; i < 5; i++) {
            vitalsData[patientId][vitalType][i] = vitalsData[patientId][vitalType][(i + 1)];
        }

        // Set the newest reading at "5"
        vitalsData[patientId][vitalType]["5"] = value;

        fs.writeFileSync(vitalsFilePath, JSON.stringify(vitalsData, null, 2));
        console.log(`Updated ${vitalType} for patient ${patientId} with value ${value}`);
        return true;
    } catch (error) {
        console.error('Error updating vitals:', error);
        return false;
    }
}

function getLatestVitals(patientId) {
    const vitalsData = readVitals();
    if (!vitalsData || !vitalsData[patientId]) return null;

    const patientData = vitalsData[patientId];
    return {
        temperature: patientData.temp["5"],
        spo2: patientData.spo2["5"],
        heartRate: patientData.heartRate["5"],
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    readVitals,
    updateVitals,
    getLatestVitals
}; 