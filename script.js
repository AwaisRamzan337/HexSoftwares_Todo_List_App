// ===========================
//  Premium To-Do App — script.js
//  Features: Dark Mode, Drag & Drop, Categories, Pomodoro,
//  Subtasks, Notes, Sorting, Analytics, Voice Input,
//  Notifications, Confetti, Streaks, Quotes
// ===========================

// ---- Motivational Quotes ----
const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus on being productive instead of busy. — Tim Ferriss",
  "Done is better than perfect. — Sheryl Sandberg",
  "Small daily improvements lead to staggering long-term results.",
  "Your future is created by what you do today, not tomorrow.",
  "One task at a time. One day at a time. Keep going! 💪",
  "Discipline is choosing between what you want now and what you want most.",
];

// ---- Category Config ----
const CAT_LABELS = {
  personal: '❤️ Personal',
  work:     '💼 Work',
  study:    '📘 Study',
  health:   '💪 Health',
};

// ---- State ----
let tasks         = [];
let currentFilter = 'all';
let searchQuery   = '';
let sortMode      = 'newest';
let editingTaskId = null;
let editSubtasks  = [];

// ---- Pomodoro State ----
let pomoMinutes  = 25;
let pomoSeconds  = 0;
let pomoInterval = null;
let pomoRunning  = false;
let pomoLabel    = 'Focus';

// ---- Analytics State (fake weekly data + today) ----
let weeklyData = JSON.parse(localStorage.getItem('weekly_data') || 'null');
if (!weeklyData) {
  weeklyData = { Mon:2, Tue:3, Wed:1, Thu:4, Fri:2, Sat:0, Sun:0 };
}

// ===========================
//  LOCAL STORAGE
// ===========================
function loadTasks() {
  const saved = localStorage.getItem('todo_tasks_v2');
  if (saved) {
    tasks = JSON.parse(saved);
  } else {
    tasks = [
      { id: 1, text: 'Complete HTML project', priority: 'high',   category: 'study',    done: false, date: getTodayDate(), note: 'Submit before 5 PM', subtasks: [{id:11,text:'Research',done:true},{id:12,text:'Design',done:false}] },
      { id: 2, text: 'Push code to GitHub',   priority: 'medium', category: 'work',     done: false, date: getTodayDate(), note: '', subtasks: [] },
      { id: 3, text: 'Morning workout',        priority: 'low',    category: 'health',   done: true,  date: getTodayDate(), note: '', subtasks: [] },
    ];
  }
}

function saveTasks() {
  localStorage.setItem('todo_tasks_v2', JSON.stringify(tasks));
}

function saveWeekly() {
  localStorage.setItem('weekly_data', JSON.stringify(weeklyData));
}

// ===========================
//  DATE HELPERS
// ===========================
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const today     = getTodayDate();
  const tomorr    = new Date(); tomorr.setDate(tomorr.getDate() + 1);
  const tomorrowStr = tomorr.toISOString().split('T')[0];
  if (dateStr === today)       return '📅 Today';
  if (dateStr === tomorrowStr) return '📅 Tomorrow';
  if (dateStr < today)         return '⚠️ Overdue';
  return '📅 ' + dateStr;
}

// ===========================
//  THEME (DARK / LIGHT)
// ===========================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(theme) {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ===========================
//  STREAK
// ===========================
function updateStreak() {
  const today       = getTodayDate();
  const lastActive  = localStorage.getItem('last_active');
  let streak        = parseInt(localStorage.getItem('streak') || '0');

  if (lastActive !== today) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr      = yesterday.toISOString().split('T')[0];
    if (lastActive === yStr) {
      streak += 1;
    } else if (lastActive !== today) {
      streak = 1;
    }
    localStorage.setItem('streak', streak);
    localStorage.setItem('last_active', today);
  }

  const el = document.getElementById('s-streak');
  if (el) el.textContent = streak;
}

// ===========================
//  MOTIVATIONAL QUOTE
// ===========================
function showQuote() {
  const idx = Math.floor(Math.random() * QUOTES.length);
  const el  = document.getElementById('quote-text');
  if (el) el.textContent = QUOTES[idx];
}

