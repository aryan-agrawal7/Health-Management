import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Reminder {
  _id: string;
  name: string;
  dosage: string;
  time?: string;
}

const MedicineReminders = () => {
  const { getAuthAxios, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState<Date>(new Date());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref for the audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio context and notification permissions
  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio('/notification.mp3');
    
    // Request notification permissions
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Log reminders for debugging
  useEffect(() => {
    console.log('Current reminders:', reminders);
  }, [reminders]);
  
  // Fetch reminders from the API with better time handling
  const fetchReminders = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/medicine-reminders');
      console.log('API response full data:', JSON.stringify(response.data));
      
      if (Array.isArray(response.data)) {
        // Process reminders with better handling of time fields
        const processedReminders = await Promise.all(response.data
          .filter((item: any) => 
            item && 
            typeof item === 'object' && 
            item._id && 
            typeof item._id === 'string' &&
            item.name && 
            typeof item.name === 'string' &&
            item.dosage && 
            typeof item.dosage === 'string'
          )
          .map(async (reminder: any) => {
            console.log(`Processing reminder: ${reminder.name}, time value:`, reminder.time);
            
            // Only add time if it's strictly undefined, null, or empty string
            if (reminder.time === undefined || reminder.time === null || reminder.time === '') {
              console.log(`Reminder truly missing time: ${reminder.name}`);
              const defaultTime = format(new Date(), 'HH:mm');
              
              try {
                // Update the reminder in the database
                await authAxios.put(`/api/medicine-reminders/${reminder._id}`, {
                  ...reminder,
                  time: defaultTime
                });
                console.log(`Updated reminder with default time: ${reminder.name} at ${defaultTime}`);
                return { ...reminder, time: defaultTime } as Reminder;
              } catch (err) {
                console.error('Failed to update reminder with default time:', err);
                return { ...reminder, time: defaultTime } as Reminder;
              }
            } else {
              // Just return the reminder with its existing time - don't modify it
              console.log(`Preserving original time for: ${reminder.name} at ${reminder.time}`);
              return reminder as Reminder;
            }
          }));
        
        setReminders(processedReminders);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Invalid response format from server');
        setReminders([]);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to load reminders');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthAxios, isAuthenticated]);
  
  // Initial fetch of reminders
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchReminders();
  }, [isAuthenticated, navigate, fetchReminders]);
  
  // Play notification sound function
  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef.current) {
        // Reset the audio to start
        audioRef.current.currentTime = 0;
        
        // Play the sound
        const playPromise = audioRef.current.play();
        
        // Handle potential play() promise rejection
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Audio play failed:', error);
            // Show an error message for audio playback issues
            showSnackbar('Audio notification failed. Please check your sound settings.', 'warning');
          });
        }
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);
  
  // Helper function to show snackbar messages
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  // Show a notification based on a reminder
  const showNotification = useCallback((reminder: Reminder) => {
    // Play sound notification
    playNotificationSound();
    
    // Show in-app notification
    showSnackbar(`Time to take ${reminder.name} - ${reminder.dosage}`, 'info');
    
    // Show browser notification if permissions granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Medicine Reminder', {
          body: `Time to take ${reminder.name} - ${reminder.dosage}`,
          icon: '/medicine-icon.png'
        });
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  }, [playNotificationSound]);
  
  // Check for reminders every minute
  useEffect(() => {
    // Skip if not authenticated or no reminders
    if (!isAuthenticated || reminders.length === 0) {
      return;
    }
    
    const checkReminders = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      
      reminders.forEach(reminder => {
        // Skip invalid reminders or those without time
        if (!reminder || !reminder.time) {
          console.log('Skipping reminder without time:', reminder);
          return;
        }
        
        // Check if current time matches reminder time
        if (reminder.time === currentTime) {
          console.log('Triggering notification for reminder:', reminder);
          showNotification(reminder);
        }
      });
    };
    
    // Check immediately and then every 15 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 15000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, reminders, showNotification]);
  
  // Handle form submission for adding/editing reminders
  const handleSave = async () => {
    if (!name || !dosage) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }
    
    try {
      // Format time in HH:mm format
      const timeStr = format(time, 'HH:mm');
      console.log(`Saving reminder with time: ${timeStr}`);
      
      const reminderData = {
        name,
        dosage,
        time: timeStr
      };
      
      console.log('Saving reminder data:', reminderData);
      
      const authAxios = getAuthAxios();
      
      if (editingReminder) {
        await authAxios.put(`/api/medicine-reminders/${editingReminder._id}`, reminderData);
        console.log('Updated reminder with time:', timeStr);
        showSnackbar('Reminder updated successfully');
      } else {
        await authAxios.post('/api/medicine-reminders', reminderData);
        console.log('Created reminder with time:', timeStr);
        showSnackbar('Reminder added successfully');
      }
      
      // Reset form and refresh reminders
      handleClose();
      await fetchReminders();
    } catch (error) {
      console.error('Error saving reminder:', error);
      showSnackbar('Failed to save reminder', 'error');
    }
  };
  
  // Handle reminder deletion
  const handleDelete = async (id: string) => {
    try {
      const authAxios = getAuthAxios();
      await authAxios.delete(`/api/medicine-reminders/${id}`);
      showSnackbar('Reminder deleted successfully');
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      showSnackbar('Failed to delete reminder', 'error');
    }
  };
  
  // Handle editing a reminder - FIXED to handle undefined time
  const handleEdit = (reminder: Reminder) => {
    try {
      console.log('Editing reminder:', JSON.stringify(reminder));
      
      if (!reminder) {
        console.error('Attempted to edit undefined reminder');
        return;
      }
      
      setEditingReminder(reminder);
      setName(reminder.name || '');
      setDosage(reminder.dosage || '');
      
      // Create a new Date object for the current time as a fallback
      const newTime = new Date();
      
      // Extra defensive logging
      console.log('Reminder time value:', reminder.time);
      console.log('Reminder time type:', reminder.time ? typeof reminder.time : 'undefined');
      
      // Only try to parse the time if it exists and is a non-empty string
      if (reminder.time && 
          typeof reminder.time === 'string' && 
          reminder.time.trim() !== '') {
        
        // Check if it contains a colon before attempting split
        if (reminder.time.indexOf(':') !== -1) {
          const timeParts = reminder.time.split(':');
          console.log('Time parts after split:', timeParts);
          
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            if (!isNaN(hours) && !isNaN(minutes)) {
              newTime.setHours(hours);
              newTime.setMinutes(minutes);
              newTime.setSeconds(0);
              newTime.setMilliseconds(0);
              console.log('Parsed time successfully:', format(newTime, 'HH:mm'));
            }
          }
        } else {
          console.warn('Time string does not contain a colon:', reminder.time);
        }
      } else {
        console.warn('Reminder has no valid time property or it is empty');
      }
      
      setTime(newTime);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      // Use a safe fallback
      setTime(new Date());
      setDialogOpen(true);
      showSnackbar('There was a problem editing this reminder', 'warning');
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    setDialogOpen(false);
    setEditingReminder(null);
    setName('');
    setDosage('');
    setTime(new Date());
  };
  
  // Test notification function
  const testNotification = () => {
    const testReminder: Reminder = {
      _id: 'test',
      name: 'Test Medicine',
      dosage: 'Test Dose',
      time: format(new Date(), 'HH:mm')
    };
    showNotification(testReminder);
  };

  // Debug function to show current state
  const debugState = () => {
    console.log('Current state:', {
      reminders,
      loading,
      error,
      dialogOpen,
      editingReminder,
      name,
      dosage,
      time: format(time, 'HH:mm')
    });
    showSnackbar('Debug info logged to console', 'info');
  };

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Medicine Reminders</Typography>
        <Box>
          <Button
            variant="outlined"
            color="secondary"
            onClick={testNotification}
            sx={{ mr: 1 }}
          >
            Test Notification
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDialogOpen(true)}
          >
            Add Reminder
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ mb: 3 }}>
        <List>
          {loading ? (
            <ListItem>
              <ListItemText primary="Loading reminders..." />
            </ListItem>
          ) : reminders.length > 0 ? (
            reminders.map((reminder) => (
              <ListItem
                key={reminder._id}
                secondaryAction={
                  <Box>
                    <IconButton 
                      edge="end" 
                      onClick={() => handleEdit(reminder)} 
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      onClick={() => handleDelete(reminder._id)} 
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
                divider
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {reminder.name}
                    </Typography>
                  }
                  secondary={
                    <Box component="span">
                      <Typography component="span" color="text.primary">
                        {reminder.dosage}
                      </Typography>
                      {reminder.time && (
                        <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                          at {reminder.time}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No reminders set"
                secondary="Click 'Add Reminder' to create one"
              />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Debug button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button 
          variant="outlined" 
          color="info" 
          size="small"
          onClick={debugState}
        >
          Debug State
        </Button>
      </Box>

      {/* Add/Edit Reminder Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleClose} 
        fullWidth 
        maxWidth="sm"
        aria-labelledby="reminder-dialog-title"
        disableScrollLock // Add this to prevent focus issues
      >
        <DialogTitle id="reminder-dialog-title">
          {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Medicine Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              fullWidth
              required
              placeholder="e.g., 1 tablet, 5ml, etc."
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Reminder Time"
                value={time}
                onChange={(newValue) => {
                  if (newValue && !isNaN(newValue.getTime())) {
                    setTime(newValue);
                  }
                }}
                ampm={false}
                views={['hours', 'minutes']}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!name || !dosage}
          >
            {editingReminder ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Hidden audio element for testing */}
      <audio id="notification-sound" src="/notification.mp3" preload="auto" />
    </Box>
  );
};

export default MedicineReminders;