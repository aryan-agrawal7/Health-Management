const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Helper to fetch rooms
function getRooms() {
  const roomsPath = path.join(__dirname, '../data/rooms.json');
  return JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
}

// New helper to load and update users
function getUsers() {
  const usersPath = path.join(__dirname, '../data/users.json');
  try {
    return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  } catch(e) { 
    return {};
  }
}
function saveUsers(users) {
  const usersPath = path.join(__dirname, '../data/users.json');
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// GET login page
router.get('/login', (req, res) => {
  res.render('login.njk', { hideNav: true });
});

// POST login page: userid (room_no) and password
router.post('/login', (req, res) => {
  const { room_no, password } = req.body;
  const users = getUsers();
  // Use stored password if exists; otherwise default to "password123"
  const storedPassword = users[room_no] ? users[room_no].password : 'password123';
  if (password !== storedPassword) {
    return res.render('login.njk', { error: "Invalid password", room_no, hideNav: true });
  }
  const rooms = getRooms();
  const room = rooms.find(r => r.id == room_no);
  if (!room) {
    return res.render('login.njk', { error: "Room not found", room_no, hideNav: true });
  }
  res.redirect(`/client/room/${room_no}`);
});

// New route: Show change password form
router.get('/change-password', (req, res) => {
  const room_no = req.query.room_no || '';
  res.render('change-password.njk', { room_no, hideNav: true });
});

// New route: Process change password form
router.post('/change-password', express.urlencoded({ extended: true }), (req, res) => {
  const { room_no, currentPassword, newPassword } = req.body;
  const users = getUsers();
  const storedPassword = users[room_no] ? users[room_no].password : 'password123';
  if (currentPassword !== storedPassword) {
    return res.render('change-password.njk', { error: "Current password is incorrect", room_no, hideNav: true });
  }
  users[room_no] = { password: newPassword };
  saveUsers(users);
  res.redirect(`/client/room/${room_no}`);
});

// New route: Patient calls nurse
router.post('/nurse-alert', express.json(), (req, res) => {
  const { room_no } = req.body;
  const alerts = require('../alerts');
  alerts.sendAlert(`Patient in room ${room_no} is calling for nurse`);
  res.json({ success: true });
});

// GET client room view (without edit/discharge options)
router.get('/room/:id', (req, res) => {
  const roomId = req.params.id;
  
  // Read room details
  const roomsPath = path.join(__dirname, '../data/rooms.json');
  const rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
  const room = rooms.find(r => r.id == roomId);
  if (!room) return res.status(404).send('Room not found');
  
  // Get patient info
  const patientsPath = path.join(__dirname, '../data/patients.json');
  let patients = {};
  try {
    patients = JSON.parse(fs.readFileSync(patientsPath, 'utf8'));
  } catch (e) { }
  const patientInfo = patients[roomId] || {
    name: "Unknown",
    gender: "Unknown",
    age: 0,
    admissionDate: "Unknown",
    diagnosis: "Unknown",
    medicines: []
  };
  
  res.render('client-room.njk', { room, patientInfo, medicines: patientInfo.medicines || [], hideNav: true });
});

module.exports = router;