// ===========================
//  ADD TASK
// ===========================
function addTask() {
  const input   = document.getElementById('task-input');
  const priSel  = document.getElementById('pri-select');
  const dateIn  = document.getElementById('date-input');
  const catSel  = document.getElementById('cat-select');
  const noteIn  = document.getElementById('notes-input');

  const text = input.value.trim();
  if (!text) {
    input.focus();
    input.style.borderColor = '#E91E8C';
    input.style.boxShadow   = '0 0 0 3px rgba(233,30,140,0.15)';
    setTimeout(() => { input.style.borderColor = ''; input.style.boxShadow = ''; }, 1400);
    return;
  }

  const newTask = {
    id:       Date.now(),
    text:     text,
    priority: priSel.value,
    category: catSel.value,
    done:     false,
    date:     dateIn.value || getTodayDate(),
    note:     noteIn.value.trim(),
    subtasks: [],
    createdAt: Date.now(),
  };

  tasks.unshift(newTask);
  saveTasks();

  input.value   = '';
  dateIn.value  = '';
  priSel.value  = 'medium';
  noteIn.value  = '';
  input.focus();

  // Schedule notification if date is today
  if (newTask.date === getTodayDate()) scheduleNotification(newTask);

  render();
}

// ===========================
//  TOGGLE DONE
// ===========================
function toggleTask(id) {
  tasks = tasks.map(t => {
    if (t.id === id) {
      const nowDone = !t.done;
      if (nowDone) {
        // Update today's analytics
        const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
        weeklyData[day] = (weeklyData[day] || 0) + 1;
        saveWeekly();
      }
      return { ...t, done: nowDone };
    }
    return t;
  });
  saveTasks();
  render();

  // Confetti if all done
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  if (total > 0 && done === total) fireConfetti();
}

// ===========================
//  DELETE TASK (animated)
// ===========================
function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

// ===========================
//  SUBTASK TOGGLE (inline)
// ===========================
function toggleSubtask(taskId, subId) {
  tasks = tasks.map(t => {
    if (t.id === taskId) {
      return {
        ...t,
        subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s)
      };
    }
    return t;
  });
  saveTasks();
  render();
}

// ===========================
//  FILTER & SORT
// ===========================
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.f-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

function getFilteredTasks() {
  let list = [...tasks];

  if (currentFilter === 'pending') list = list.filter(t => !t.done);
  if (currentFilter === 'done')    list = list.filter(t =>  t.done);
  if (currentFilter === 'high')    list = list.filter(t => t.priority === 'high');
  if (currentFilter === 'work')    list = list.filter(t => t.category === 'work');
  if (currentFilter === 'study')   list = list.filter(t => t.category === 'study');
  if (currentFilter === 'health')  list = list.filter(t => t.category === 'health');

  if (searchQuery) {
    list = list.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  // Sort
  if (sortMode === 'oldest')   list.sort((a,b) => a.createdAt - b.createdAt);
  if (sortMode === 'newest')   list.sort((a,b) => b.createdAt - a.createdAt);
  if (sortMode === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    list.sort((a,b) => order[a.priority] - order[b.priority]);
  }
  if (sortMode === 'deadline') list.sort((a,b) => (a.date||'9999') < (b.date||'9999') ? -1 : 1);

  return list;
}

// ===========================
//  STATS & PROGRESS
// ===========================
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('s-total').textContent   = total;
  document.getElementById('s-pending').textContent = pending;
  document.getElementById('s-done').textContent    = done;

  // Bar
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-pct').textContent  = pct + '%';

  // Circle (circumference = 2π×42 ≈ 263.9)
  const circ   = 263.9;
  const offset = circ - (pct / 100) * circ;
  const fill   = document.getElementById('circle-fill');
  if (fill) fill.style.strokeDashoffset = offset;
  const circPct = document.getElementById('circle-pct');
  if (circPct) circPct.textContent = pct + '%';

  // Productivity score (weighted)
  const score = Math.min(100, Math.round(pct * 0.7 + (done * 3)));
  const el = document.getElementById('prod-score');
  if (el) el.textContent = score;
}

// ===========================
//  ANALYTICS BARS
// ===========================
function renderAnalytics() {
  const container = document.getElementById('analytics-bars');
  if (!container) return;

  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const max   = Math.max(...days.map(d => weeklyData[d] || 0), 1);

  container.innerHTML = days.map(day => {
    const val    = weeklyData[day] || 0;
    const height = Math.round((val / max) * 70);
    return `
      <div class="bar-col">
        <div class="bar-val">${val}</div>
        <div class="bar-fill" style="height:${height}px"></div>
        <div class="bar-day">${day}</div>
      </div>
    `;
  }).join('');
}

