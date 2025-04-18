const mqtt = require('mqtt');
const { updateVitals } = require('./vitalsService');

class MQTTService {
    constructor() {
        this.client = mqtt.connect('wss://test.mosquitto.org:8081');
        this.setupConnection();
    }

    setupConnection() {
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
            // Subscribe to personal mode channels
            this.client.subscribe('/test/esp32/data31'); // Temperature
            this.client.subscribe('/test/esp32/data32'); // SpO2
            this.client.subscribe('/test/esp32/data33'); // Heart Rate
            console.log('Subscribed to personal mode channels');
        });

        this.client.on('message', (topic, message) => {
            try {
                const value = parseFloat(message.toString());
                const fieldIndex = parseInt(topic.split('data')[1]);
                
                // Map field index to vital type
                let vitalType;
                switch(fieldIndex) {
                    case 31:
                        vitalType = 'temp';
                        break;
                    case 32:
                        vitalType = 'spo2';
                        break;
                    case 33:
                        vitalType = 'heartRate';
                        break;
                    default:
                        return; // Ignore other channels
                }

                console.log(`Updating ${vitalType} with value ${value}`);
                updateVitals('1', vitalType, value); // Always use patient ID '1' for personal mode
            } catch (error) {
                console.error('Error processing MQTT message:', error);
            }
        });

        this.client.on('error', (error) => {
            console.error('MQTT Error:', error);
        });
    }
}

module.exports = new MQTTService(); 