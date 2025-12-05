document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.querySelector('input[name="password"]');
  const requirements = {
    length: document.getElementById('req-length'),
    uppercase: document.getElementById('req-uppercase'),
    lowercase: document.getElementById('req-lowercase'),
    number: document.getElementById('req-number')
  };

  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;

    requirements.length.classList.toggle('valid', value.length >= 8);
    requirements.uppercase.classList.toggle('valid', /[A-Z]/.test(value));
    requirements.lowercase.classList.toggle('valid', /[a-z]/.test(value));
    requirements.number.classList.toggle('valid', /\d/.test(value));
  });
});
