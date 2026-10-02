// ===== Semester Selection =====
const semBtns = document.querySelectorAll('.sem-btn');
const semInput = document.getElementById('selectedSemester');

semBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    semBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    semInput.value = btn.dataset.val;
  });
});

// ===== Subjects (tag input) =====
const subjectInput = document.getElementById('subjectInput');
const subjectsContainer = document.getElementById('subjectsContainer');
const subjectsHidden = document.getElementById('subjectsList');
let subjects = [];

function renderSubjects() {
  subjectsContainer.innerHTML = '';
  subjects.forEach((subj, index) => {
    const span = document.createElement('span');
    span.className = 'chip';
    span.innerHTML = subj + ' <button type="button" data-index="' + index + '">&times;</button>';
    subjectsContainer.appendChild(span);
  });
  subjectsHidden.value = subjects.join(',');
}

subjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = subjectInput.value.trim();
    if (val && !subjects.includes(val)) {
      subjects.push(val);
      subjectInput.value = '';
      renderSubjects();
    }
  }
});

subjectsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) {
    const index = parseInt(btn.dataset.index);
    subjects.splice(index, 1);
    renderSubjects();
  }
});

// ===== Learning Goals (max 3) =====
const goalCards = document.querySelectorAll('.goal-card');

goalCards.forEach(card => {
  const checkbox = card.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
    const checkedCount = document.querySelectorAll('input[name="goals"]:checked').length;
    goalCards.forEach(c => {
      const box = c.querySelector('input[type="checkbox"]');
      if (checkedCount >= 3 && !box.checked) {
        box.disabled = true;
        c.classList.add('disabled');
      } else {
        box.disabled = false;
        c.classList.remove('disabled');
      }
    });
  });
});

// ===== Form Submission =====
document.getElementById('profileForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // Collect all profile data
  const profileData = {
    fullName: document.getElementById('fullName').value.trim(),
    course: document.getElementById('course').value.trim(),
    semester: semInput.value,
    subjects: subjects,
    goals: Array.from(document.querySelectorAll('input[name="goals"]:checked'))
                 .map(cb => cb.value)
  };

  // Save to localStorage so dashboard.html (or any other page) can read it
  localStorage.setItem('luminaProfile', JSON.stringify(profileData));

  // Navigate to dashboard
  window.location.href = 'dashboard.html';
});