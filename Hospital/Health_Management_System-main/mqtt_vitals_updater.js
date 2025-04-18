const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// MQTT Configuration
const client = mqtt.connect('wss://test.mosquitto.org:8081');

// File paths
const vitalsFilePath = path.join(__dirname, 'health', 'data', 'vitals.json');

// Load existing vitals data
let vitalsData = {};
try {
    vitalsData = JSON.parse(fs.readFileSync(vitalsFilePath, 'utf8'));
} catch (error) {
    console.error('Error reading vitals.json:', error);
    process.exit(1);
}

// MQTT Connection handler
client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    
    // Subscribe to all 30 topics (10 patients × 3 vitals)
    for (let i = 1; i <= 30; i++) {
        const topic = `/test/esp32/data${i}`;
        client.subscribe(topic);
        console.log(`Subscribed to ${topic}`);
    }
});

// MQTT Message handler
client.on('message', (topic, message) => {
    try {
        const fieldIndex = parseInt(topic.split('data')[1]);
        const value = parseFloat(message.toString());
        
        // Calculate patient number and vital type based on field index
        const patientNumber = Math.floor((fieldIndex - 1) / 3) + 1;
        const vitalType = (fieldIndex - 1) % 3 === 0 ? 'temp' : ((fieldIndex - 1) % 3 === 1 ? 'spo2' : 'heartRate');

        console.log(`Updating patient ${patientNumber} ${vitalType} with value ${value}`);
        updateVitalsData(patientNumber, vitalType, value);
        saveVitalsData();
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

function updateVitalsData(patientNumber, vitalType, value) {
    const patientKey = String(patientNumber);

    // Ensure patient and vital objects exist
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
}

function saveVitalsData() {
    try {
        fs.writeFileSync(vitalsFilePath, JSON.stringify(vitalsData, null, 2));
        console.log('✅ Vitals data saved successfully');
    } catch (error) {
        console.error('Error saving vitals data:', error);
    }
}

// Error handling
client.on('error', (error) => {
    console.error('MQTT Error:', error);
});

process.on('SIGINT', () => {
    console.log('Disconnecting from MQTT broker...');
    client.end();
    process.exit();
});