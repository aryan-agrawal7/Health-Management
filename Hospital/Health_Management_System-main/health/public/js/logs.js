document.addEventListener('DOMContentLoaded', function() {
  // Initial setup
  setupDateFormatting();
  
  // Apply initial filter (show all logs)
  filterLogs();
  
  // Add event listener to filter dropdown
  document.getElementById('actionFilter').addEventListener('change', filterLogs);
});

function filterLogs() {
  const filter = document.getElementById('actionFilter').value;
  const rows = document.querySelectorAll('#logsTable tbody tr');
  
  rows.forEach(row => {
    const actionType = row.getAttribute('data-action');
    
    if (filter === 'all' || actionType === filter) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function setupDateFormatting() {
  // Format dates in a more readable way
  const dateCells = document.querySelectorAll('#logsTable tbody tr td:first-child');
  
  dateCells.forEach(cell => {
    const timestamp = cell.textContent.trim();
    
    try {
      const date = new Date(timestamp);
      
      if (!isNaN(date.getTime())) {
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        cell.textContent = formattedDate;
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
  });
}
