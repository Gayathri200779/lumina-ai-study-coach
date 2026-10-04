// ===== Character Counter =====
const conceptInput = document.getElementById('concept-input');
const charCurrent = document.getElementById('char-current');

conceptInput.addEventListener('input', () => {
  charCurrent.textContent = conceptInput.value.length;
});

// ===== Mic Button (voice input toggle) =====
const micBtn = document.getElementById('mic-btn');
let isListening = false;
let recognition = null;

// Check if browser supports Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    conceptInput.value += (conceptInput.value ? ' ' : '') + transcript;
    charCurrent.textContent = conceptInput.value.length;
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('active');
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove('active');
  };
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert('Voice input is not supported in this browser. Try Chrome or Edge.');
    return;
  }
  if (isListening) {
    recognition.stop();
    isListening = false;
    micBtn.classList.remove('active');
  } else {
    recognition.start();
    isListening = true;
    micBtn.classList.add('active');
  }
});

// ===== Explanation Level Buttons =====
const levelBtns = document.querySelectorAll('.level-btn');
let selectedLevel = 'Beginner';

levelBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    levelBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedLevel = btn.textContent.trim();
  });
});

// ===== Style Buttons =====
const styleBtns = document.querySelectorAll('.style-btn');
let selectedStyle = 'Simple';

styleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    styleBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedStyle = btn.textContent.trim();
  });
});

// ===== State Elements =====
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const resultContent = document.getElementById('result-content');
const resultText = document.getElementById('result-text');

function showState(state) {
  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  resultContent.classList.add('hidden');

  if (state === 'empty') emptyState.classList.remove('hidden');
  if (state === 'loading') loadingState.classList.remove('hidden');
  if (state === 'result') resultContent.classList.remove('hidden');
}

// ===== Explain Button =====
const explainBtn = document.getElementById('explain-btn');
const subjectContext = document.getElementById('subject-context');

explainBtn.addEventListener('click', async () => {
  const topic = conceptInput.value.trim();

  if (!topic) {
    alert('Please enter a concept or topic to explain.');
    return;
  }

  showState('loading');
  explainBtn.disabled = true;

  const context = subjectContext.value.trim();
  const prompt = `Explain "${topic}"${context ? ' in the context of ' + context : ''}. Level: ${selectedLevel}. Style: ${selectedStyle}. Use simple, clear words. Do not use symbols like * or #.`;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });
    const data = await response.json();
    resultText.textContent = data.reply || 'Sorry, no answer came. Please try again.';
  } catch (error) {
    resultText.textContent = 'Something went wrong. Please try again.';
  }

  showState('result');
  explainBtn.disabled = false;
});

// Placeholder explanation generator (swap this out for a real API call)
function generateMockExplanation(topic, context, level, style) {
  let intro = context
    ? `Here's a ${level.toLowerCase()}-level explanation of "${topic}" in the context of ${context}:\n\n`
    : `Here's a ${level.toLowerCase()}-level explanation of "${topic}":\n\n`;

  let body = '';
  switch (style) {
    case 'Step-by-Step':
      body = `1. First, understand the basic definition of ${topic}.\n2. Next, look at how it works in practice.\n3. Finally, see how it connects to related concepts.`;
      break;
    case 'With Examples':
      body = `${topic} can be understood through a simple example. Imagine a real-world scenario where this concept applies directly, then break down each part step by step.`;
      break;
    case 'Exam-Oriented':
      body = `Key points to remember about ${topic} for exams:\n- Definition and core idea\n- Common formulas or rules\n- Typical exam questions and how to approach them`;
      break;
    default: // Simple
      body = `${topic} is a concept that can be broken down into simple terms. At its core, it describes how something works or behaves, and understanding the fundamentals makes everything else easier to grasp.`;
  }

  return intro + body;
}

// ===== Copy Button =====
const copyBtn = document.getElementById('copy-btn');

copyBtn.addEventListener('click', () => {
  const text = resultText.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'check';
    setTimeout(() => {
      copyBtn.textContent = 'content_copy';
    }, 1500);
  }).catch(() => {
    alert('Failed to copy text.');
  });
});

// ===== Listen Button (text-to-speech) =====
const listenBtn = document.getElementById('listen-btn');
let isSpeaking = false;

listenBtn.addEventListener('click', () => {
  const text = resultText.textContent;
  if (!text) return;

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    listenBtn.textContent = 'volume_up';
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = () => {
    isSpeaking = false;
    listenBtn.textContent = 'volume_up';
  };

  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  listenBtn.textContent = 'volume_off';
});

// ===== Save to My Notes Button =====
const saveBtn = document.getElementById('save-btn');

saveBtn.addEventListener('click', () => {
  const text = resultText.textContent;
  const topic = conceptInput.value.trim();

  if (!text) {
    alert('Generate an explanation first before saving.');
    return;
  }

  const notes = JSON.parse(localStorage.getItem('luminaNotes') || '[]');
  notes.push({
    topic: topic,
    content: text,
    level: selectedLevel,
    style: selectedStyle,
    savedAt: new Date().toISOString()
  });
  localStorage.setItem('luminaNotes', JSON.stringify(notes));

  saveBtn.innerHTML = '<span class="material-icons">check</span> Saved!';
  setTimeout(() => {
    saveBtn.innerHTML = '<span class="material-icons">bookmark</span> Save to My Notes';
  }, 1500);
});