// ===========================
//  RENDER TASK LIST
// ===========================
function renderTasks() {
  const list      = getFilteredTasks();
  const container = document.getElementById('tasks-list');

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-msg">
        <span>📋</span>
        No tasks found. Add one above!
      </div>`;
    return;
  }

  container.innerHTML = list.map(task => {
    const priClass  = task.priority === 'high' ? 'ph' : task.priority === 'medium' ? 'pm' : 'pl';
    const priCard   = 'pri-' + task.priority;
    const dateLabel = formatDate(task.date);
    const overdue   = task.date && task.date < getTodayDate() && !task.done;
    const catLabel  = CAT_LABELS[task.category] || '';

    // Subtasks mini
    const subtasksHTML = task.subtasks && task.subtasks.length
      ? `<div class="subtasks-mini">
          ${task.subtasks.map(s => `
            <div class="subtask-item">
              <div class="subtask-chk ${s.done ? 'done' : ''}" onclick="toggleSubtask(${task.id}, ${s.id})"></div>
              <span style="${s.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${s.text}</span>
            </div>
          `).join('')}
        </div>` : '';

    return `
      <div class="task-card ${task.done ? 'done-card' : ''} ${priCard}" data-id="${task.id}">
        <button
          class="chk-btn ${task.done ? 'on' : ''}"
          onclick="toggleTask(${task.id})"
          aria-label="Toggle complete"
        >${task.done ? '✓' : ''}</button>

        <div class="task-body">
          <div class="task-top">
            <span class="task-name ${task.done ? 'done-txt' : ''}">${task.text}</span>
          </div>
          <div class="task-meta">
            <span class="pri-pill ${priClass}">${task.priority}</span>
            ${catLabel ? `<span class="cat-tag">${catLabel}</span>` : ''}
            ${dateLabel ? `<span class="task-dt ${overdue ? 'overdue' : ''}">${dateLabel}</span>` : ''}
          </div>
          ${task.note ? `<div class="task-note">📝 ${task.note}</div>` : ''}
          ${subtasksHTML}
        </div>

        <div class="task-actions">
          <button class="edit-btn" onclick="openEditModal(${task.id})" title="Edit">✏️</button>
          <button class="del-btn"  onclick="deleteTask(${task.id})"    title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');

  // Drag & Drop with SortableJS
  if (window.Sortable) {
    new Sortable(container, {
      animation:     180,
      ghostClass:    'sortable-ghost',
      chosenClass:   'sortable-chosen',
      dragClass:     'sortable-drag',
      onEnd(evt) {
        const filtered = getFilteredTasks();
        const movedId  = parseInt(evt.item.dataset.id);
        const movedTask = filtered[evt.oldIndex];
        if (!movedTask) return;

        // Reorder in main tasks array
        const fromIdx = tasks.findIndex(t => t.id === movedId);
        tasks.splice(fromIdx, 1);
        const targetId  = filtered[evt.newIndex] && filtered[evt.newIndex].id;
        const toIdx     = targetId ? tasks.findIndex(t => t.id === targetId) : tasks.length;
        tasks.splice(toIdx, 0, movedTask);
        saveTasks();
      }
    });
  }
}

// ===========================
//  MAIN RENDER
// ===========================
function render() {
  updateStats();
  renderTasks();
  renderAnalytics();
}

// ===========================
//  EDIT MODAL
// ===========================
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  editSubtasks  = [...(task.subtasks || [])];

  document.getElementById('edit-text').value = task.text;
  document.getElementById('edit-note').value = task.note || '';
  document.getElementById('edit-date').value = task.date || '';

  renderModalSubtasks();

  document.getElementById('modal-overlay').style.display = 'flex';
}

function renderModalSubtasks() {
  const container = document.getElementById('subtasks-list');
  container.innerHTML = editSubtasks.map(s => `
    <div class="subtask-modal-item">
      <span>${s.text}</span>
      <button class="subtask-del" onclick="removeEditSubtask(${s.id})">✕</button>
    </div>
  `).join('');
}

function removeEditSubtask(subId) {
  editSubtasks = editSubtasks.filter(s => s.id !== subId);
  renderModalSubtasks();
}

function addEditSubtask() {
  const inp = document.getElementById('subtask-input');
  const txt = inp.value.trim();
  if (!txt) return;
  editSubtasks.push({ id: Date.now(), text: txt, done: false });
  inp.value = '';
  renderModalSubtasks();
}

