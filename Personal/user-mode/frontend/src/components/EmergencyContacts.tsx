import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Send as SendIcon
} from '@mui/icons-material';

interface Contact {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
}

const EmergencyContacts: React.FC = () => {
  const { getAuthAxios } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);  // Initialize as empty array
  const [open, setOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Contact>({
    id: '',
    name: '',
    phone: '',
    email: '',
    relationship: '',
    isPrimary: false
  });
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [simulationDialog, setSimulationDialog] = useState(false);
  const [simulationType, setSimulationType] = useState<'normal' | 'abnormal'>('normal');

  const fetchContacts = useCallback(async () => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/emergency-contacts');
      
      // More defensive handling
      if (Array.isArray(response.data)) {
        setContacts(response.data);
      } else if (response.data && Array.isArray(response.data.contacts)) {
        setContacts(response.data.contacts);
      } else {
        console.error('Unexpected API response format:', response.data);
        setContacts([]); // Ensure contacts is always an array
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]); // Empty array on error
      setAlert({
        open: true,
        message: 'Failed to fetch contacts',
        severity: 'error'
      });
    }
  }, [getAuthAxios]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpen = (contact?: Contact) => {
    if (contact) {
      setCurrentContact(contact);
      setNewContact(contact);
    } else {
      setCurrentContact(null);
      setNewContact({
        id: '',
        name: '',
        phone: '',
        email: '',
        relationship: '',
        isPrimary: false
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentContact(null);
    setNewContact({
      id: '',
      name: '',
      phone: '',
      email: '',
      relationship: '',
      isPrimary: false
    });
  };

  const handleSave = async () => {
    try {
      const authAxios = getAuthAxios();
      if (currentContact) {
        await authAxios.put(`/api/emergency-contacts/${currentContact.id}`, newContact);
        setAlert({
          open: true,
          message: 'Contact updated successfully',
          severity: 'success'
        });
      } else {
        await authAxios.post('/api/emergency-contacts', newContact);
        setAlert({
          open: true,
          message: 'Contact added successfully',
          severity: 'success'
        });
      }
      handleClose();
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      setAlert({
        open: true,
        message: 'Failed to save contact',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) {
      setAlert({
        open: true,
        message: 'Cannot delete contact: Invalid ID',
        severity: 'error'
      });
      return;
    }

    try {
      const authAxios = getAuthAxios();
      await authAxios.delete(`/api/emergency-contacts/${id}`);
      setAlert({
        open: true,
        message: 'Contact deleted successfully',
        severity: 'success'
      });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setAlert({
        open: true,
        message: 'Failed to delete contact',
        severity: 'error'
      });
    }
  };

  const handleSimulate = async () => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/simulate', {
        type: simulationType
      });
      
      setAlert({
        open: true,
        message: response.data.message,
        severity: 'success'
      });
      
      setSimulationDialog(false);
    } catch (error) {
      console.error('Error simulating condition:', error);
      setAlert({
        open: true,
        message: 'Failed to simulate condition',
        severity: 'error'
      });
    }
  };

  const validatePhoneNumber = (phone: string) => {
    // Basic phone number validation (can be customized based on requirements)
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Emergency Contacts
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Contact List</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Add Contact
              </Button>
            </Box>
            
            <List>
              {contacts && Array.isArray(contacts) && contacts.length > 0 ? (
                contacts.map((contact) => (
                  <React.Fragment key={contact._id || contact.id || Math.random().toString()}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{contact.name}</Typography>
                            {contact.isPrimary && (
                              <Chip
                                size="small"
                                label="Primary"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span">
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              <PhoneIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {contact.phone}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              <EmailIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {contact.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {contact.relationship}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => handleOpen(contact)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton edge="end" onClick={() => handleDelete(contact._id || contact.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No contacts available" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Emergency Simulation
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Test the emergency notification system by simulating normal or abnormal health conditions.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<WarningIcon />}
                onClick={() => {
                  setSimulationType('abnormal');
                  setSimulationDialog(true);
                }}
              >
                Simulate Abnormal
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentContact ? 'Edit Contact' : 'Add New Contact'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              margin="normal"
              error={!validatePhoneNumber(newContact.phone) && newContact.phone !== ''}
              helperText={!validatePhoneNumber(newContact.phone) && newContact.phone !== '' ? 'Please enter a valid phone number' : ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Relationship"
              value={newContact.relationship}
              onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newContact.isPrimary}
                  onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                  color="primary"
                />
              }
              label="Set as Primary Contact"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!newContact.name || !newContact.phone || !validatePhoneNumber(newContact.phone)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={simulationDialog}
        onClose={() => setSimulationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Simulation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to simulate an {simulationType} condition? This will trigger the emergency notification system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSimulate}
            variant="contained"
            color={simulationType === 'abnormal' ? 'error' : 'primary'}
            startIcon={<SendIcon />}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmergencyContacts;