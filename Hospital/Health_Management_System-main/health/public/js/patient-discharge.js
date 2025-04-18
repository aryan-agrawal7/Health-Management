document.addEventListener('DOMContentLoaded', function() {
  const dischargeBtn = document.getElementById('dischargePatientBtn');
  const cancelBtn = document.getElementById('cancelDischargeBtn');
  const modal = document.getElementById('dischargeModal');

  // Show modal when clicking discharge button
  if (dischargeBtn) {
    dischargeBtn.addEventListener('click', function() {
      modal.style.display = 'block';
    });
  }

  // Hide modal when clicking cancel
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }

  // Close modal when clicking outside of it
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