function saveEdit() {
  const text = document.getElementById('edit-text').value.trim();
  const note = document.getElementById('edit-note').value.trim();
  const date = document.getElementById('edit-date').value;
  if (!text) return;

  tasks = tasks.map(t => t.id === editingTaskId
    ? { ...t, text, note, date, subtasks: editSubtasks }
    : t
  );
  saveTasks();
  closeModal();
  render();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingTaskId = null;
  editSubtasks  = [];
}

// ===========================
//  CONFETTI 🎉
// ===========================
function fireConfetti() {
  if (!window.confetti) return;
  confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, colors: ['#E91E8C','#7C3AED','#4A6CF7','#FF6EC7','#A78BFA'] });
  setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.45 } }), 350);
}

// ===========================
//  NOTIFICATIONS
// ===========================
function requestNotifications() {
  if (!('Notification' in window)) {
    alert('Your browser does not support notifications.');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      new Notification('My Tasks 🔔', { body: 'Notifications enabled! You\'ll get reminders for tasks.' });
    }
  });
}

function scheduleNotification(task) {
  if (Notification.permission !== 'granted') return;
  // Show immediately for today's tasks as a demo
  setTimeout(() => {
    new Notification('Task Reminder 🔔', {
      body: `Don't forget: "${task.text}"`,
      icon: '✅'
    });
  }, 5000);
}

// ===========================
//  VOICE INPUT
// ===========================
let recognition = null;

function isSecureContext() {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

function startVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Show overlay first
  document.getElementById('voice-overlay').style.display = 'flex';

  // If not secure context OR no SpeechRecognition → show type mode
  if (!SpeechRec || !isSecureContext()) {
    showVoiceFallback();
    return;
  }

  // Try to start recognition
  try {
    recognition = new SpeechRec();
    recognition.lang           = 'en-US';
    recognition.interimResults = true;
    recognition.continuous     = false;

    // Show mic UI
    setVoiceMode('mic');

    recognition.onstart = () => {
      setVoiceStatus('🎤 Listening... speak now!');
    };

    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      // Show live transcript in overlay
      setVoiceStatus('🗣️ ' + transcript);
      if (e.results[e.results.length - 1].isFinal) {
        document.getElementById('task-input').value = transcript;
        setVoiceStatus('✅ Got it! Adding task...');
        setTimeout(() => stopVoice(), 800);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Mic permission denied → fallback to type mode
        showVoiceFallback();
      } else {
        setVoiceStatus('❌ Error: ' + e.error + '. Try typing below.');
        showVoiceFallback();
      }
    };

    recognition.onend = () => {
      if (document.getElementById('voice-overlay').style.display !== 'none') {
        // Ended without result → show fallback
        showVoiceFallback();
      }
    };

    recognition.start();

  } catch (err) {
    showVoiceFallback();
  }
}

function setVoiceMode(mode) {
  const micUI  = document.getElementById('voice-mic-ui');
  const typeUI = document.getElementById('voice-type-ui');
  if (micUI)  micUI.style.display  = mode === 'mic'  ? 'block' : 'none';
  if (typeUI) typeUI.style.display = mode === 'type' ? 'block' : 'none';
}

function setVoiceStatus(msg) {
  const el = document.getElementById('voice-status');
  if (el) el.textContent = msg;
}

function showVoiceFallback() {
  // Stop any recognition
  if (recognition) { try { recognition.stop(); } catch(e){} recognition = null; }
  setVoiceMode('type');
  const inp = document.getElementById('voice-type-inp');
  if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 100); }
}

function submitVoiceType() {
  const inp = document.getElementById('voice-type-inp');
  if (!inp || !inp.value.trim()) return;
  document.getElementById('task-input').value = inp.value.trim();
  inp.value = '';
  stopVoice();
}

function stopVoice() {
  if (recognition) { try { recognition.stop(); } catch(e){} recognition = null; }
  document.getElementById('voice-overlay').style.display = 'none';
  setVoiceMode('mic'); // reset for next time
}

// ===========================
//  POMODORO TIMER
// ===========================
function setPomoMode(minutes, label) {
  clearInterval(pomoInterval);
  pomoRunning = false;
  pomoMinutes = minutes;
  pomoSeconds = 0;
  pomoLabel   = label;
  updatePomoDisplay();
  document.getElementById('pomo-start').disabled = false;
  document.getElementById('pomo-pause').disabled = true;
  document.getElementById('pomo-status').textContent = 'Ready to ' + label.toLowerCase();
}

