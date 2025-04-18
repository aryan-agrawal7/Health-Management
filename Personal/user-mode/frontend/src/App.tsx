import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import Vitals from './components/Vitals';
import EmergencyContacts from './components/EmergencyContacts';
import MedicineReminders from './components/MedicineReminders';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/vitals" element={<PrivateRoute><Vitals /></PrivateRoute>} />
            <Route path="/contacts" element={<PrivateRoute><EmergencyContacts /></PrivateRoute>} />
            <Route path="/reminders" element={<PrivateRoute><MedicineReminders /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 