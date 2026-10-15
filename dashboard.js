```javascript
// ===== Avatar dropdown toggle =====
const avatarToggle = document.getElementById('avatarToggle');
const avatarDropdown = document.getElementById('avatarDropdown');

if (avatarToggle && avatarDropdown) {
  function toggleAvatarDropdown(event) {
    event.stopPropagation();

    const isOpen = avatarDropdown.classList.toggle('show');
    avatarToggle.setAttribute('aria-expanded', String(isOpen));
  }

  avatarToggle.addEventListener('click', toggleAvatarDropdown);

  // Allow keyboard users to open the menu
  avatarToggle.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAvatarDropdown(event);
    }
  });

  // Close dropdown when clicking elsewhere
  document.addEventListener('click', function () {
    avatarDropdown.classList.remove('show');
    avatarToggle.setAttribute('aria-expanded', 'false');
  });

  // Close dropdown with Escape key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      avatarDropdown.classList.remove('show');
      avatarToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ===== Load semester/subject count from Profile Setup page =====
// The profile setup page can save data using this format:
//
// localStorage.setItem('luminaProfile', JSON.stringify({
//   semester: "3rd Semester",
//   subjects: 5
// }));

document.addEventListener('DOMContentLoaded', function () {
  const savedProfile = localStorage.getItem('luminaProfile');

  if (savedProfile) {
    try {
      const profile = JSON.parse(savedProfile);

      if (profile.semester) {
        document.getElementById('currentSemester').textContent =
          `🎓 Current Semester: ${profile.semester}`;
      }

      if (profile.subjects) {
        document.getElementById('subjectCount').textContent =
          `📖 Subjects: ${profile.subjects} Subjects`;
      }
    } catch (error) {
      console.error('Unable to load saved profile information:', error);
    }
  }
});
```
