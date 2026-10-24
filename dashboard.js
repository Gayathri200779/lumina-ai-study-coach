
document.addEventListener('DOMContentLoaded', function () {
  // ===== Profile dropdown =====
  const avatarToggle = document.getElementById('avatarToggle');
  const avatarDropdown = document.getElementById('avatarDropdown');

  if (avatarToggle && avatarDropdown) {
    function closeDropdown() {
      avatarDropdown.classList.remove('show');
      avatarToggle.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown(event) {
      event.stopPropagation();
      const isOpen = avatarDropdown.classList.toggle('show');
      avatarToggle.setAttribute('aria-expanded', String(isOpen));
    }

    avatarToggle.addEventListener('click', toggleDropdown);

    document.addEventListener('click', function (event) {
      if (
        !avatarDropdown.contains(event.target) &&
        !avatarToggle.contains(event.target)
      ) {
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
    profile = JSON.parse(
      localStorage.getItem('luminaProfile') || 'null'
    );
  } catch (error) {
    console.error('Unable to read saved Lumina profile:', error);
  }

  if (!profile) return;

  const welcomeName = document.getElementById('welcomeName');
  const currentCourse = document.getElementById('currentCourse');
  const currentSemester = document.getElementById('currentSemester');
  const subjectCount = document.getElementById('subjectCount');
  const subjectGrid = document.getElementById('subjectGrid');
  const learningGoals = document.getElementById('learningGoals');

  const name = (profile.fullName || '').trim();
  const course = (profile.course || '').trim();
  const semester = profile.semester
    ? String(profile.semester)
    : '';

  const subjects = Array.isArray(profile.subjects)
    ? profile.subjects
    : [];

  const goals = Array.isArray(profile.goals)
    ? profile.goals
    : [];

  if (welcomeName && name) {
    welcomeName.textContent = name;
  }

  if (currentCourse) {
    currentCourse.textContent =
      `🎓 ${course || 'Degree not set'}`;
  }

  if (currentSemester) {
    currentSemester.textContent = semester
      ? `📚 Current Semester: ${semester}`
      : '📚 Current Semester: Not set';
  }

  if (subjectCount) {
    subjectCount.textContent =
      `📝 Subjects: ${subjects.length}`;
  }

  // ===== Subject cards with navigation =====
  if (subjectGrid) {
    subjectGrid.replaceChildren();

    if (subjects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';

      const icon = document.createElement('span');
      icon.textContent = '📚';

      const message = document.createElement('p');
      message.textContent =
        'No subjects added yet. Update your profile to add your subjects.';

      empty.append(icon, message);
      subjectGrid.appendChild(empty);
    } else {
      subjects.forEach(function (subject) {
        const card = document.createElement('article');
        card.className = 'subject-card';

        // Make the card keyboard-accessible and clickable
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

        // Open the separate subject page
        function openSubjectPage() {
          window.location.href =
            'subject.html?subject=' +
            encodeURIComponent(subject);
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

  // ===== Learning goals =====
  if (learningGoals) {
    learningGoals.replaceChildren();

    if (goals.length === 0) {
      const message = document.createElement('p');
      message.className = 'goal-empty';
      message.textContent =
        'No learning goals selected yet. You can update them in your profile.';

      learningGoals.appendChild(message);
    } else {
      const goalLabels = {
        understand: 'Understand concepts',
        exams: 'Prepare for exams',
        grades: 'Improve grades',
        practice: 'Practice questions',
        revise: 'Revise faster',
        plan: 'Plan my studies',
        fundamentals: 'Build strong fundamentals'
      };

      goals.forEach(function (goal) {
        const chip = document.createElement('span');
        chip.className = 'goal-chip';
        chip.textContent = goalLabels[goal] || goal;
        learningGoals.appendChild(chip);
      });
    }
  }
});
