(function () {
  // Elements
  const accountName = document.getElementById('account-name');
  const accountEmail = document.getElementById('account-email');
  const accountProvider = document.getElementById('account-provider');
  const personalEmail = document.getElementById('personal-email');
  const personalProviderBadge = document.getElementById('personal-provider-badge');

  const nameInput = document.getElementById('name-input');
  const ageInput = document.getElementById('age-input');
  const purposeSelect = document.getElementById('purpose-select');
  const purposeCustomWrapper = document.getElementById('purpose-custom-wrapper');
  const purposeCustomInput = document.getElementById('purpose-custom-input');
  const durationHours = document.getElementById('default-duration-hours');
  const durationMinutes = document.getElementById('default-duration-minutes');
  const phoneInput = document.getElementById('phone-input');

  const profileForm = document.getElementById('profile-form');
  const personalForm = document.getElementById('personal-form');
  const saveStatus = document.getElementById('save-status');
  const personalSaveStatus = document.getElementById('personal-save-status');

  // Tabs & Views
  const tabProfileBtn = document.getElementById('tab-profile-btn');
  const tabPersonalBtn = document.getElementById('tab-personal-btn');
  const viewProfile = document.getElementById('view-profile');
  const viewPersonal = document.getElementById('view-personal');
  const openPersonalBtn = document.getElementById('open-personal-btn');
  const backToProfileBtn = document.getElementById('back-to-profile-btn');
  const backBtnSecondary = document.getElementById('back-btn-secondary');

  const standardPurposes = [
    'Deep work & distraction-free study',
    'Exam & coursework preparation',
    'Building a sustainable daily routine',
    'Balancing projects and academic deadlines',
    'Overcoming procrastination & burnout'
  ];

  function showView(view) {
    if (view === 'personal') {
      if (viewProfile) viewProfile.hidden = true;
      if (viewPersonal) viewPersonal.hidden = false;
      if (tabProfileBtn) tabProfileBtn.classList.remove('active');
      if (tabPersonalBtn) tabPersonalBtn.classList.add('active');
      window.location.hash = 'personal';
    } else {
      if (viewPersonal) viewPersonal.hidden = true;
      if (viewProfile) viewProfile.hidden = false;
      if (tabPersonalBtn) tabPersonalBtn.classList.remove('active');
      if (tabProfileBtn) tabProfileBtn.classList.add('active');
      if (window.location.hash === '#personal') {
        history.replaceState(null, '', window.location.pathname);
      }
    }
  }

  if (tabProfileBtn) tabProfileBtn.addEventListener('click', () => showView('profile'));
  if (tabPersonalBtn) tabPersonalBtn.addEventListener('click', () => showView('personal'));
  if (openPersonalBtn) openPersonalBtn.addEventListener('click', () => showView('personal'));
  if (backToProfileBtn) backToProfileBtn.addEventListener('click', () => showView('profile'));
  if (backBtnSecondary) backBtnSecondary.addEventListener('click', () => showView('profile'));

  // Handle purpose selection change
  if (purposeSelect) {
    purposeSelect.addEventListener('change', () => {
      if (purposeSelect.value === '__custom__') {
        if (purposeCustomWrapper) purposeCustomWrapper.style.display = 'block';
        if (purposeCustomInput) purposeCustomInput.focus();
      } else {
        if (purposeCustomWrapper) purposeCustomWrapper.style.display = 'none';
      }
    });
  }

  // 1. Live update header and nav pill as user types their name
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const typed = nameInput.value.trim();
      if (accountName) accountName.textContent = typed || 'Renounce User';
      const pill = document.getElementById('account-pill');
      if (pill && typed) {
        pill.textContent = typed;
        pill.style.display = 'inline-flex';
      }
    });
  }

  // 2. Synchronous initialization from localStorage to eliminate "Renounce User" flash
  try {
    const cached = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
    if (cached.name) {
      if (accountName) accountName.textContent = cached.name;
      if (nameInput) nameInput.value = cached.name;
      const pill = document.getElementById('account-pill');
      if (pill) {
        pill.textContent = cached.name;
        pill.style.display = 'inline-flex';
      }
    }
    if (cached.email) {
      if (accountEmail) accountEmail.textContent = cached.email;
      if (personalEmail) personalEmail.value = cached.email;
    }
    if (cached.age !== undefined && cached.age !== null && cached.age !== '' && ageInput) {
      ageInput.value = cached.age;
    }
    if (cached.purpose && purposeSelect) {
      if (standardPurposes.includes(cached.purpose)) {
        purposeSelect.value = cached.purpose;
      } else {
        purposeSelect.value = '__custom__';
        if (purposeCustomWrapper) purposeCustomWrapper.style.display = 'block';
        if (purposeCustomInput) purposeCustomInput.value = cached.purpose;
      }
    }
    if (cached.phone && phoneInput) {
      phoneInput.value = cached.phone;
    }
    if (cached.defaultDuration) {
      const defaultMinutes = Number(cached.defaultDuration);
      if (durationHours) durationHours.value = Math.floor(defaultMinutes / 60);
      if (durationMinutes) durationMinutes.value = defaultMinutes % 60;
    }
  } catch (_) {}

  function populateUserData(user) {
    if (!user) return;
    const displayName = user.name || (nameInput ? nameInput.value.trim() : '') || 'Renounce User';
    if (accountName) accountName.textContent = displayName;
    if (user.email) {
      if (accountEmail) accountEmail.textContent = user.email;
      if (personalEmail) personalEmail.value = user.email;
    }

    const provider = user.googleId ? 'Google' : 'email';
    if (accountProvider) accountProvider.textContent = provider;
    if (personalProviderBadge) personalProviderBadge.textContent = user.googleId ? 'Google Account' : 'Email & Password';

    if (user.name && nameInput) {
      nameInput.value = user.name;
    }
    const userAge = user.age !== null && user.age !== undefined
      ? user.age
      : (user.preferences?.age !== undefined && user.preferences?.age !== null ? user.preferences.age : null);
    if (userAge !== null && userAge !== undefined && userAge !== '' && ageInput) {
      ageInput.value = userAge;
    }
    const userPhone = user.phone || user.preferences?.phone || '';
    if (userPhone && phoneInput) {
      phoneInput.value = userPhone;
    }

    // Purpose
    const userPurpose = user.purpose || user.preferences?.purpose || '';
    if (purposeSelect) {
      if (standardPurposes.includes(userPurpose)) {
        purposeSelect.value = userPurpose;
        if (purposeCustomWrapper) purposeCustomWrapper.style.display = 'none';
        if (purposeCustomInput) purposeCustomInput.value = '';
      } else if (userPurpose) {
        purposeSelect.value = '__custom__';
        if (purposeCustomWrapper) purposeCustomWrapper.style.display = 'block';
        if (purposeCustomInput) purposeCustomInput.value = userPurpose;
      }
    }

    if (user.preferences?.defaultDuration) {
      const defaultMinutes = Number(user.preferences.defaultDuration);
      if (durationHours) durationHours.value = Math.floor(defaultMinutes / 60);
      if (durationMinutes) durationMinutes.value = defaultMinutes % 60;
    }

    // Sync into localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
      localStorage.setItem('renounce_profile', JSON.stringify({
        ...existing,
        name: user.name || existing.name,
        email: user.email || existing.email,
        age: userAge ?? existing.age,
        purpose: userPurpose || existing.purpose,
        phone: userPhone || existing.phone,
        defaultDuration: user.preferences?.defaultDuration ?? existing.defaultDuration
      }));
    } catch (_) {}

    // Also update nav account-pill
    const pill = document.getElementById('account-pill');
    if (pill) {
      pill.textContent = user.name || user.email || displayName;
      pill.style.display = 'inline-flex';
    }
  }

  // Check hash for initial tab
  if (window.location.hash === '#personal') {
    showView('personal');
  }

  // Save Profile Form
  if (profileForm) {
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const currentName = (nameInput ? nameInput.value.trim() : '') || 'Renounce User';
      if (accountName) accountName.textContent = currentName;
      const pill = document.getElementById('account-pill');
      if (pill && nameInput && nameInput.value.trim()) {
        pill.textContent = nameInput.value.trim();
        pill.style.display = 'inline-flex';
      }

      if (saveStatus) saveStatus.textContent = 'Saving...';

      let selectedPurpose = purposeSelect ? purposeSelect.value : '';
      if (selectedPurpose === '__custom__' && purposeCustomInput) {
        selectedPurpose = purposeCustomInput.value.trim();
      }

      const parsedAge = ageInput && ageInput.value.trim() !== '' ? Number(ageInput.value) : null;
      const durationTotal = Number(durationHours?.value || 0) * 60 + Number(durationMinutes?.value || 0);

      // Save immediately to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
        localStorage.setItem('renounce_profile', JSON.stringify({
          ...existing,
          name: nameInput ? nameInput.value.trim() : '',
          age: parsedAge,
          purpose: selectedPurpose,
          defaultDuration: durationTotal
        }));
      } catch (_) {}

      const payload = {
        name: nameInput ? nameInput.value.trim() : '',
        age: parsedAge,
        purpose: selectedPurpose,
        preferences: {
          name: nameInput ? nameInput.value.trim() : '',
          age: parsedAge,
          purpose: selectedPurpose,
          defaultDuration: durationTotal
        }
      };

      try {
        const res = await apiFetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updated = await res.json();
          populateUserData(updated);
          if (saveStatus) saveStatus.textContent = 'Changes saved successfully.';
          setTimeout(() => {
            if (saveStatus && saveStatus.textContent === 'Changes saved successfully.') {
              saveStatus.textContent = '';
            }
          }, 3500);
        } else {
          if (res.status === 401) {
            if (saveStatus) saveStatus.innerHTML = '<span style="color: var(--ink);">Saved locally. Session expired — <a href="login.html" style="text-decoration: underline; font-weight: 600;">log in to sync with server →</a></span>';
          } else {
            const errData = await res.json().catch(() => ({}));
            if (saveStatus) saveStatus.textContent = errData.error || `Saved locally. (Server status: ${res.status})`;
          }
        }
      } catch (err) {
        if (saveStatus) saveStatus.textContent = 'Saved locally. (Server offline or restarting)';
      }
    });
  }

  // Save Personal Form (Mobile number)
  if (personalForm) {
    personalForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (personalSaveStatus) personalSaveStatus.textContent = 'Saving...';

      const phoneVal = phoneInput ? phoneInput.value.trim() : '';

      // Save immediately to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('renounce_profile') || '{}');
        existing.phone = phoneVal;
        localStorage.setItem('renounce_profile', JSON.stringify(existing));
      } catch (_) {}

      const payload = {
        phone: phoneVal,
        preferences: {
          phone: phoneVal
        }
      };

      try {
        const res = await apiFetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updated = await res.json();
          populateUserData(updated);
          if (personalSaveStatus) personalSaveStatus.textContent = 'Personal details saved.';
          setTimeout(() => {
            if (personalSaveStatus && personalSaveStatus.textContent === 'Personal details saved.') {
              personalSaveStatus.textContent = '';
            }
          }, 3500);
        } else {
          if (res.status === 401) {
            if (personalSaveStatus) personalSaveStatus.innerHTML = '<span style="color: var(--ink);">Saved locally. Session expired — <a href="login.html" style="text-decoration: underline; font-weight: 600;">log in to sync with server →</a></span>';
          } else {
            const errData = await res.json().catch(() => ({}));
            if (personalSaveStatus) personalSaveStatus.textContent = errData.error || `Saved locally. (Server status: ${res.status})`;
          }
        }
      } catch (err) {
        if (personalSaveStatus) personalSaveStatus.textContent = 'Saved locally. (Server offline or restarting)';
      }
    });
  }

  // Log out handlers
  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('renounce_profile');
    window.location.href = 'index.html';
  }

  const logoutBtn = document.getElementById('logout-btn');
  const logoutBtnPersonal = document.getElementById('logout-btn-personal');
  const logoutBtnSide = document.getElementById('logout-btn-side');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (logoutBtnPersonal) logoutBtnPersonal.addEventListener('click', handleLogout);
  if (logoutBtnSide) logoutBtnSide.addEventListener('click', handleLogout);

  // Fetch User Info in background to synchronize with server
  (async function fetchCurrentUser() {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        populateUserData(user);
      } else if (res.status === 401 && saveStatus) {
        saveStatus.innerHTML = 'Not signed in. <a href="login.html" style="color: var(--ink); text-decoration: underline; font-weight: 600;">Sign in to sync your profile →</a>';
      }
    } catch (err) {
      // Offline or local preview
    }
  })();
})();

