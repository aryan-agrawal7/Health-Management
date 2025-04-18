const fs = require('fs');
const path = require('path');

let io;
module.exports = {
  init: function(server) {
    io = require('socket.io')(server);
  },
  
  sendAlert: function(message) {
    if (io) {
      io.emit('alert', message);
    }
    
    // Save the notification to a JSON file
    this.saveNotification(message);
  },
  
  saveNotification: function(message) {
    try {
      const notificationsPath = path.join(__dirname, 'data/notifications.json');
      let notifications = [];
      
      // Read existing notifications file if it exists
      if (fs.existsSync(notificationsPath)) {
        notifications = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
      }
      
      // Determine the notification type
      let type = 'system';
      let roomId = null;
      
      if (message.includes('calling for nurse')) {
        type = 'nurse-call';
        // Try to extract room number
        const roomMatch = message.match(/room (\d+)/i);
        if (roomMatch) {
          roomId = roomMatch[1];
        }
      } else if (message.includes('Abnormal vitals')) {
        type = 'vital-alert';
        // Try to extract room number
        const roomMatch = message.match(/room (\d+)/i);
        if (roomMatch) {
          roomId = roomMatch[1];
        }
      }
      
      // Create a new notification object
      const notification = {
        id: notifications.length + 1,
        timestamp: new Date().toISOString(),
        message: message,
        type: type,
        roomId: roomId,
        status: 'unread'
      };
      
      // Add the new notification
      notifications.push(notification);
      
      // Save the updated notifications
      fs.writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }
};
