import axios from 'axios';

interface VitalSign {
  heartRate: number;
  temperature: number;
  spo2: number;
  timestamp: string;
}

class MQTTService {
  private subscribers: ((data: VitalSign) => void)[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPolling();
  }

  private async fetchVitals() {
    try {
      const response = await axios.get('http://localhost:5000/api/vitals?patientId=1');
      const vitals = response.data;
      this.notifySubscribers(vitals);
    } catch (error) {
      console.error('Error fetching vitals:', error);
    }
  }

  private startPolling() {
    this.pollingInterval = setInterval(() => this.fetchVitals(), 1000);
  }

  private notifySubscribers(vitals: VitalSign) {
    this.subscribers.forEach(callback => callback(vitals));
  }

  subscribe(callback: (data: VitalSign) => void) {
    this.subscribers.push(callback);
    // Fetch initial data
    this.fetchVitals();
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const mqttService = new MQTTService(); 