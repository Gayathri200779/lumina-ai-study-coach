
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

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    conceptInput.value +=
      (conceptInput.value ? ' ' : '') + transcript;

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

  if (state === 'empty') {
    emptyState.classList.remove('hidden');
  }

  if (state === 'loading') {
    loadingState.classList.remove('hidden');
  }

  if (state === 'result') {
    resultContent.classList.remove('hidden');
  }
}

// ===== Track Generated Content Type =====
let lastGeneratedType = 'ai-chat';

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

  const prompt =
    `Explain "${topic}"${context ? ' in the context of ' + context : ''}. Level: ${selectedLevel}. Style: ${selectedStyle}.
Rules:
1. The very first line must start with "PICTURE:" followed by 4 to 6 emojis with arrows between them that show the idea step by step. Example: PICTURE: 🌞 → 💧 → 🌱 → 🍃
2. Then leave an empty line.
3. Write like a fun, friendly teacher. Start with one fun hook line.
4. Then give 3 or 4 short parts. Each part has an emoji and a short title on its own line, then 1 or 2 short sentences.
5. Add one funny, easy real-life example.
6. End with a line that starts with "Remember:".
7. Keep it under 150 words. Leave an empty line between parts.
8. Do not use symbols like * or #.`;

  let picture = '';
  let text = 'Sorry, no answer came. Please try again.';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });

    const data = await response.json();

    if (data.reply) {
      const lines = data.reply.split('\n');

      if (lines[0].toUpperCase().startsWith('PICTURE:')) {
        picture = lines[0].replace(/^PICTURE:\s*/i, '').trim();
        text = lines.slice(1).join('\n').trim();
      } else {
        text = data.reply;
      }
    }
  } catch (error) {
    console.error('Explanation error:', error);
    text = 'Something went wrong. Please try again.';
  }

  let pictureBox = document.getElementById('picture-box');

  if (!pictureBox) {
    pictureBox = document.createElement('div');
    pictureBox.id = 'picture-box';
    resultText.parentNode.insertBefore(pictureBox, resultText);
  }

  pictureBox.textContent = picture;
  pictureBox.style.display = picture ? 'block' : 'none';
  pictureBox.style.fontSize = '40px';
  pictureBox.style.textAlign = 'center';
  pictureBox.style.padding = '16px';
  pictureBox.style.marginBottom = '16px';
  pictureBox.style.background = '#eef6ee';
  pictureBox.style.borderRadius = '16px';

  resultText.textContent = text;
  resultText.style.whiteSpace = 'pre-wrap';
  resultText.style.lineHeight = '1.8';
  resultText.style.fontSize = '16px';

  lastGeneratedType = 'ai-chat';

  showState('result');
  explainBtn.disabled = false;
});

// ===== Summarize Button =====
const summarizeBtn = Array.from(document.querySelectorAll('button'))
  .find(button => button.textContent.includes('Summarize'));

if (summarizeBtn) {
  summarizeBtn.disabled = false;

  summarizeBtn.addEventListener('click', async () => {
    const topic = conceptInput.value.trim();

    if (!topic) {
      alert('Please enter a concept or topic to summarize.');
      return;
    }

    showState('loading');
    summarizeBtn.disabled = true;

    const context = subjectContext.value.trim();

    const prompt =
      `Summarize "${topic}"${context ? ' in the context of ' + context : ''}. Level: ${selectedLevel}. Give exactly 3 short points. Each point starts with an emoji and is one short, fun sentence on its own line. Then add a last line that starts with "Remember:". Keep it under 50 words. Leave an empty line between points. Do not use symbols like * or #.`;

    let text = 'Sorry, no answer came. Please try again.';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      const data = await response.json();

      if (data.reply) {
        text = data.reply;
      }
    } catch (error) {
      console.error('Summary error:', error);
      text = 'Something went wrong. Please try again.';
    }

    const pictureBox = document.getElementById('picture-box');

    if (pictureBox) {
      pictureBox.style.display = 'none';
    }

    resultText.textContent = text;
    resultText.style.whiteSpace = 'pre-wrap';
    resultText.style.lineHeight = '1.8';
    resultText.style.fontSize = '16px';

    lastGeneratedType = 'ai-summary';

    showState('result');
    summarizeBtn.disabled = false;
  });
}

// ===== Copy Button =====
const copyBtn = document.getElementById('copy-btn');

copyBtn.addEventListener('click', () => {
  const text = resultText.textContent;

  if (!text.trim()) {
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'check';

    setTimeout(() => {
      copyBtn.textContent = 'content_copy';
    }, 1500);
  }).catch(() => {
    alert('Failed to copy text.');
  });
});

// ===== Listen Button (Text-to-Speech) =====
const listenBtn = document.getElementById('listen-btn');
let isSpeaking = false;

listenBtn.addEventListener('click', () => {
  const text = resultText.textContent;

  if (!text.trim()) {
    return;
  }

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

  utterance.onerror = () => {
    isSpeaking = false;
    listenBtn.textContent = 'volume_up';
  };

  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  listenBtn.textContent = 'volume_off';
});

// ===== Save Explanation or Summary to My Notes =====
const saveBtn = document.getElementById('save-btn');

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const content = resultText.textContent.trim();
    const title = conceptInput.value.trim();

    if (!content) {
      alert('Generate an explanation or summary before saving.');
      return;
    }

    if (!title) {
      alert('Please enter a topic first.');
      return;
    }

    // Use the subject field, or ask for one if it is empty.
    let subject = subjectContext.value.trim();

    if (!subject) {
      subject = prompt('Enter the subject name for this note:');

      if (subject === null || !subject.trim()) {
        alert('Please enter a subject name to save this note.');
        return;
      }

      subject = subject.trim();
    }

    try {
      const storedNotes = JSON.parse(
        localStorage.getItem('luminaNotes') || '[]'
      );

      if (!Array.isArray(storedNotes)) {
        throw new Error('Saved notes are not in the expected format.');
      }

      const now = new Date().toISOString();

      const newNote = {
        id: window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : 'note-' + Date.now() + '-' +
            Math.random().toString(36).slice(2),
        title: title,
        subject: subject,
        content: content,
        source: lastGeneratedType,
        createdAt: now,
        updatedAt: now
      };

      storedNotes.push(newNote);

      localStorage.setItem(
        'luminaNotes',
        JSON.stringify(storedNotes)
      );

      alert('Notes saved successfully!');

      saveBtn.innerHTML =
        '<span class="material-icons">check</span> Saved!';

      setTimeout(() => {
        saveBtn.innerHTML =
          '<span class="material-icons">bookmark</span> Save to My Notes';
      }, 1500);

    } catch (error) {
      console.error('Unable to save note:', error);
      alert('Unable to save the note. Please try again.');
    }
  });
}
