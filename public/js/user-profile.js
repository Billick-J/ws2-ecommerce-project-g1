document.addEventListener('DOMContentLoaded', () => {
  const editBtn = document.getElementById('edit-info-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const form = document.getElementById('account-form');
  const displayDiv = document.getElementById('display-info');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      form.style.display = 'block';
      displayDiv.style.display = 'none';
      editBtn.style.display = 'none';
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.style.display = 'none';
      displayDiv.style.display = 'block';
      editBtn.style.display = 'inline-block';
    });
  }
});
