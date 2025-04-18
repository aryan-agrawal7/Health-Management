document.addEventListener('DOMContentLoaded', function() {
    // Adjust roomId extraction for client routes (e.g., /client/room/:id)
    const segments = window.location.pathname.split('/');
    let roomId;
    if (segments[1] === 'client') {
      roomId = segments[3];
    } else {
      roomId = segments[2];
    }
    
    const heartRateEl = document.getElementById('heartRate');
    const spo2El = document.getElementById('spo2');
    const temperatureEl = document.getElementById('temperature');
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded! Please check your script includes.');
        return;
    }
    
    // Chart setup for Heart Rate
    const heartRateCtx = document.getElementById('heartRateChart').getContext('2d');
    const heartRateChart = new Chart(heartRateCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { 
            label: 'Heart Rate', 
            data: [], 
            borderColor: 'red',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { 
            beginAtZero: false,
            title: { display: true, text: 'bpm' }
          }
        },
        animation: { duration: 500 }
      }
    });
    
    // Chart setup for SpO2
    const spo2Ctx = document.getElementById('spo2Chart').getContext('2d');
    const spo2Chart = new Chart(spo2Ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { 
            label: 'SpO2', 
            data: [], 
            borderColor: 'blue',
            backgroundColor: 'rgba(0, 0, 255, 0.1)',
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { 
            beginAtZero: false,
            min: 90,
            max: 100,
            title: { display: true, text: '%' }
          }
        },
        animation: { duration: 500 }
      }
    });
    
    // Chart setup for Temperature
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    const tempChart = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { 
            label: 'Temperature', 
            data: [], 
            borderColor: 'green',
            backgroundColor: 'rgba(0, 128, 0, 0.1)',
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { 
            beginAtZero: false,
            title: { display: true, text: '°C' }
          }
        },
        animation: { duration: 500 }
      }
    });
    
    function fetchData() {
      console.log(`Fetching data for room ${roomId}...`);
      fetch(`/api/room/${roomId}`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log('Received vital data:', data);
          if (data.currentVitals) {
            heartRateEl.textContent = data.currentVitals.heartRate.toFixed(0);
            spo2El.textContent = data.currentVitals.spo2.toFixed(0);
            temperatureEl.textContent = data.currentVitals.temperature.toFixed(1);
            heartRateEl.classList.add('updated');
            spo2El.classList.add('updated');
            temperatureEl.classList.add('updated');
            setTimeout(() => {
              heartRateEl.classList.remove('updated');
              spo2El.classList.remove('updated');
              temperatureEl.classList.remove('updated');
            }, 500);
          } else {
            console.warn('No current vitals data received');
          }
          
          // Reset charts data
          heartRateChart.data.labels = [];
          heartRateChart.data.datasets[0].data = [];
          spo2Chart.data.labels = [];
          spo2Chart.data.datasets[0].data = [];
          tempChart.data.labels = [];
          tempChart.data.datasets[0].data = [];
          
          if (data.historicalData && data.historicalData.length > 0) {
            data.historicalData.forEach((vital, index) => {
              // Use sequential labels since no timestamp is provided
              const label = `#${index + 1}`;
              heartRateChart.data.labels.push(label);
              heartRateChart.data.datasets[0].data.push(vital.heartRate);
              spo2Chart.data.labels.push(label);
              spo2Chart.data.datasets[0].data.push(vital.spo2);
              tempChart.data.labels.push(label);
              tempChart.data.datasets[0].data.push(vital.temperature);
            });
            heartRateChart.update();
            spo2Chart.update();
            tempChart.update();
          } else {
            console.warn('No historical data available for the charts');
          }
        })
        .catch(error => {
          console.error('Error fetching vital data:', error);
          heartRateEl.textContent = '--';
          spo2El.textContent = '--';
          temperatureEl.textContent = '--';
        });
    }
    
    fetchData();
    setInterval(fetchData, 5000);
});