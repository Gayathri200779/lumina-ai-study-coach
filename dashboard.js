// ===== Avatar dropdown toggle =====
const avatarToggle = document.getElementById('avatarToggle');
const avatarDropdown = document.getElementById('avatarDropdown');

avatarToggle.addEventListener('click', function (e) {
  e.stopPropagation();
  avatarDropdown.classList.toggle('show');
});

document.addEventListener('click', function () {
  avatarDropdown.classList.remove('show');
});

// ===== Load semester/subject count from Profile Setup page =====
// On your profile setup page, save data like this when the user submits the form:
//
//   localStorage.setItem('luminaProfile', JSON.stringify({
//     semester: "3rd Semester",
//     subjects: 5
//   }));
//
document.addEventListener('DOMContentLoaded', function () {
  const savedProfile = localStorage.getItem('luminaProfile');

  if (savedProfile) {
    const profile = JSON.parse(savedProfile);

    if (profile.semester) {
      document.getElementById('currentSemester').textContent =
        `🎓 Current Semester: ${profile.semester}`;
    }

    if (profile.subjects) {
      document.getElementById('subjectCount').textContent =
        `📖 Subjects: ${profile.subjects} Subjects`;
    }
  }
});