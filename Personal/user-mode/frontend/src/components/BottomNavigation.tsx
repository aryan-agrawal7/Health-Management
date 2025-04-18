import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Favorite,
  Contacts,
  Notifications,
} from '@mui/icons-material';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const pathToIndex: { [key: string]: number } = {
      '/': 0,
      '/vitals': 1,
      '/contacts': 2,
      '/reminders': 3,
    };
    setValue(pathToIndex[location.pathname] || 0);
  }, [location]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    const routes = ['/', '/vitals', '/contacts', '/reminders'];
    navigate(routes[newValue]);
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation value={value} onChange={handleChange}>
        <BottomNavigationAction
          label="Dashboard"
          icon={<DashboardIcon />}
        />
        <BottomNavigationAction
          label="Vitals"
          icon={<Favorite />}
        />
        <BottomNavigationAction
          label="Contacts"
          icon={<Contacts />}
        />
        <BottomNavigationAction
          label="Reminders"
          icon={<Notifications />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default Navigation; 