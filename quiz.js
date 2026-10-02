// ---------- STATE ----------
let selectedDifficulty = "medium";
let selectedCount = 10;
let quiz = [];
let currentIndex = 0;
let selectedAnswers = [];
let timerInterval = null;
let secondsLeft = 0;

// ---------- DIFFICULTY GAUGE ----------
const needle = document.getElementById("needle");
const gaugeLabel = document.getElementById("gaugeLabel");
const diffAngles = { easy: -55, medium: 0, hard: 55 };

function setDifficulty(diff) {
  selectedDifficulty = diff;
  needle.style.transform = `rotate(${diffAngles[diff]}deg)`;
  gaugeLabel.textContent = diff.toUpperCase();
  document.querySelectorAll(".zone").forEach(z => {
    z.classList.toggle("zone-active", z.dataset.diff === diff);
  });
  document.querySelectorAll(".end-label").forEach(l => {
    l.classList.toggle("active", l.dataset.diff === diff);
  });
}

document.querySelectorAll(".zone").forEach(zone => {
  zone.addEventListener("click", () => setDifficulty(zone.dataset.diff));
});
document.querySelectorAll(".end-label").forEach(label => {
  label.addEventListener("click", () => setDifficulty(label.dataset.diff));
});
setDifficulty("medium");

// ---------- QUESTION COUNT ----------
document.querySelectorAll(".count-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".count-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedCount = parseInt(btn.dataset.count, 10);
  });
});

// ---------- QUIZ GENERATION (mock, fully dynamic based on user input) ----------
const templates = [
  (t) => `What is the core purpose of ${t} in this subject?`,
  (t) => `Which statement best describes how ${t} is applied?`,
  (t) => `Identify the correct outcome when using ${t} on a real-world example.`,
  (t) => `Which of the following is a common mistake when applying ${t}?`,
  (t) => `How does ${t} relate to other concepts in this subject area?`,
  (t) => `What condition must be true for ${t} to hold?`,
  (t) => `Which formula/approach is most closely tied to ${t}?`,
  (t) => `What is a limitation of ${t}?`,
  (t) => `Choose the best example illustrating ${t}.`,
  (t) => `Why is ${t} considered important at this difficulty level?`,
  (t) => `Which scenario would NOT use ${t}?`,
  (t) => `What is the first step when solving a problem involving ${t}?`,
  (t) => `Which term is most closely associated with ${t}?`,
  (t) => `What result would you expect after correctly applying ${t}?`,
  (t) => `Which of these best summarizes ${t}?`
];

const optionPool = [
  "It updates existing knowledge based on new evidence.",
  "It calculates the probability of independent events.",
  "It determines variance across a data set.",
  "It has no real-world application.",
  "It only applies to a single fixed scenario.",
  "It combines prior information with new data.",
  "It is unrelated to the subject entirely.",
  "It simplifies complex relationships into a single rule."
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateQuiz(count, subject, topic, difficulty) {
  const focus = topic && topic.trim() !== "" ? topic.trim() : subject;
  const pool = shuffle(templates).slice(0, count);
  return pool.map((tmpl, i) => {
    const opts = shuffle(optionPool).slice(0, 4);
    return {
      question: `[${difficulty.toUpperCase()}] ${tmpl(focus)}`,
      options: opts,
      correctIndex: Math.floor(Math.random() * opts.length)
    };
  });
}

// ---------- GENERATE BUTTON ----------
document.getElementById("generateBtn").addEventListener("click", () => {
  const subject = document.getElementById("subjectArea").value;
  const topic = document.getElementById("specificTopic").value;

  quiz = generateQuiz(selectedCount, subject, topic, selectedDifficulty);
  selectedAnswers = new Array(quiz.length).fill(null);
  currentIndex = 0;

  document.getElementById("qTotal").textContent = quiz.length;
  document.getElementById("quizSection").hidden = false;
  document.getElementById("quizSection").scrollIntoView({ behavior: "smooth" });

  startTimer(15 * 60 - 1); // 14:59 style countdown
  renderQuestion();
});

// ---------- RENDER QUESTION ----------
const optionsContainer = document.getElementById("optionsContainer");
const questionText = document.getElementById("questionText");
const qNum = document.getElementById("qNum");
const progressFill = document.getElementById("progressFill");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const letters = ["A", "B", "C", "D", "E"];

function renderQuestion() {
  const q = quiz[currentIndex];
  qNum.textContent = currentIndex + 1;
  questionText.textContent = q.question;
  progressFill.style.width = `${((currentIndex + 1) / quiz.length) * 100}%`;

  optionsContainer.innerHTML = "";
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    if (selectedAnswers[currentIndex] === i) div.classList.add("selected");
    div.innerHTML = `
      <span class="radio-dot"></span>
      <div>
        <strong>${letters[i]}</strong>
        <p>${opt}</p>
      </div>`;
    div.addEventListener("click", () => {
      selectedAnswers[currentIndex] = i;
      renderQuestion();
    });
    optionsContainer.appendChild(div);
  });

  prevBtn.disabled = currentIndex === 0;
  nextBtn.textContent = currentIndex === quiz.length - 1 ? "Finish ✓" : "Next ›";
}

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < quiz.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    clearInterval(timerInterval);
    const score = selectedAnswers.filter((a, i) => a === quiz[i].correctIndex).length;
    alert(`Quiz complete! You scored ${score} out of ${quiz.length}.`);
  }
});

// ---------- TIMER ----------
function startTimer(seconds) {
  clearInterval(timerInterval);
  secondsLeft = seconds;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      secondsLeft = 0;
    }
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  document.getElementById("timerDisplay").textContent =
    `${m}:${s.toString().padStart(2, "0")}`;
}