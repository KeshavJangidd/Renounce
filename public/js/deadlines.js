(function () {
  const form = document.getElementById('deadline-form');
  const titleInput = document.getElementById('deadline-title');
  const dateInput = document.getElementById('deadline-date');
  const categorySelect = document.getElementById('deadline-category');
  const hiddenId = document.getElementById('deadline-id');
  const cancelButton = document.getElementById('cancel-edit');
  const list = document.getElementById('deadline-list');

  async function fetchDeadlines() {
    const res = await fetch('/api/deadlines');
    return res.json();
  }

  async function createDeadline(payload) {
    const res = await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async function updateDeadline(id, payload) {
    const res = await fetch(`/api/deadlines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async function deleteDeadline(id) {
    await fetch(`/api/deadlines/${id}`, { method: 'DELETE' });
  }

  async function renderDeadlines() {
    const deadlines = (await fetchDeadlines()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    if (!deadlines.length) {
      list.innerHTML = '<div class="deadline-item">No deadlines yet. Add one above.</div>';
      return;
    }

    list.innerHTML = deadlines
      .map((deadline) => `
        <article class="deadline-item">
          <div>
            <strong>${deadline.title}</strong>
            <div class="muted">${new Date(deadline.dueDate).toLocaleDateString()} · ${deadline.category}</div>
          </div>
          <div class="deadline-actions">
            <button class="btn btn-secondary" type="button" data-action="toggle" data-id="${deadline.id}">${deadline.isCompleted ? 'Undo' : 'Done'}</button>
            <button class="btn btn-secondary" type="button" data-action="edit" data-id="${deadline.id}">Edit</button>
            <button class="btn btn-ghost" type="button" data-action="delete" data-id="${deadline.id}">Delete</button>
          </div>
        </article>
      `)
      .join('');
  }

  function resetForm() {
    form.reset();
    hiddenId.value = '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: titleInput.value.trim(),
      dueDate: dateInput.value,
      category: categorySelect.value
    };

    if (hiddenId.value) {
      await updateDeadline(hiddenId.value, payload);
    } else {
      await createDeadline(payload);
    }

    resetForm();
    renderDeadlines();
  });

  cancelButton.addEventListener('click', resetForm);

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (action === 'delete') {
      await deleteDeadline(id);
      renderDeadlines();
      return;
    }

    if (action === 'edit') {
      const deadlines = await fetchDeadlines();
      const target = deadlines.find((entry) => entry.id === id);
      if (!target) return;
      hiddenId.value = target.id;
      titleInput.value = target.title;
      dateInput.value = target.dueDate;
      categorySelect.value = target.category;
      return;
    }

    if (action === 'toggle') {
      const deadlines = await fetchDeadlines();
      const target = deadlines.find((entry) => entry.id === id);
      if (!target) return;
      await updateDeadline(id, { isCompleted: !target.isCompleted });
      renderDeadlines();
    }
  });

  document.addEventListener('DOMContentLoaded', renderDeadlines);
})();