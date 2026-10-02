document.addEventListener('DOMContentLoaded', () => {

  // =========================================================
  // TODAY'S TARGETS
  // =========================================================
  const todayStorageKey = 'lumina-today-targets';
  let todayTargets = JSON.parse(localStorage.getItem(todayStorageKey) || 'null') || [
    {
      id: 1,
      priority: 'high',
      time: '45 mins',
      title: 'Machine Learning Basics',
      desc: 'Chapter 3: Gradient Descent and Loss Functions',
      completed: false
    },
    {
      id: 2,
      priority: 'med',
      time: null,
      title: 'Data Structures',
      desc: 'Review Binary Trees implementations',
      completed: true
    }
  ];

  const todayColumn = document.querySelector('.column:nth-of-type(1)');
  // Find the container just after the column-header (where cards live)
  const todayHeader = todayColumn.querySelector('.column-header');

  function saveTodayTargets() {
    localStorage.setItem(todayStorageKey, JSON.stringify(todayTargets));
  }

  function priorityTagLabel(priority) {
    if (priority === 'high') return { cls: 'tag-high', label: 'High Priority' };
    if (priority === 'med') return { cls: 'tag-med', label: 'Med Priority' };
    return { cls: 'tag-low', label: 'Low Priority' };
  }

  function renderTodayTargets() {
    // Remove all existing target-card elements in this column
    todayColumn.querySelectorAll('.target-card').forEach(card => card.remove());

    todayTargets.forEach(target => {
      const card = document.createElement('article');
      card.className = 'target-card' + (target.priority === 'high' && !target.completed ? ' priority-high' : '') + (target.completed ? ' completed' : '');

      const tag = priorityTagLabel(target.priority);

      if (target.completed) {
        card.innerHTML = `
          <div class="card-top">
            <div>
              <div class="tag-row"><span class="tag ${tag.cls}">${tag.label}</span></div>
              <h3 class="strike">${target.title}</h3>
            </div>
            <span class="material-symbols-outlined check-icon filled">check_circle</span>
          </div>
          <p class="card-desc strike">${target.desc}</p>
        `;
      } else {
        card.innerHTML = `
          <div class="card-top">
            <div>
              <div class="tag-row">
                <span class="tag ${tag.cls}">${tag.label}</span>
                ${target.time ? `<span class="meta"><span class="material-symbols-outlined">schedule</span>${target.time}</span>` : ''}
              </div>
              <h3>${target.title}</h3>
            </div>
            <div class="card-actions">
              <button class="icon-btn small edit-today-btn" title="Edit"><span class="material-symbols-outlined">edit</span></button>
              <button class="icon-btn small delete-today-btn" title="Delete"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>
          <p class="card-desc">${target.desc}</p>
          <button class="btn btn-outline btn-full complete-today-btn">
            <span class="material-symbols-outlined">check_circle</span>Mark as completed
          </button>
        `;
      }

      // Wire up buttons for this card
      const editBtn = card.querySelector('.edit-today-btn');
      const deleteBtn = card.querySelector('.delete-today-btn');
      const completeBtn = card.querySelector('.complete-today-btn');

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          const newTitle = prompt('Edit target title:', target.title);
          if (newTitle && newTitle.trim() !== '') {
            target.title = newTitle.trim();
            const newDesc = prompt('Edit description:', target.desc);
            if (newDesc !== null) target.desc = newDesc.trim();
            saveTodayTargets();
            renderTodayTargets();
          }
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Delete "${target.title}"?`)) {
            todayTargets = todayTargets.filter(t => t.id !== target.id);
            saveTodayTargets();
            renderTodayTargets();
          }
        });
      }

      if (completeBtn) {
        completeBtn.addEventListener('click', () => {
          target.completed = true;
          saveTodayTargets();
          renderTodayTargets();
        });
      }

      todayColumn.appendChild(card);
    });
  }

  document.getElementById('addTodayBtn').addEventListener('click', () => {
    const title = prompt("Enter today's target title:");
    if (!title || title.trim() === '') return;
    const desc = prompt('Enter a short description (optional):') || '';
    const time = prompt('Estimated time (e.g. "30 mins", optional):') || null;
    const priorityInput = (prompt('Priority: type "high", "med", or "low"', 'med') || 'med').toLowerCase();
    const priority = ['high', 'med', 'low'].includes(priorityInput) ? priorityInput : 'med';

    todayTargets.push({
      id: Date.now(),
      priority,
      time,
      title: title.trim(),
      desc: desc.trim(),
      completed: false
    });
    saveTodayTargets();
    renderTodayTargets();
  });

  renderTodayTargets();

  // =========================================================
  // WEEKLY TARGETS
  // =========================================================
  const weeklyStorageKey = 'lumina-weekly-targets';
  let weeklyTargets = JSON.parse(localStorage.getItem(weeklyStorageKey) || 'null') || [];

  const weeklyColumn = document.querySelector('.column:nth-of-type(2)');
  const weeklyEmptyState = weeklyColumn.querySelector('.empty-state');

  function saveWeeklyTargets() {
    localStorage.setItem(weeklyStorageKey, JSON.stringify(weeklyTargets));
  }

  function renderWeeklyTargets() {
    // Remove any dynamically-added weekly cards (keep the ethics card and empty state untouched)
    weeklyColumn.querySelectorAll('.target-card.dynamic-weekly').forEach(card => card.remove());

    weeklyEmptyState.style.display = weeklyTargets.length === 0 ? 'flex' : 'none';

    weeklyTargets.forEach(target => {
      const card = document.createElement('article');
      card.className = 'target-card dynamic-weekly';
      const tag = priorityTagLabel(target.priority);

      card.innerHTML = `
        <div class="card-top">
          <div>
            <span class="tag ${tag.cls}">${tag.label}</span>
            <h3>${target.title}</h3>
          </div>
          <div class="card-actions">
            <button class="icon-btn small delete-weekly-btn" title="Delete"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </div>
        <p class="card-desc">${target.desc}</p>
      `;

      card.querySelector('.delete-weekly-btn').addEventListener('click', () => {
        if (confirm(`Delete "${target.title}"?`)) {
          weeklyTargets = weeklyTargets.filter(t => t.id !== target.id);
          saveWeeklyTargets();
          renderWeeklyTargets();
        }
      });

      // Insert before the ethics card so weekly items sit above it
      weeklyColumn.insertBefore(card, document.getElementById('ethicsCard'));
    });
  }

  document.getElementById('addWeeklyBtn').addEventListener('click', () => {
    const title = prompt('Enter a weekly target title:');
    if (!title || title.trim() === '') return;
    const desc = prompt('Enter a short description (optional):') || '';
    const priorityInput = (prompt('Priority: type "high", "med", or "low"', 'low') || 'low').toLowerCase();
    const priority = ['high', 'med', 'low'].includes(priorityInput) ? priorityInput : 'low';

    weeklyTargets.push({
      id: Date.now(),
      priority,
      title: title.trim(),
      desc: desc.trim()
    });
    saveWeeklyTargets();
    renderWeeklyTargets();
  });

  renderWeeklyTargets();

  // =========================================================
  // ETHICS PAPERS CHECKLIST (your original logic, unchanged)
  // =========================================================
  const checklist = document.querySelectorAll('#ethicsChecklist .paper-check');
  const progressText = document.getElementById('ethicsProgressText');
  const progressFill = document.getElementById('ethicsProgressFill');
  const ethicsStorageKey = 'lumina-ethics-progress';

  const saved = JSON.parse(localStorage.getItem(ethicsStorageKey) || 'null');
  if (saved) {
    checklist.forEach(cb => {
      if (saved[cb.dataset.paper] !== undefined) cb.checked = saved[cb.dataset.paper];
    });
  }

  function updateEthicsProgress() {
    const total = checklist.length;
    const completed = Array.from(checklist).filter(cb => cb.checked).length;

    progressText.textContent = `${completed} / ${total} completed`;
    progressFill.style.width = `${(completed / total) * 100}%`;

    const state = {};
    checklist.forEach(cb => state[cb.dataset.paper] = cb.checked);
    localStorage.setItem(ethicsStorageKey, JSON.stringify(state));
  }

  checklist.forEach(cb => cb.addEventListener('change', updateEthicsProgress));
  updateEthicsProgress();

});