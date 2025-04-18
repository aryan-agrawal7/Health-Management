import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Container
} from '@mui/material';
import {
  Favorite as HeartIcon,
  Thermostat as ThermostatIcon,
  Air as AirIcon,
  Refresh as RefreshIcon
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

// Register ChartJS components
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

const Vitals: React.FC = () => {
  const [vitals, setVitals] = useState<VitalSign>({
    heartRate: 75,
    temperature: 37.0,
    spo2: 98,
    timestamp: new Date().toISOString()
  });
  const [vitalsHistory, setVitalsHistory] = useState<VitalSign[]>([]);

  useEffect(() => {
    const unsubscribe = mqttService.subscribe((newVitals) => {
      setVitals(newVitals);
      setVitalsHistory(prev => [...prev, newVitals].slice(-10));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const chartData = {
    labels: vitalsHistory.map(v => new Date(v.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Heart Rate (BPM)',
        data: vitalsHistory.map(v => v.heartRate),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Temperature (°C)',
        data: vitalsHistory.map(v => v.temperature),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      },
      {
        label: 'SpO2 (%)',
        data: vitalsHistory.map(v => v.spo2),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Vital Signs
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Heart Rate Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HeartIcon color={vitals.heartRate >= 70 && vitals.heartRate <= 80 ? "error" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Heart Rate: {vitals.heartRate} BPM
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Normal range: 70-80 BPM
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Temperature Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ThermostatIcon color={vitals.temperature >= 37.0 && vitals.temperature <= 37.2 ? "primary" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Temperature: {vitals.temperature}°C
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Normal range: 37.0-37.2°C
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* SpO2 Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AirIcon color={vitals.spo2 >= 98 ? "info" : "warning"} />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  SpO2: {vitals.spo2}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Normal range: 98-100%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Vital Signs History
            </Typography>
            <Line data={chartData} options={chartOptions} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Vitals; 