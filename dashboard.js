
document.addEventListener('DOMContentLoaded', function () {
  // ===== Profile dropdown =====
  const avatarToggle = document.getElementById('avatarToggle');
  const avatarDropdown = document.getElementById('avatarDropdown');

  if (avatarToggle && avatarDropdown) {
    function closeDropdown() {
      avatarDropdown.classList.remove('show');
      avatarToggle.setAttribute('aria-expanded', 'false');
    }

    avatarToggle.addEventListener('click', function (event) {
      event.stopPropagation();
      const isOpen = avatarDropdown.classList.toggle('show');
      avatarToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (event) {
      if (!avatarDropdown.contains(event.target) && !avatarToggle.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeDropdown();
        avatarToggle.focus();
      }
    });
  }

  // ===== Load saved profile =====
  let profile = null;

  try {
    profile = JSON.parse(localStorage.getItem('luminaProfile') || 'null');
  } catch (error) {
    console.error('Unable to read saved Lumina profile:', error);
  }

  const welcomeName = document.getElementById('welcomeName');
  const currentCourse = document.getElementById('currentCourse');
  const currentSemester = document.getElementById('currentSemester');
  const subjectCount = document.getElementById('subjectCount');
  const subjectGrid = document.getElementById('subjectGrid');
  const progressList = document.getElementById('subjectProgressList');

  if (!profile) {
    if (subjectGrid) {
      subjectGrid.textContent = 'Complete your profile to add and track your subjects.';
    }

    if (progressList) {
      progressList.textContent = 'Complete your profile to start tracking progress.';
    }

    return;
  }

  const name = String(profile.fullName || '').trim();
  const course = String(profile.course || '').trim();
  const semester = profile.semester ? String(profile.semester) : '';

  const subjects = Array.isArray(profile.subjects)
    ? profile.subjects
        .filter(subject => typeof subject === 'string')
        .map(subject => subject.trim())
        .filter(Boolean)
    : [];

  if (welcomeName && name) {
    welcomeName.textContent = name;
  }

  if (currentCourse) {
    currentCourse.textContent = `🎓 ${course || 'Degree not set'}`;
  }

  if (currentSemester) {
    currentSemester.textContent = semester
      ? `📚 Current Semester: ${semester}`
      : '📚 Current Semester: Not set';
  }

  if (subjectCount) {
    subjectCount.textContent = `📝 Subjects: ${subjects.length}`;
  }

  // ===== Subject cards =====
  if (subjectGrid) {
    subjectGrid.replaceChildren();

    if (subjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';

      const icon = document.createElement('span');
      icon.textContent = '📚';

      const message = document.createElement('p');
      message.textContent = 'No subjects added yet. Update your profile to add your subjects.';

      empty.append(icon, message);
      subjectGrid.appendChild(empty);
    } else {
      subjects.forEach(function (subject) {
        const card = document.createElement('article');
        card.className = 'subject-card';
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';

        const icon = document.createElement('div');
        icon.className = 'subject-symbol';
        icon.textContent = '📘';

        const title = document.createElement('h3');
        title.textContent = subject;

        const description = document.createElement('p');
        description.textContent = 'Open your subject learning space';

        card.append(icon, title, description);

        function openSubjectPage() {
          window.location.href =
            'subject.html?subject=' + encodeURIComponent(subject);
        }

        card.addEventListener('click', openSubjectPage);

        card.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openSubjectPage();
          }
        });

        subjectGrid.appendChild(card);
      });
    }
  }

  // ===== Compact subject-wise progress tracker =====
  const MODE_KEY = 'luminaProgressModes';
  const UNITS_KEY = 'luminaSubjectUnits';
  const PLANNER_KEY = 'luminaStudyPlannerItems';
  const OLD_TASKS_KEY = 'luminaStudyPlannerTasks';
  const OLD_EVENTS_KEY = 'luminaStudyPlannerEvents';

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');

      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return {};
    }
  }

  function saveObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save ${key}:`, error);
      alert('Progress could not be saved. Please check browser storage.');
      return false;
    }
  }

  function readPlannerActivities() {
    try {
      const saved = localStorage.getItem(PLANNER_KEY);

      if (saved !== null) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }

      const oldTasks = JSON.parse(
        localStorage.getItem(OLD_TASKS_KEY) || '[]'
      );

      const oldEvents = JSON.parse(
        localStorage.getItem(OLD_EVENTS_KEY) || '[]'
      );

      return [
        ...(Array.isArray(oldTasks) ? oldTasks : []),
        ...(Array.isArray(oldEvents) ? oldEvents : [])
      ];
    } catch (error) {
      console.error('Could not read Study Planner activities:', error);
      return [];
    }
  }

  function subjectKey(subject) {
    return subject.trim().toLocaleLowerCase();
  }

  function getUnits(subject) {
    const allUnits = readObject(UNITS_KEY);
    return Array.isArray(allUnits[subject]) ? allUnits[subject] : [];
  }

  function setUnits(subject, units) {
    const allUnits = readObject(UNITS_KEY);
    allUnits[subject] = units;
    return saveObject(UNITS_KEY, allUnits);
  }

  function getMode(subject) {
    return readObject(MODE_KEY)[subject] || '';
  }

  function setMode(subject, mode) {
    const modes = readObject(MODE_KEY);
    modes[subject] = mode;
    return saveObject(MODE_KEY, modes);
  }

  function makeProgressBar(percent) {
    const track = document.createElement('div');
    track.className = 'subject-progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Subject completion');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(percent));

    const fill = document.createElement('div');
    fill.className = 'subject-progress-fill';
    fill.style.width = `${percent}%`;

    track.appendChild(fill);
    return track;
  }

  function makeText(text, className) {
    const element = document.createElement('p');

    if (className) {
      element.className = className;
    }

    element.textContent = text;
    return element;
  }

  // ===== Track syllabus units =====
  function renderUnitProgress(subject, container) {
    const units = getUnits(subject);
    const completed = units.filter(unit => unit.completed).length;

    if (units.length > 0) {
      const summary = document.createElement('div');
      summary.className = 'subject-progress-summary';

      const count = document.createElement('span');
      count.textContent = `${completed}/${units.length} units completed`;

      const percent = document.createElement('strong');
      const percentage = Math.round((completed / units.length) * 100);
      percent.textContent = `${percentage}%`;

      summary.append(count, percent);
      container.append(summary, makeProgressBar(percentage));
    } else {
      container.appendChild(
        makeText('Add your syllabus units to begin tracking.')
      );
    }

    const unitList = document.createElement('div');
    unitList.className = 'progress-unit-list';

    units.forEach(function (unit, index) {
      const row = document.createElement('label');
      row.className = 'progress-unit-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(unit.completed);

      const unitName = document.createElement('span');
      unitName.textContent = unit.title;

      if (unit.completed) {
        unitName.className = 'unit-completed';
      }

      checkbox.addEventListener('change', function () {
        const updated = getUnits(subject);

        if (!updated[index]) return;

        updated[index].completed = checkbox.checked;

        if (setUnits(subject, updated)) {
          renderProgress();
        }
      });

      row.append(checkbox, unitName);
      unitList.appendChild(row);
    });

    container.appendChild(unitList);

    const form = document.createElement('form');
    form.className = 'progress-add-unit';

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 120;
    input.placeholder = 'Enter unit name';
    input.setAttribute('aria-label', `Add a unit for ${subject}`);
    input.required = true;

    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Add unit';

    form.append(input, button);

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const title = input.value.trim();
      if (!title) return;

      const currentUnits = getUnits(subject);

      if (
        currentUnits.some(
          unit => unit.title.toLocaleLowerCase() === title.toLocaleLowerCase()
        )
      ) {
        alert('This unit has already been added.');
        return;
      }

      currentUnits.push({
        id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title,
        completed: false
      });

      if (setUnits(subject, currentUnits)) {
        renderProgress();
      }
    });

    container.appendChild(form);
  }

  // ===== Track Study Planner tasks =====
  function renderPlannerProgress(subject, container) {
    const activities = readPlannerActivities().filter(function (item) {
      return (
        item &&
        typeof item.subject === 'string' &&
        subjectKey(item.subject) === subjectKey(subject)
      );
    });

    if (activities.length === 0) {
      container.appendChild(
        makeText('No Study Planner tasks are linked to this subject yet.')
      );
      return;
    }

    const completed = activities.filter(
      item => Boolean(item.completed)
    ).length;

    const percentage = Math.round((completed / activities.length) * 100);

    const summary = document.createElement('div');
    summary.className = 'subject-progress-summary';

    const count = document.createElement('span');
    count.textContent = `${completed}/${activities.length} tasks completed`;

    const percent = document.createElement('strong');
    percent.textContent = `${percentage}%`;

    summary.append(count, percent);
    container.append(summary, makeProgressBar(percentage));
  }

  // ===== Render progress cards =====
  function renderProgress() {
    if (!progressList) return;

    progressList.replaceChildren();

    if (subjects.length === 0) {
      progressList.appendChild(
        makeText('Add subjects in your profile to track progress.')
      );
      return;
    }

    subjects.forEach(function (subject) {
      const card = document.createElement('article');
      card.className = 'subject-progress-card';

      const heading = document.createElement('h3');
      heading.className = 'subject-progress-title';
      heading.textContent = subject;

      const modeLabel = document.createElement('label');
      modeLabel.className = 'progress-mode-label';
      modeLabel.appendChild(document.createTextNode('Track by '));

      const select = document.createElement('select');
      select.className = 'progress-mode-select';
      select.setAttribute('aria-label', `Progress method for ${subject}`);

      [
        { value: '', label: 'Choose method' },
        { value: 'units', label: 'Syllabus units' },
        { value: 'planner', label: 'Study Planner tasks' }
      ].forEach(function (optionData) {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        select.appendChild(option);
      });

      select.value = getMode(subject);

      const content = document.createElement('div');
      content.className = 'subject-progress-content';

      select.addEventListener('change', function () {
        if (setMode(subject, select.value)) {
          renderProgress();
        }
      });

      modeLabel.appendChild(select);
      card.append(heading, modeLabel, content);

      if (select.value === 'units') {
        renderUnitProgress(subject, content);
      } else if (select.value === 'planner') {
        renderPlannerProgress(subject, content);
      } else {
        content.appendChild(
          makeText('Choose how you want to track this subject.')
        );
      }

      progressList.appendChild(card);
    });
  }

  renderProgress();

  window.addEventListener('pageshow', renderProgress);
  window.addEventListener('focus', renderProgress);

  window.addEventListener('storage', function (event) {
    if (
      [
        PLANNER_KEY,
        OLD_TASKS_KEY,
        OLD_EVENTS_KEY,
        MODE_KEY,
        UNITS_KEY,
        'luminaProfile'
      ].includes(event.key)
    ) {
      renderProgress();
    }
  });
});
