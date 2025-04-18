const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const twilio = require('twilio');
const { readVitals, getLatestVitals } = require('./vitalsService');
require('./mqttService'); // Import to start MQTT service

dotenv.config();

const app = express();

// Initialize Twilio client with proper error handling
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

// Middleware
app.use(cors({
  origin: '*', // For testing only
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: true // Important for some complex requests
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/health-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  relationship: String,
  isPrimary: Boolean,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Medicine Reminder Schema
const medicineReminderSchema = new mongoose.Schema({
  name: String,
  dosage: String,
  time: String, 
  frequency: String,
  startDate: Date,
  endDate: Date,
  notes: String,
  active: Boolean,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
const MedicineReminder = mongoose.model('MedicineReminder', medicineReminderSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Emergency Contacts Routes
app.get('/api/emergency-contacts', auth, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.user._id });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Error fetching contacts' });
  }
});

app.post('/api/emergency-contacts', auth, async (req, res) => {
  try {
    const { name, phone, email, relationship, isPrimary } = req.body;

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await EmergencyContact.updateMany(
        { userId: req.user._id, isPrimary: true },
        { isPrimary: false }
      );
    }

    const contact = new EmergencyContact({
      name,
      phone,
      email,
      relationship,
      isPrimary,
      userId: req.user._id
    });
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ message: 'Error saving contact' });
  }
});

app.put('/api/emergency-contacts/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, relationship, isPrimary } = req.body;

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await EmergencyContact.updateMany(
        { userId: req.user._id, isPrimary: true, _id: { $ne: req.params.id } },
        { isPrimary: false }
      );
    }

    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, phone, email, relationship, isPrimary },
      { new: true }
    );
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Error updating contact' });
  }
});

app.delete('/api/emergency-contacts/:id', auth, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Error deleting contact' });
  }
});

// Medicine Reminders Routes
app.get('/api/medicine-reminders', auth, async (req, res) => {
  try {
    const reminders = await MedicineReminder.find({ userId: req.user._id });
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: 'Error fetching reminders' });
  }
});

// Fix POST route to include time field
app.post('/api/medicine-reminders', auth, async (req, res) => {
  try {
    const { name, dosage, time, frequency, startDate, endDate, notes, active } = req.body;
    const reminder = new MedicineReminder({
      name,
      dosage,
      time, // Added time field
      frequency,
      startDate,
      endDate,
      notes,
      active,
      userId: req.user._id
    });
    await reminder.save();
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error saving reminder:', error);
    res.status(500).json({ message: 'Error saving reminder' });
  }
});

// Fix PUT route to include time field
app.put('/api/medicine-reminders/:id', auth, async (req, res) => {
  try {
    const { name, dosage, time, frequency, startDate, endDate, notes, active } = req.body;
    const reminder = await MedicineReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, dosage, time, frequency, startDate, endDate, notes, active },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ message: 'Error updating reminder' });
  }
});

app.delete('/api/medicine-reminders/:id', auth, async (req, res) => {
  try {
    const reminder = await MedicineReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ message: 'Error deleting reminder' });
  }
});

// Simulation Routes
app.post('/api/simulate', auth, async (req, res) => {
  try {
    const { type } = req.body;
    console.log('Simulation request received:', { type });
    
    if (type === 'abnormal') {
      // Find primary emergency contacts
      const primaryContacts = await EmergencyContact.find({
        userId: req.user._id,
        isPrimary: true
      });
      console.log('Found primary contacts:', primaryContacts);

      // Send notifications to primary contacts
      const notificationResults = [];
      for (const contact of primaryContacts) {
        try {
          // Format phone number to E.164 format if needed
          const formattedPhone = contact.phone.startsWith('+') 
            ? contact.phone 
            : `+${contact.phone}`;

          console.log('Attempting to send SMS to:', formattedPhone);
          
          const message = await twilioClient.messages.create({
            body: 'Emergency Alert: Abnormal health condition detected! Please check the patient immediately.',
            to: formattedPhone,
            from: process.env.TWILIO_PHONE_NUMBER
          });

          console.log('SMS sent successfully:', {
            to: formattedPhone,
            messageSid: message.sid,
            status: message.status
          });
          
          notificationResults.push({
            contact: contact.name,
            phone: formattedPhone,
            status: 'success',
            messageSid: message.sid
          });
        } catch (twilioError) {
          console.error('Twilio error details:', {
            phone: contact.phone,
            error: twilioError.message,
            code: twilioError.code,
            moreInfo: twilioError.moreInfo
          });
          notificationResults.push({
            contact: contact.name,
            phone: contact.phone,
            status: 'failed',
            error: twilioError.message
          });
        }
      }

      res.json({
        message: 'Abnormal condition simulated. Emergency contacts have been notified.',
        contactsNotified: primaryContacts.length,
        notificationResults
      });
    } else {
      res.json({
        message: 'Normal condition simulated. No notifications sent.',
        contactsNotified: 0
      });
    }
  } catch (error) {
    console.error('Error in simulation endpoint:', error);
    res.status(500).json({ 
      message: 'Error simulating condition',
      error: error.message 
    });
  }
});

// Vitals endpoint
app.get('/api/vitals', (req, res) => {
    const patientId = req.query.patientId || '1'; // Default to patient 1 if not specified
    const vitals = getLatestVitals(patientId);
    if (vitals) {
        res.json(vitals);
    } else {
        res.status(500).json({ error: 'Failed to read vitals data' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});