const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Read rooms data from JSON file
function getRooms() {
  const roomsPath = path.join(__dirname, '../data/rooms.json');
  const roomsData = fs.readFileSync(roomsPath, 'utf8');
  return JSON.parse(roomsData);
}

// Read patient data from JSON file
function getPatient(roomId) {
  const patientsPath = path.join(__dirname, '../data/patients.json');
  const patientsData = fs.readFileSync(patientsPath, 'utf8');
  const patients = JSON.parse(patientsData);
  return patients[roomId];
}

// Function to write rooms data to JSON file
function writeRooms(rooms) {
  const roomsPath = path.join(__dirname, '../data/rooms.json');
  fs.writeFileSync(roomsPath, JSON.stringify(rooms, null, 2));
}

// Function to write patients data to JSON file
function writePatients(patients) {
  const patientsPath = path.join(__dirname, '../data/patients.json');
  fs.writeFileSync(patientsPath, JSON.stringify(patients, null, 2));
}

// Get all patients
function getAllPatients() {
  const patientsPath = path.join(__dirname, '../data/patients.json');
  const patientsData = fs.readFileSync(patientsPath, 'utf8');
  return JSON.parse(patientsData);
}

// Get logs from JSON file
function getLogs() {
  const logsPath = path.join(__dirname, '../data/logs.json');
  try {
    const logsData = fs.readFileSync(logsPath, 'utf8');
    return JSON.parse(logsData);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

// Add new log entry
function addLogEntry(action, patientName, roomId, details) {
  const logsPath = path.join(__dirname, '../data/logs.json');
  
  // Read existing logs
  let logs = [];
  try {
    const logsData = fs.readFileSync(logsPath, 'utf8');
    logs = JSON.parse(logsData);
  } catch (error) {
    console.error('Error reading logs:', error);
  }
  
  // Create new log entry
  const newLog = {
    id: logs.length > 0 ? logs[logs.length - 1].id + 1 : 1,
    action,
    patientName,
    roomId,
    details,
    timestamp: new Date().toISOString()
  };
  
  // Add to logs array and write back to file
  logs.push(newLog);
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
}

// Get vitals data from JSON file
function getVitals() {
  const vitalsPath = path.join(__dirname, '../data/vitals.json');
  const vitalsData = fs.readFileSync(vitalsPath, 'utf8');
  return JSON.parse(vitalsData);
}

// Write vitals data to JSON file
function writeVitals(vitals) {
  const vitalsPath = path.join(__dirname, '../data/vitals.json');
  fs.writeFileSync(vitalsPath, JSON.stringify(vitals, null, 2));
}

// Home page
router.get('/', (req, res) => {
  const rooms = getRooms();
  
  // Count occupied and vacant rooms directly
  const occupiedCount = rooms.filter(room => room.status === 'occupied').length;
  const vacantCount = rooms.filter(room => room.status === 'vacant').length;
  
  res.render('home.njk', { 
    rooms,
    occupiedCount,
    vacantCount
  });
});

// Room detail page
router.get('/room/:id', (req, res) => {
  const rooms = getRooms();
  const room = rooms.find(r => r.id == req.params.id);
  if (!room) return res.status(404).send('Room not found');
  
  const patientInfo = getPatient(req.params.id) || {
    name: "Unknown",
    gender: "Unknown",
    age: 0,
    admissionDate: "Unknown",
    diagnosis: "Unknown",
    medicines: []
  };
  
  res.render('room.njk', { 
    room,
    medicines: patientInfo.medicines || [],
    patientInfo: {
      name: patientInfo.name,
      gender: patientInfo.gender,
      age: patientInfo.age,
      admissionDate: patientInfo.admissionDate,
      diagnosis: patientInfo.diagnosis
    }
  });
});

// Add patient form
router.get('/add-patient', (req, res) => {
  const rooms = getRooms();
  const vacantRooms = rooms.filter(room => room.status === 'vacant');
  res.render('add-patient.njk', { vacantRooms });
});

// Add patient submission
router.post('/add-patient', express.urlencoded({ extended: true }), (req, res) => {
  try {
    const { name, age, gender, admissionDate, diagnosis, medicines, roomId } = req.body;
    
    // Get existing data
    const rooms = getRooms();
    const patients = getAllPatients();
    
    // Update room status
    const roomIndex = rooms.findIndex(r => r.id == roomId);
    if (roomIndex === -1 || rooms[roomIndex].status !== 'vacant') {
      return res.status(400).send('Invalid room selection');
    }
    
    // Update room data
    rooms[roomIndex].status = 'occupied';
    rooms[roomIndex].patient = name;
    
    // Create patient entry
    patients[roomId] = {
      name,
      age: parseInt(age),
      gender,
      admissionDate,
      diagnosis,
      medicines: medicines ? medicines.split(',').map(med => med.trim()) : []
    };
    
    // Save data
    writeRooms(rooms);
    writePatients(patients);
    
    // Log the action
    addLogEntry('add', name, roomId, `Admitted with ${diagnosis}`);
    
    res.redirect(`/room/${roomId}`);
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).send('Error adding patient');
  }
});

// Update patient details
router.post('/room/:id/update', express.urlencoded({ extended: true }), (req, res) => {
  try {
    const roomId = req.params.id;
    const { name, age, gender, admissionDate, diagnosis, medicines } = req.body;
    
    // Get existing data
    const rooms = getRooms();
    const patients = getAllPatients();
    
    // Check if room and patient exist
    const room = rooms.find(r => r.id == roomId);
    if (!room || !patients[roomId]) {
      return res.status(404).send('Room or patient not found');
    }
    
    // Get original patient name before update
    const originalName = room.patient;
    
    // Update room data if name changed
    if (room.patient !== name) {
      const roomIndex = rooms.findIndex(r => r.id == roomId);
      rooms[roomIndex].patient = name;
      writeRooms(rooms);
    }
    
    // Update patient data
    patients[roomId] = {
      name,
      age: parseInt(age),
      gender,
      admissionDate,
      diagnosis,
      medicines: medicines ? medicines.split(',').map(med => med.trim()) : []
    };
    
    // Save patient data
    writePatients(patients);
    
    // Log the action
    addLogEntry('edit', name, roomId, `Patient details updated`);
    
    res.redirect(`/room/${roomId}`);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).send('Error updating patient');
  }
});

