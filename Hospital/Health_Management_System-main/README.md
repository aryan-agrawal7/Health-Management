# Hospital Monitoring System

This is an IoT-based hospital monitoring system that tracks patient data, room statuses, and vital signs in real-time.

## Features
- Add, update, and discharge patients.
- Monitor real-time vital signs (Heart Rate, SpO2, Temperature).
- View activity logs for patient actions.
- Dashboard with room statuses.

## Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/namanaggarwal76/Health_Management_System.git
   cd health
   ```
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```
4. Start the server:
   ```bash
   cd ../health
   npm start
   ```
5. In a separate terminal, run the client in development mode:
   ```bash
   cd ../client
   npm start
   ```

## Building the Client for Production
To build the client-side React app and serve it from the Express server:
```bash
cd ../client
npm run build
```
Then restart the server.

## Development
To start the server in development mode with live reload:
```bash
npm run dev
```

## Running the Client
To run the client-side React app in development mode:
```bash
cd client
npm start
```
This will start the client app with live reloading.

## Vital Signs Simulation
To simulate real-time vital signs for testing:
```bash
node utils/simulate-vitals.js
```

This script generates realistic vital sign data (heart rate, SpO2, temperature) for all occupied rooms every 5 seconds. The simulation runs continuously until stopped with Ctrl+C.

## Project Structure
```
hospital_monitoring/
├── views/          # Nunjucks templates
├── public/         # Static assets (CSS, JS, images)
├── routes/         # Express routes
├── data/           # JSON files for mock data
├── server.js       # Main server file
├── package.json    # Project metadata and dependencies
```