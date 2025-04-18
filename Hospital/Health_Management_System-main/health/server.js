const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const app = express();

// Configuration
const PORT = 3000;

// Template engine setup
const env = nunjucks.configure('views', {
  autoescape: true,
  express: app
});

// Add custom date filter
env.addFilter('date', function(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
});

app.set('view engine', 'njk'); // Change file extensions to .njk

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicit route for nurse station dashboard
app.get('/nurse-station', (req, res) => {
  res.render('index.njk');
});

// New route for notifications page
app.get('/notifications', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  // Load notifications from a JSON file or create an empty array if file doesn't exist
  let notifications = [];
  try {
    const notificationsPath = path.join(__dirname, 'data/notifications.json');
    if (fs.existsSync(notificationsPath)) {
      notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
  
  res.render('notifications.njk', { notifications });
});

// Routes
app.use('/', require('./routes/rooms'));
app.use('/api', require('./routes/api'));
app.use('/client', require('./routes/client')); // New client routes

// Serve React build static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Create HTTP server and initialize alerts (Socket.IO)
const http = require('http');
const server = http.createServer(app);
const alerts = require('./alerts');

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Nurse Station Dashboard available at http://localhost:${PORT}/nurse-station`);
});
alerts.init(server);