// Discharge patient route
router.post('/room/:id/discharge', express.urlencoded({ extended: true }), (req, res) => {
  try {
    const roomId = req.params.id;
    const reason = req.body.reason;
    
    // Get existing data
    const rooms = getRooms();
    const patients = getAllPatients();
    const vitals = getVitals();
    
    // Check if room exists
    const roomIndex = rooms.findIndex(r => r.id == roomId);
    if (roomIndex === -1 || rooms[roomIndex].status !== 'occupied') {
      return res.status(400).send('Invalid room or room is not occupied');
    }
    
    // Get patient name before discharge
    const patientName = rooms[roomIndex].patient;
    
    // Log discharge info
    addLogEntry('discharge', patientName, roomId, `Patient discharged. Reason: ${reason}`);
    
    // Update room data
    rooms[roomIndex].status = 'vacant';
    rooms[roomIndex].patient = null;
    
    // Remove patient data
    delete patients[roomId];
    
    // Remove vitals data for the room
    if (vitals[roomId]) {
      delete vitals[roomId];
    }
    
    // Save data
    writeRooms(rooms);
    writePatients(patients);
    writeVitals(vitals);
    
    // Reset stored client password to default "password123"
    const usersPath = path.join(__dirname, '../data/users.json');
    let users = {};
    try {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch (e) { }
    users[roomId] = { password: 'password123' };
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    res.redirect('/');
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).send('Error discharging patient');
  }
});

// Add new route for logs page
router.get('/logs', (req, res) => {
  const logs = getLogs();
  
  // Sort logs by timestamp (newest first)
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.render('logs.njk', { logs });
});

module.exports = router;