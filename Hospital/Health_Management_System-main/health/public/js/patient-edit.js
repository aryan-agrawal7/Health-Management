document.addEventListener('DOMContentLoaded', function() {
  const editBtn = document.getElementById('editPatientBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const patientDisplay = document.getElementById('patientDisplay');
  const patientForm = document.getElementById('patientForm');

  // Show edit form when clicking edit button
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      patientDisplay.style.display = 'none';
      patientForm.style.display = 'block';
    });
  }

  // Hide form when clicking cancel
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      patientDisplay.style.display = 'block';
      patientForm.style.display = 'none';
    });
  }
});
