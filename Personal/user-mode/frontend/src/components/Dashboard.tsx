import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Container,
  Alert,
  Paper
} from '@mui/material';
import {
  Favorite as HeartIcon,
  LocalHospital as HospitalIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Thermostat as ThermostatIcon,
  Air as AirIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { mqttService } from '../services/mqttService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface VitalSign {
  heartRate: number;
  temperature: number;
  spo2: number;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalSign>({
    heartRate: 75,
    temperature: 37.0,
    spo2: 98,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    const unsubscribe = mqttService.subscribe((newVitals) => {
      setVitals(newVitals);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAddContact = () => {
    navigate('/contacts');
  };

  const simulateAbnormalVitals = () => {
    setVitals({
      heartRate: 120,
      temperature: 38.5,
      spo2: 92,
      timestamp: new Date().toISOString()
    });
    setAlerts(['Abnormal heart rate detected', 'High temperature detected', 'Low SpO2 detected']);
  };

  // Mock data for the chart
  const chartData = {
    labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
    datasets: [
      {
        label: 'Heart Rate',
        data: [72, 75, 78, 76, 74, 72],
        borderColor: '#f50057',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Health Dashboard
      </Typography>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Health Alerts
          </Typography>
          {alerts.map((alert, index) => (
            <Typography key={index} variant="body2">
              {alert}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Test Button */}
      <Button
        variant="contained"
        color="secondary"
        onClick={simulateAbnormalVitals}
        sx={{ mb: 2 }}
      >
        Simulate Abnormal Vitals
      </Button>

      <Grid container spacing={3}>
        {/* Vitals Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HeartIcon color={vitals.heartRate >= 70 && vitals.heartRate <= 80 ? "error" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Heart Rate: {vitals.heartRate} BPM
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/vitals')}
              >
                View Vitals
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Temperature Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ThermostatIcon color={vitals.temperature >= 37.0 && vitals.temperature <= 37.2 ? "primary" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Temperature: {vitals.temperature}°C
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/vitals')}
              >
                View Vitals
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* SpO2 Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AirIcon color={vitals.spo2 >= 98 ? "info" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  SpO2: {vitals.spo2}%
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/vitals')}
              >
                View Vitals
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Emergency Contacts Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Emergency Contacts</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage your emergency contacts and notification settings.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddContact}
              >
                Add Contact
              </Button>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/contacts')}
              >
                View Contacts
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Medicine Reminders Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Medicine Reminders</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Set up and manage your medication reminders.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/reminders')}
              >
                View Reminders
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Emergency Services Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HospitalIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Emergency Services</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Quick access to emergency services and medical assistance.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="primary"
                onClick={() => navigate('/contacts')}
              >
                Emergency Contacts
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Heart Rate Chart */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Heart Rate Trend
        </Typography>
        <Line data={chartData} options={chartOptions} />
      </Paper>
    </Container>
  );
};

export default Dashboard; 