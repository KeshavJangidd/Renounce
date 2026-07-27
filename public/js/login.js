
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const nameField = document.getElementById('name-field');
        const authHeading = document.getElementById('auth-heading');
        const authCopy = document.getElementById('auth-copy');
        const authHint = document.getElementById('auth-hint');
        const authSuccess = document.getElementById('auth-success');
        const emailError = document.getElementById('email-error');
        const passwordError = document.getElementById('password-error');
        const submitBtn = document.getElementById('submit-btn');
        const form = document.getElementById('auth-form');
        const errorEl = document.getElementById('auth-error');
        const googleSignIn = document.getElementById('google-sign-in');
        let mode = 'login';

        function clearFieldErrors() {
          emailError.textContent = '';
          passwordError.textContent = '';
        }

        function showError(message) {
          authSuccess.style.display = 'none';
          authSuccess.textContent = '';
          errorEl.textContent = message;
          errorEl.style.display = 'block';
        }

        function showSuccess(message) {
          errorEl.style.display = 'none';
          errorEl.textContent = '';
          authSuccess.textContent = message;
          authSuccess.style.display = 'block';
        }

        function setMode(next) {
          mode = next;
          tabLogin.classList.toggle('active', mode === 'login');
          tabSignup.classList.toggle('active', mode === 'signup');
          nameField.style.display = mode === 'signup' ? 'grid' : 'none';
          submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Log in';
          authHeading.textContent = mode === 'signup' ? 'Get started' : 'Welcome back';
          authCopy.textContent = mode === 'signup'
            ? 'Create a new Renounce account to keep your study data private and personal.'
            : 'Sign in with your email to pick up where you left off.';
          authHint.textContent = mode === 'signup'
            ? 'Have an account? Tap Welcome back and sign in.'
            : 'Forgot your details? Just start fresh — sign up again with a different email.';
          authHint.style.display = 'block';
          errorEl.style.display = 'none';
          authSuccess.style.display = 'none';
          clearFieldErrors();
        }

        function validateInputs(email, password) {
          clearFieldErrors();
          let valid = true;
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(email)) {
            emailError.textContent = 'Enter a valid email address.';
            valid = false;
          }
          if (password.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters.';
            valid = false;
          }
          return valid;
        }

        function getApiFetch() {
          return window.apiFetch || ((endpoint, options = {}) => fetch(endpoint, {
            credentials: 'include',
            ...options
          }));
        }

        tabLogin.addEventListener('click', () => setMode('login'));
        tabSignup.addEventListener('click', () => setMode('signup'));
        googleSignIn.addEventListener('click', (event) => {
          event.preventDefault();
          window.location.href = window.apiUrl ? window.apiUrl('/api/auth/google') : '/api/auth/google';
        });

        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          errorEl.style.display = 'none';
          authSuccess.style.display = 'none';
          clearFieldErrors();

          const email = document.getElementById('email-input').value.trim();
          const password = document.getElementById('password-input').value.trim();
          const name = document.getElementById('name-input').value.trim();

          if (!validateInputs(email, password)) {
            return;
          }

          const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
          const body = mode === 'signup' ? { email, password, name } : { email, password };

          try {
            const res = await getApiFetch()(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            const data = await res.json();

            if (!res.ok) {
              showError(data?.error || data?.message || `Request failed: ${res.status}`);
              return;
            }

            if (mode === 'signup') {
              showSuccess(`Welcome, ${data.name || 'there'}! Redirecting...`);
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            window.location.href = '/index.html';
          } catch (err) {
            console.error('Auth request failed:', err);
            showError(err.message || 'Network error. Try again.');
          }
        });

        setMode('login');

        const params = new URLSearchParams(window.location.search);
        if (params.get('error') === 'google') {
          showError('Google sign-in failed. Try again or use email.');
        }
      