function updatePomoDisplay() {
  const m = String(pomoMinutes).padStart(2, '0');
  const s = String(pomoSeconds).padStart(2, '0');
  document.getElementById('pomo-time').textContent = m + ':' + s;
}

function startPomo() {
  if (pomoRunning) return;
  pomoRunning = true;
  document.getElementById('pomo-start').disabled = true;
  document.getElementById('pomo-pause').disabled = false;
  document.getElementById('pomo-status').textContent = pomoLabel + ' in progress...';

  pomoInterval = setInterval(() => {
    if (pomoSeconds === 0) {
      if (pomoMinutes === 0) {
        clearInterval(pomoInterval);
        pomoRunning = false;
        document.getElementById('pomo-status').textContent = '✅ ' + pomoLabel + ' complete!';
        document.getElementById('pomo-start').disabled = false;
        document.getElementById('pomo-pause').disabled = true;
        if (Notification.permission === 'granted') {
          new Notification('🍅 Pomodoro', { body: pomoLabel + ' session complete! Take a break.' });
        }
        return;
      }
      pomoMinutes--;
      pomoSeconds = 59;
    } else {
      pomoSeconds--;
    }
    updatePomoDisplay();
  }, 1000);
}

function pausePomo() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  document.getElementById('pomo-start').disabled  = false;
  document.getElementById('pomo-pause').disabled  = true;
  document.getElementById('pomo-status').textContent = 'Paused';
}

function resetPomo() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  const active = document.querySelector('.pomo-mode.active');
  const min    = active ? parseInt(active.dataset.min) : 25;
  const lbl    = active ? active.dataset.label : 'Focus';
  setPomoMode(min, lbl);
}

// ===========================
//  LIVE CLOCK
// ===========================
function startClock() {
  function tick() {
    const now = new Date();
    const dateEl = document.getElementById('live-date');
    const timeEl = document.getElementById('live-time');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ===========================
//  SVG GRADIENT FOR CIRCLE
// ===========================
function injectSVGGradient() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;width:0;height:0';
  svg.innerHTML = `
    <defs>
      <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#E91E8C"/>
        <stop offset="50%"  stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#4A6CF7"/>
      </linearGradient>
    </defs>`;
  document.body.prepend(svg);
}

// ===========================
//  SORTABLE GHOST STYLE
// ===========================
function injectSortableStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .sortable-ghost  { opacity: 0.35; background: rgba(124,58,237,0.12) !important; }
    .sortable-chosen { box-shadow: 0 12px 40px rgba(124,58,237,0.30) !important; }
    .sortable-drag   { opacity: 0.9; }
  `;
  document.head.appendChild(style);
}

// ===========================
//  EVENT LISTENERS
// ===========================
function setupEvents() {
  // Add task
  document.getElementById('add-btn').addEventListener('click', addTask);
  document.getElementById('task-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  // Filter buttons
  document.querySelectorAll('.f-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id !== 'close-modal-btn') setFilter(btn.dataset.filter);
    });
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', e => {
    sortMode = e.target.value;
    render();
  });

  // Theme toggle
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  // Voice input
  document.getElementById('voice-btn').addEventListener('click', startVoice);
  document.getElementById('stop-voice-btn').addEventListener('click', stopVoice);
  document.getElementById('stop-voice-btn2').addEventListener('click', stopVoice);
  document.getElementById('voice-type-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitVoiceType();
  });

  // Notifications
  document.getElementById('notif-btn').addEventListener('click', requestNotifications);

  // Pomodoro
  document.getElementById('pomo-start').addEventListener('click', startPomo);
  document.getElementById('pomo-pause').addEventListener('click', pausePomo);
  document.getElementById('pomo-reset').addEventListener('click', resetPomo);

  document.querySelectorAll('.pomo-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pomo-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPomoMode(parseInt(btn.dataset.min), btn.dataset.label);
    });
  });

  // Modal
  document.getElementById('save-edit-btn').addEventListener('click', saveEdit);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.getElementById('add-subtask-btn').addEventListener('click', addEditSubtask);
  document.getElementById('subtask-input').addEventListener('keydown', e => { if (e.key === 'Enter') addEditSubtask(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); toggleTheme(); }
  });
}

// ===========================
//  INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  injectSVGGradient();
  injectSortableStyles();
  initTheme();
  loadTasks();
  setupEvents();
  startClock();
  updateStreak();
  showQuote();
  render();
});