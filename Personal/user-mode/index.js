require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const twilio = require('twilio');
const schedule = require('node-schedule');
const notifier = require('node-notifier');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'MONGODB_URI'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// MQTT Configuration
const mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'wss://test.mosquitto.org:8081');

// Twilio Configuration
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  relationship: String,
  priority: Number
});

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);

// Medicine Reminder Schema
const medicineReminderSchema = new mongoose.Schema({
  name: String,
  dosage: String,
  time: String,
  days: [String],
  active: Boolean
});

const MedicineReminder = mongoose.model('MedicineReminder', medicineReminderSchema);

// MQTT Message Handler
mqttClient.on('message', (topic, message) => {
  const data = JSON.parse(message.toString());
  const { patientId, vitals } = data;
  
  // Check vitals against thresholds
  checkVitals(patientId, vitals);
});

// Function to check vitals and trigger alerts
async function checkVitals(patientId, vitals) {
  const thresholds = {
    heartRate: { min: 60, max: 100 },
    spo2: { min: 95, max: 100 },
    temperature: { min: 36.5, max: 37.5 }
  };

  const alerts = [];
  
  if (vitals.heartRate < thresholds.heartRate.min || vitals.heartRate > thresholds.heartRate.max) {
    alerts.push('Abnormal heart rate detected!');
  }
  
  if (vitals.spo2 < thresholds.spo2.min) {
    alerts.push('Low oxygen saturation detected!');
  }
  
  if (vitals.temperature < thresholds.temperature.min || vitals.temperature > thresholds.temperature.max) {
    alerts.push('Abnormal temperature detected!');
  }

  if (alerts.length > 0) {
    await notifyEmergencyContacts(alerts);
    sendAlertNotification(alerts);
  }
}

// Function to notify emergency contacts
async function notifyEmergencyContacts(alerts) {
  const contacts = await EmergencyContact.find().sort({ priority: 1 });
  
  for (const contact of contacts) {
    try {
      await twilioClient.messages.create({
        body: `EMERGENCY ALERT: ${alerts.join(', ')}`,
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER
      });
    } catch (error) {
      console.error(`Failed to send alert to ${contact.name}:`, error);
    }
  }
}

// Function to send local notifications
function sendAlertNotification(alerts) {
  notifier.notify({
    title: 'Health Alert',
    message: alerts.join('\n'),
    sound: true,
    wait: true
  });
}

// Medicine Reminder Scheduler
async function scheduleMedicineReminders() {
  try {
    const reminders = await MedicineReminder.find({ active: true });
    
    // Clear existing scheduled jobs
    const scheduledJobs = schedule.scheduledJobs;
    for (const job in scheduledJobs) {
      scheduledJobs[job].cancel();
    }
    
    // Schedule new reminders
    reminders.forEach(reminder => {
      const [hours, minutes] = reminder.time.split(':');
      const rule = new schedule.RecurrenceRule();
      rule.hour = parseInt(hours);
      rule.minute = parseInt(minutes);
      rule.dayOfWeek = reminder.days.map(day => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days.indexOf(day.toLowerCase());
      });

      const job = schedule.scheduleJob(rule, () => {
        notifier.notify({
          title: 'Medicine Reminder',
          message: `Time to take ${reminder.name} (${reminder.dosage})`,
          sound: true,
          wait: true
        });
        
        // Log the reminder
        console.log(`Medicine reminder triggered: ${reminder.name} at ${reminder.time}`);
      });

      console.log(`Scheduled reminder for ${reminder.name} at ${reminder.time}`);
    });
  } catch (error) {
    console.error('Error scheduling medicine reminders:', error);
  }
}

// API Routes
app.post('/api/emergency-contacts', async (req, res) => {
  try {
    const contact = new EmergencyContact(req.body);
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/emergency-contacts', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find().sort({ priority: 1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/emergency-contacts/:id', async (req, res) => {
  try {
    await EmergencyContact.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/medicine-reminders', async (req, res) => {
  try {
    const reminder = new MedicineReminder(req.body);
    await reminder.save();
    await scheduleMedicineReminders(); // Reschedule all reminders
    res.status(201).json(reminder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/medicine-reminders', async (req, res) => {
  try {
    const reminders = await MedicineReminder.find();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/medicine-reminders/:id', async (req, res) => {
  try {
    await MedicineReminder.findByIdAndDelete(req.params.id);
    await scheduleMedicineReminders(); // Reschedule remaining reminders
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured',
    uptime: process.uptime()
  };
  res.json(healthStatus);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// MQTT Error Handling
mqttClient.on('error', (error) => {
  console.error('MQTT Error:', error);
});

mqttClient.on('close', () => {
  console.log('MQTT Connection closed. Attempting to reconnect...');
  setTimeout(() => {
    mqttClient.reconnect();
  }, 5000);
});

// MongoDB Error Handling
mongoose.connection.on('error', (error) => {
  console.error('MongoDB Connection Error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Disconnected. Attempting to reconnect...');
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URI);
  }, 5000);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`User mode server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
  
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      scheduleMedicineReminders();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}); 