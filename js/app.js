// Терминальный интерфейс, аудио и осциллограф СМИЛ

// Аудио-синтезатор на Web Audio API
const TerminalAudio = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    const saved = localStorage.getItem('serbsky_audio_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
    this.updateHeaderUI();
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('serbsky_audio_enabled', this.enabled);
    this.updateHeaderUI();
    if (this.enabled) {
      this.playTone(880, 'sine', 0.08, 0.05);
    }
    return this.enabled;
  },

  updateHeaderUI() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    const label = document.querySelector('.sound-label');
    if (!btn || !icon || !label) return;

    if (this.enabled) {
      icon.textContent = '🔊';
      label.textContent = '[AUDIO: ON]';
      btn.style.borderColor = 'var(--term-green-bright)';
      btn.style.color = 'var(--term-green-bright)';
    } else {
      icon.textContent = '🔇';
      label.textContent = '[AUDIO: OFF]';
      btn.style.borderColor = 'var(--term-border)';
      btn.style.color = 'var(--term-green-dim)';
    }
  },

  playTone(freq, type, duration, gainVal = 0.06) {
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio ignore safely
    }
  },

  playKeyClick() {
    this.playTone(1400, 'square', 0.025, 0.035);
  },

  playBeep() {
    this.playTone(960, 'sine', 0.05, 0.04);
  },

  playAlarm() {
    this.playTone(480, 'sawtooth', 0.12, 0.08);
    setTimeout(() => this.playTone(360, 'sawtooth', 0.18, 0.08), 80);
  },

  playVictory() {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.16, 0.07), idx * 90);
    });
  },

  playDefeat() {
    [440, 370, 310, 220].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.2, 0.07), idx * 110);
    });
  }
};

// Состояние игры
const AppState = {
  currentScreen: 'briefing', // 'briefing' | 'questionnaire' | 'verdict'
  selectedCaseId: 'fire', // 'fire' | 'hunter' | 'voices'
  selectedStrategyId: 'insanity', // 'insanity' | 'dissimulation' | 'affect'
  currentQuestionIndex: 0,
  answers: new Map(), // questionId -> 'yes'/'no'
  interventionAnswers: [],
  activeIntervention: null,
  telemetry: null,
  results: null,
  verdict: null,
  chartInstance: null
};

// Хелпер генерации ASCII прогресс-бара
function getAsciiProgressBar(current, total, length = 20) {
  const progress = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(progress * length);
  const empty = length - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + Math.round(progress * 100) + '%';
}

// Инициализация
function initApp() {
  TerminalAudio.init();
  AppState.telemetry = new Telemetry();
  renderScreen('briefing');
  setupKeyboardListeners();
  setupSoundToggleListener();
}

function setupSoundToggleListener() {
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      TerminalAudio.toggle();
    });
  }
}

// Рендер экранов
function renderScreen(screenName) {
  AppState.currentScreen = screenName;
  const container = document.getElementById('app');
  if (!container) return;

  // Сброс скролла вьюпорта наверх при переключении экранов
  container.scrollTop = 0;
  if (typeof container.scrollTo === 'function') {
    container.scrollTo(0, 0);
  }
  window.scrollTo(0, 0);

  switch (screenName) {
    case 'briefing':
      container.innerHTML = renderBriefingScreen();
      attachBriefingListeners();
      break;
    case 'dossier':
      container.innerHTML = renderDossierScreen();
      attachDossierListeners();
      break;
    case 'questionnaire':
      container.innerHTML = renderQuestionnaireScreen();
      attachQuestionnaireListeners();
      break;
    case 'verdict':
      container.innerHTML = renderVerdictScreen();
      attachVerdictListeners();
      initChart();
      break;
    case 'debrief':
      container.innerHTML = renderDebriefScreen();
      attachDebriefListeners();
      break;
  }

  // Повторный сброс скролла после наполнения DOM
  container.scrollTop = 0;
}

// Экран 1: Выбор дела и тактики защиты
function renderBriefingScreen() {
  const selectedCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const selectedStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];

  const asciiBanner = `
  _   _    _    _____ ____ ___ 
 | \\ | |  / \\  | ____| __ )_ _|
 |  \\| | / _ \\ |  _| |  _ \\| | 
 | |\\  |/ ___ \\| |___| |_) | | 
 |_| \\_/_/   \\_\\_____|____/___|

  ____  _____ ____  ____  ____  _  _  ___   ____   ___  
 / ___|| ____|  _ \\| __ )/ ___|| |/ // _ \\ / ___| / _ \\ 
 \\___ \\|  _| | |_) |  _ \\\\___ \\| ' /| | | | |  _ | | | |
  ___) | |___|  _ <| |_) |___) | . \\| |_| | |_| || |_| |
 |____/|_____|_| \\_\\____/|____/|_|\\_\\\\___/ \\____| \\___/ 

   ____    _    __  __ _____ 
  / ___|  / \\  |  \\/  | ____|
 | |  _  / _ \\ | |\\/| |  _|  
 | |_| |/ ___ \\| |  | | |___ 
  \\____/_/   \\_\\_|  |_|_____|
`;

  return `
    <div class="fade-in max-w-4xl mx-auto">
      <!-- ДВУХКОЛОНОЧНАЯ ШАПКА: СЛЕВА РАДУЖНЫЙ LOLCAT ASCII АРТ, СПРАВА ОПИСАНИЕ -->
      <div class="briefing-hero-grid">
        <div class="briefing-hero-art">
          <pre class="ascii-logo-banner ascii-lolcat-rainbow">${asciiBanner}</pre>
        </div>
        <div class="briefing-hero-info">
          <div class="text-xs text-white/70 font-mono mt-1 leading-relaxed">
            ● Симулятор судебно-психиатрической экспертизы по стандарту MMPI-2 / СМИЛ [100 вопросов].
          </div>
          <div class="text-xs text-white/70 font-mono mt-0.5 leading-relaxed">
            ● Время прохождения ~15 минут.
          </div>
          <div class="text-xs text-white/80 font-mono mt-0.5 leading-relaxed">
            ● Придумала и разработала <a href="https://t.me/gcodegspot" target="_blank" rel="noopener noreferrer" class="term-author-link">https://t.me/gcodegspot</a>
          </div>
          <div class="briefing-feature-pills mt-2.5">
            <span class="hero-pill">● ТЕЛЕМЕТРИЯ РЕАКЦИИ</span>
            <span class="hero-pill">● ДЕТЕКТОР СИМУЛЯЦИИ</span>
            <span class="hero-pill">● КОНСИЛИУМ</span>
            <span class="hero-pill">● ВЕРДИКТ</span>
          </div>
        </div>
      </div>

      <!-- ВЫДЕЛЯЮЩАЯСЯ ПЛАШКА: СТАТУС ПОДСЛЕДСТВЕННОГО -->
      <div class="briefing-status-callout">
        <span class="status-callout-icon">⚠</span>
        <span class="status-callout-text"><strong>Вы совершили тяжкое преступление</strong> и вас прижали прямыми уликами. Вы находитесь на стационарной СПЭ в Институте им. Сербского. Ваша задача — <strong>любой ценой избежать пожизненного заключения или скостить срок</strong>. Выберите фабулу содеянного и линию защиты: симулировать сумасшествие (ПММХ), доказывать оговор через маску абсолютной нормы или свалить всё на нервный срыв (ст. 22 УК РФ).</span>
      </div>

      <!-- ВЫБОР 1: УГОЛОВНОЕ ДЕЛО (КАРТОЧКИ) -->
      <div class="mt-4">
        <div class="section-tag-mini">
          <span>[1-3]</span> ВЫБЕРИТЕ УГОЛОВНОЕ ДЕЛО (СОДЕЯННОЕ И УЛИКИ):
        </div>
        <div class="briefing-cards-grid">
          ${CASES.map((c, idx) => `
            <div class="briefing-card ${c.id === AppState.selectedCaseId ? 'selected' : ''}" data-case-id="${c.id}">
              <div class="card-header-row">
                <span class="card-badge ${c.badgeClass}">[ ${idx + 1} | ${c.code} ]</span>
              </div>
              <div class="card-main-title">${c.title}</div>
              <div class="card-article-sub">${c.article}</div>
              <div class="card-desc-preview">${c.charge}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ВЫБОР 2: МОДЕЛЬ ПОВЕДЕНИЯ (КАРТОЧКИ) -->
      <div class="mt-4">
        <div class="section-tag-mini">
          <span>[4-6]</span> ВЫБЕРИТЕ СТРАТЕГИЮ ЗАЩИТЫ (КАК ОТМАЗАТЬСЯ):
        </div>
        <div class="briefing-cards-grid">
          ${STRATEGIES.map((s, idx) => `
            <div class="briefing-card ${s.id === AppState.selectedStrategyId ? 'selected' : ''}" data-strategy-id="${s.id}">
              <div class="card-header-row">
                <span class="card-badge badge-strategy">[ ${idx + 4} | ${s.tag} ]</span>
              </div>
              <div class="card-main-title">${s.title}</div>
              <div class="card-article-sub">${s.subtitle}</div>
              <div class="card-desc-preview text-white/90">Цель: ${s.successOutcome}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- КНОПКА ПЕРЕХОДА К ДОСЬЕ -->
      <div class="text-center mt-5 mb-2">
        <button id="btn-to-dossier" class="btn-terminal-exec-mini">
          [ ДАЛЕЕ: МАТЕРИАЛЫ ДЕЛА И ПЛАН (ENTER) → ]
        </button>
        <div class="text-[11px] text-white/40 font-mono mt-2">
          Навигация: [1-3] — дело &nbsp;•&nbsp; [4-6] — стратегия &nbsp;•&nbsp; [ENTER] — перейти к досье
        </div>
      </div>
    </div>
  `;
}

function selectCase(caseId) {
  AppState.selectedCaseId = caseId;
  document.querySelectorAll('[data-case-id]').forEach(card => {
    if (card.getAttribute('data-case-id') === caseId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function selectStrategy(strategyId) {
  AppState.selectedStrategyId = strategyId;
  document.querySelectorAll('[data-strategy-id]').forEach(card => {
    if (card.getAttribute('data-strategy-id') === strategyId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function attachBriefingListeners() {
  document.querySelectorAll('[data-case-id]').forEach(card => {
    card.addEventListener('click', () => {
      TerminalAudio.playKeyClick();
      selectCase(card.getAttribute('data-case-id'));
    });
  });

  document.querySelectorAll('[data-strategy-id]').forEach(card => {
    card.addEventListener('click', () => {
      TerminalAudio.playKeyClick();
      selectStrategy(card.getAttribute('data-strategy-id'));
    });
  });

  const btnToDossier = document.getElementById('btn-to-dossier');
  if (btnToDossier) {
    btnToDossier.addEventListener('click', () => {
      TerminalAudio.playBeep();
      renderScreen('dossier');
    });
  }
}

// Экран 2: Досье и инструктаж адвоката
function renderDossierScreen() {
  const selectedCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const selectedStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];

  return `
    <div class="fade-in max-w-4xl mx-auto flex flex-col justify-between" style="min-height: 100%;">
      <div>
        <!-- ВЕРХНИЙ БАР НАВИГАЦИИ -->
        <div class="dossier-nav-bar">
          <button id="btn-back-to-briefing" class="btn-terminal-back">
            ← [ ESC ] ИЗМЕНИТЬ ДЕЛО / ВЕКТОР
          </button>
        </div>

        <!-- ВЫБРАННЫЕ ДАННЫЕ (2 КОМПАКТНЫХ БЛОКА) -->
        <div class="dossier-summary-grid">
          <div class="summary-box border-[#ffb000]/40">
            <div class="summary-box-label text-[#ffb000]">&gt;&gt; ВЫБРАННОЕ ДЕЛО:</div>
            <div class="summary-box-title">${selectedCase.title} <span class="text-xs font-mono text-[var(--term-green-bright)]">[${selectedCase.code}]</span></div>
            <div class="summary-box-sub text-white/60 font-mono">${selectedCase.article}</div>
          </div>
          <div class="summary-box border-[#00f0ff]/40">
            <div class="summary-box-label text-[#00f0ff]">&gt;&gt; ВЫБРАННЫЙ ТАКТИЧЕСКИЙ ВЕКТОР:</div>
            <div class="summary-box-title">${selectedStrategy.title} <span class="text-xs font-mono text-[#00f0ff]">[${selectedStrategy.tag}]</span></div>
            <div class="summary-box-sub text-white/60 font-mono">${selectedStrategy.subtitle}</div>
          </div>
        </div>

        <!-- 2 ПОЛНЫХ КАРТОЧКИ: МАТЕРИАЛЫ ДЕЛА И СОВЕТЫ АДВОКАТА -->
        <div class="briefing-dossier-grid mt-3">
          <!-- Карточка 1: Материалы дела -->
          <div class="dossier-card">
            <div class="dossier-header text-[#ffb000]">
              &gt;&gt; МАТЕРИАЛЫ УГОЛОВНОГО ДЕЛА [${selectedCase.code}]:
            </div>
            <div class="dossier-body">
              <p class="mb-2 leading-relaxed"><strong>Фабула обвинения:</strong> ${selectedCase.fabula}</p>
              <div class="dossier-meta mt-3">
                <div><strong class="text-white">Фокус экспертизы комиссии:</strong> ${selectedCase.focus}</div>
                <div><strong class="text-[#ff5555]">Угроза приговора:</strong> ${selectedCase.risk}</div>
              </div>
            </div>
          </div>

          <!-- Карточка 2: Инструкция адвоката -->
          <div class="dossier-card dossier-cyan">
            <div class="dossier-header text-[#00f0ff]">
              &gt;&gt; ИНСТРУКЦИЯ АДВОКАТА И ПЛАН ЗАЩИТЫ [${selectedStrategy.tag}]:
            </div>
            <div class="dossier-body">
              <p class="mb-2 italic text-white/95 leading-relaxed">«${selectedStrategy.targetDesc}»</p>
              <div class="dossier-meta mt-3">
                <div><strong class="text-[#00ff66]">Желаемый вердикт (Цель):</strong> ${selectedStrategy.successOutcome}</div>
                <div><strong class="text-[#ffb000]">Главный риск / Ловушка:</strong> ${selectedStrategy.failureOutcome}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- КНОПКА СТАРТА -->
      <div class="text-center mt-4 mb-2">
        <button id="btn-start" class="btn-terminal-exec-mini">
          [ НАЧАТЬ ЭКСПЕРТИЗУ (ENTER) ]
        </button>
      </div>
      <div class="text-center text-[11px] text-white/40 font-mono mb-1">
        Управление: [1] / [Y] — ДА &nbsp;•&nbsp; [2] / [N] — НЕТ &nbsp;•&nbsp; [ESC] — Вернуться к выбору
      </div>
    </div>
  `;
}

function attachDossierListeners() {
  const btnBack = document.getElementById('btn-back-to-briefing');
  const btnStart = document.getElementById('btn-start');

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      TerminalAudio.playKeyClick();
      renderScreen('briefing');
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      TerminalAudio.playBeep();
      startQuestionnaire();
    });
  }
}

function startQuestionnaire() {
  AppState.currentQuestionIndex = 0;
  AppState.answers.clear();
  AppState.interventionAnswers = [];
  AppState.activeIntervention = null;
  AppState.telemetry = new Telemetry();
  renderScreen('questionnaire');
}

// Экран 3: Потоковый опросник
function renderQuestionnaireScreen() {
  const currentCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const currentStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];
  const percent = Math.round(((AppState.currentQuestionIndex + 1) / QUESTIONS.length) * 100);
  const question = QUESTIONS[AppState.currentQuestionIndex];

  return `
    <div class="terminal-stream-layout fade-in">
      <!-- Компактный верхний HUD (в одну строку) -->
      <div class="terminal-hud-compact">
        <div class="hud-item font-bold text-white">
          <span class="text-[#00b347]">${currentCase.code}</span> • <span class="text-[#ffb000]">${currentStrategy.title}</span>
        </div>
        <div class="hud-item hud-center-progress flex items-center justify-center gap-2">
          <div class="term-progress-wrap">
            <span class="term-bracket">[</span>
            <div class="term-progress-track">
              <div id="hud-progress-fill" class="term-progress-fill" style="width: ${percent}%;"></div>
            </div>
            <span class="term-bracket">]</span>
          </div>
          <span id="hud-percent" class="font-mono text-xs text-[#00ff66] font-bold">${percent}%</span>
          <span id="hud-counter" class="text-xs text-white/50 font-mono">(${AppState.currentQuestionIndex + 1}/100)</span>
        </div>
        <div class="hud-item recording-tag text-xs">
          <span class="rec-pulse-dot"></span>
          <span>REC</span>
        </div>
      </div>

      <!-- Потоковая лента вопросов (чистый скролл) -->
      <div id="terminal-feed" class="terminal-feed-container">
        <!-- Активный вопрос -->
        ${renderActiveQuestionHtml(question)}
      </div>

      <!-- Нижний компактный док ответов -->
      <div id="terminal-dock" class="terminal-stream-dock-mini">
        <button id="btn-dock-yes" class="btn-dock-mini btn-dock-yes">
          [ 1 ] ДА
        </button>
        <button id="btn-dock-no" class="btn-dock-mini btn-dock-no">
          [ 2 ] НЕТ
        </button>
      </div>
    </div>
  `;
}

// Генерация разметки для активного вопроса (минималистичный вид)
function renderActiveQuestionHtml(question) {
  return `
    <div id="active-question-node" class="stream-active-box fade-in">
      <div class="stream-active-text">
        ${question.text}
      </div>
      <div class="stream-active-prompt">
        <span class="prompt-arrow">&gt;</span> [ 1 ] ДА &nbsp;&nbsp; [ 2 ] НЕТ <span class="term-cursor"></span>
      </div>
    </div>
  `;
}

function attachQuestionnaireListeners() {
  const btnYes = document.getElementById('btn-dock-yes');
  const btnNo = document.getElementById('btn-dock-no');

  if (btnYes) btnYes.addEventListener('click', () => handleAnswer('yes'));
  if (btnNo) btnNo.addEventListener('click', () => handleAnswer('no'));

  const question = QUESTIONS[AppState.currentQuestionIndex];
  if (question && AppState.telemetry) {
    AppState.telemetry.startTimer(question.id);
  }

  scrollFeedToBottom();
}

function scrollFeedToBottom() {
  const feed = document.getElementById('terminal-feed');
  if (feed) {
    setTimeout(() => {
      feed.scrollTo({
        top: feed.scrollHeight,
        behavior: 'smooth'
      });
    }, 25);
  }
}

// Обработка ответа в потоковом терминале
function handleAnswer(answer) {
  if (AppState.activeIntervention) return;

  const question = QUESTIONS[AppState.currentQuestionIndex];
  if (!question) return;

  TerminalAudio.playKeyClick();
  AppState.answers.set(question.id, answer);
  AppState.telemetry.recordResponse(question.id, question);

  // Подсветка кнопки при выборе
  const dockBtn = answer === 'yes' ? document.getElementById('btn-dock-yes') : document.getElementById('btn-dock-no');
  if (dockBtn) {
    dockBtn.classList.add('btn-flash');
    setTimeout(() => dockBtn.classList.remove('btn-flash'), 140);
  }

  // Получаем тайминг реакции
  const lastResponse = AppState.telemetry && AppState.telemetry.responseTimes
    ? AppState.telemetry.responseTimes.find(r => r.questionId === question.id)
    : null;
  const latency = lastResponse && lastResponse.responseTime ? (lastResponse.responseTime / 1000).toFixed(2) + 's' : '0.00s';

  // Преобразуем активный блок в компактную строку лога
  const activeNode = document.getElementById('active-question-node');
  if (activeNode) {
    activeNode.removeAttribute('id');
    activeNode.className = 'stream-past-item';
    activeNode.innerHTML = `
      <span class="stream-past-num">Q-${String(question.id).padStart(3, '0')}</span>
      <span class="stream-past-text">${question.text}</span>
      <span class="stream-past-ans ${answer === 'yes' ? 'ans-yes' : 'ans-no'}">[ ${answer === 'yes' ? 'ДА' : 'НЕТ'} ]</span>
      <span class="stream-past-time">${latency}</span>
    `;
  }

  // Проверяем наличие клинической интервенции
  const intervention = INTERVENTIONS.find(i => i.atQuestionIndex === AppState.currentQuestionIndex);
  if (intervention) {
    TerminalAudio.playAlarm();
    showInterventionStream(intervention);
    return;
  }

  advanceToNextQuestionStream();
}

// Переход к следующему вопросу в ленте
function advanceToNextQuestionStream() {
  AppState.currentQuestionIndex++;

  if (AppState.currentQuestionIndex >= QUESTIONS.length) {
    finishQuestionnaire();
    return;
  }

  const nextQuestion = QUESTIONS[AppState.currentQuestionIndex];
  const feed = document.getElementById('terminal-feed');
  if (!feed) return;

  // Обновляем верхний HUD
  const percent = Math.round(((AppState.currentQuestionIndex + 1) / QUESTIONS.length) * 100);
  const hudFill = document.getElementById('hud-progress-fill');
  const hudPercent = document.getElementById('hud-percent');
  const hudCounter = document.getElementById('hud-counter');
  if (hudFill) {
    hudFill.style.width = `${percent}%`;
  }
  if (hudPercent) {
    hudPercent.textContent = `${percent}%`;
  }
  if (hudCounter) {
    hudCounter.textContent = `(${AppState.currentQuestionIndex + 1}/100)`;
  }

  // Добавляем новый активный вопрос в конец ленты
  feed.insertAdjacentHTML('beforeend', renderActiveQuestionHtml(nextQuestion));

  // Запускаем таймер телеметрии
  if (AppState.telemetry) {
    AppState.telemetry.startTimer(nextQuestion.id);
  }

  scrollFeedToBottom();
}

// Клиническая интервенция в потоке (компактная)
function showInterventionStream(intervention) {
  AppState.activeIntervention = intervention;
  const feed = document.getElementById('terminal-feed');
  const dock = document.getElementById('terminal-dock');
  if (!feed) return;

  if (dock) {
    dock.style.opacity = '0.3';
    dock.style.pointerEvents = 'none';
  }

  const intervHtml = `
    <div id="active-intervention-node" class="stream-intervention-box-mini">
      <div class="stream-interv-header-mini">
        <span>[ !!! КЛИНИЧЕСКИЙ КОНСИЛИУМ // ВНЕПЛАНОВАЯ ПРОВЕРКА !!! ]</span>
      </div>
      <div class="stream-interv-doctor-mini">
        &gt;&gt; ${intervention.expertName}:
      </div>
      <div class="stream-interv-prompt-mini">
        ${intervention.doctorPrompt}
      </div>
      <div class="text-[11px] text-white/60 font-mono mb-2">
        Выберите вариант ответа (клавиши 1-4):
      </div>
      <div class="stream-interv-options-mini">
        ${intervention.options.map((opt, idx) => `
          <button class="btn-stream-interv-opt-mini" data-opt-index="${idx}">
            <span class="text-[#ffb000] font-bold font-mono mr-1.5">[ ${idx + 1} ]</span> «${opt.text}»
          </button>
        `).join('')}
      </div>
    </div>
  `;

  feed.insertAdjacentHTML('beforeend', intervHtml);
  scrollFeedToBottom();

  document.querySelectorAll('.btn-stream-interv-opt-mini').forEach(btn => {
    btn.addEventListener('click', () => {
      const optIdx = parseInt(btn.getAttribute('data-opt-index'), 10);
      handleInterventionChoice(optIdx);
    });
  });
}

function handleInterventionChoice(optIdx) {
  if (!AppState.activeIntervention) return;
  const chosenOption = AppState.activeIntervention.options[optIdx];
  if (!chosenOption) return;

  TerminalAudio.playKeyClick();
  AppState.interventionAnswers.push(chosenOption);

  const intervNode = document.getElementById('active-intervention-node');
  if (intervNode) {
    intervNode.removeAttribute('id');
    intervNode.className = 'stream-past-item';
    intervNode.style.borderLeftColor = 'var(--term-amber)';
    intervNode.innerHTML = `
      <span class="stream-past-num text-[#ffb000]">КОНСИЛИУМ</span>
      <span class="stream-past-text text-[#ffb000]">«${chosenOption.text}»</span>
      <span class="stream-past-ans text-[#ffb000]">[ ВАРИАНТ ${optIdx + 1} ]</span>
      <span class="stream-past-time">OK</span>
    `;
  }

  AppState.activeIntervention = null;

  const dock = document.getElementById('terminal-dock');
  if (dock) {
    dock.style.opacity = '1';
    dock.style.pointerEvents = 'auto';
  }

  advanceToNextQuestionStream();
}

// Горячие клавиши терминала
function setupKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    // Звук Mute / Unmute (клавиша M / Ь)
    if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
      e.preventDefault();
      TerminalAudio.toggle();
      return;
    }

    // Режим интервенции (клавиши 1, 2, 3, 4)
    if (AppState.activeIntervention) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const optIdx = parseInt(e.key, 10) - 1;
        handleInterventionChoice(optIdx);
      }
      return;
    }

    // Режим брифинга (выбор дел 1-3, стратегий 4-6, Enter для перехода к досье)
    if (AppState.currentScreen === 'briefing') {
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const caseIdx = parseInt(e.key, 10) - 1;
        if (CASES[caseIdx]) {
          TerminalAudio.playKeyClick();
          selectCase(CASES[caseIdx].id);
        }
        return;
      }
      if (e.key === '4' || e.key === '5' || e.key === '6') {
        const stratIdx = parseInt(e.key, 10) - 4;
        if (STRATEGIES[stratIdx]) {
          TerminalAudio.playKeyClick();
          selectStrategy(STRATEGIES[stratIdx].id);
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        TerminalAudio.playBeep();
        renderScreen('dossier');
      }
      return;
    }

    // Режим досье (Escape/Backspace - назад, Enter/Space - старт)
    if (AppState.currentScreen === 'dossier') {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        TerminalAudio.playKeyClick();
        renderScreen('briefing');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        TerminalAudio.playBeep();
        startQuestionnaire();
        return;
      }
    }

    // Режим опросника (клавиши 1, 2, Y, N, Стрелки, Enter, Space)
    if (AppState.currentScreen === 'questionnaire') {
      const isYes = e.key === '1' ||
        e.key === 'y' || e.key === 'Y' ||
        e.key === 'н' || e.key === 'Н' ||
        e.key === 'ArrowLeft' || e.key === 'Enter';

      const isNo = e.key === '2' ||
        e.key === 'n' || e.key === 'N' ||
        e.key === 'т' || e.key === 'Т' ||
        e.key === 'ArrowRight' || e.key === ' ';

      if (isYes) {
        e.preventDefault();
        handleAnswer('yes');
      } else if (isNo) {
        e.preventDefault();
        handleAnswer('no');
      }
      return;
    }

    // Режим вердикта (клавиши D/В для разбора, R/К/Enter для рестарта)
    if (AppState.currentScreen === 'verdict') {
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        e.preventDefault();
        const btnDebrief = document.getElementById('btn-to-debrief');
        if (btnDebrief) btnDebrief.click();
        return;
      }
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К' || e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById('btn-restart');
        if (btn) btn.click();
        return;
      }
      return;
    }

    // Режим разбора полетов (Escape / Backspace / V - возврат к вердикту, R / Enter - рестарт)
    if (AppState.currentScreen === 'debrief') {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
        e.preventDefault();
        const btnBack = document.getElementById('btn-back-to-verdict');
        if (btnBack) btnBack.click();
        return;
      }
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        e.preventDefault();
        const btnRestart = document.getElementById('btn-debrief-restart');
        if (btnRestart) btnRestart.click();
        return;
      }
      return;
    }
  });
}

// Завершение тестирования
function finishQuestionnaire() {
  const selectedCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const selectedStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];

  const calculator = new ScaleCalculator(AppState.answers, QUESTIONS, AppState.interventionAnswers);
  AppState.results = calculator.calculateAll();
  AppState.verdict = VerdictEngine.determineVerdict(AppState.results, AppState.telemetry, selectedCase, selectedStrategy);

  if (AppState.verdict.isVictory) {
    TerminalAudio.playVictory();
  } else {
    TerminalAudio.playDefeat();
  }

  renderScreen('verdict');
}

// Экран 4: Итоговый вердикт комиссии и профиль СМИЛ
function renderVerdictScreen() {
  const { rawScores, tScores, vrinScore, trinScore, goughIndex, fpScore } = AppState.results;
  const verdict = AppState.verdict;
  const selectedCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const selectedStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];
  const avgTime = AppState.telemetry.getAverageTimeSeconds();
  const totalTime = AppState.telemetry.getTotalTimeSeconds();
  const hesitation = AppState.telemetry.detectCognitiveHesitation();
  const randomClick = AppState.telemetry.detectRandomClicking();

  return `
    <div class="fade-in">
      <!-- Главный герой-баннер -->
      <div class="terminal-verdict-banner ${verdict.isVictory ? 'banner-win' : 'banner-loss'}">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="banner-title">
              <span class="banner-status-tag ${verdict.isVictory ? 'tag-win' : 'tag-loss'}">[ ${verdict.isVictory ? 'SUCCESS' : 'FAIL'} ]</span> ${verdict.victoryBanner}
            </h2>
            <div class="text-sm text-white/80 font-medium mt-1">
              ${verdict.victorySubtitle}
            </div>
          </div>
          <div>
            <div class="terminal-stamp ${verdict.isVictory ? 'stamp-win' : 'stamp-loss'}">
              ${verdict.stamp}
            </div>
          </div>
        </div>

        <!-- Разбор дела и стратегии -->
        <div class="terminal-breakdown-card">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div class="border border-[#00ff66]/20 p-2.5 bg-black/40">
              <div class="text-white/50 uppercase text-xs font-mono mb-1">УГОЛОВНОЕ ДЕЛО:</div>
              <div class="text-white font-bold text-sm md:text-base">${selectedCase.code} • ${selectedCase.title}</div>
              <div class="text-white/70 text-xs mt-0.5">${selectedCase.article}</div>
            </div>
            <div class="border border-[#00ff66]/20 p-2.5 bg-black/40">
              <div class="text-white/50 uppercase text-xs font-mono mb-1">МОДЕЛЬ ЗАЩИТЫ:</div>
              <div class="text-[#ffb000] font-bold text-sm md:text-base">${selectedStrategy.title} (${selectedStrategy.tag})</div>
              <div class="text-white/70 text-xs mt-0.5">${selectedStrategy.subtitle}</div>
            </div>
          </div>

          <div class="font-mono text-sm leading-relaxed space-y-2">
            <div class="breakdown-row">
              <span class="breakdown-tag">[ ЦЕЛЬ СТРАТЕГИИ ]:</span>
              <span class="breakdown-text text-white/90">${verdict.verdictGoal}</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-tag">[ РЕШАЮЩИЙ ФАКТОР ]:</span>
              <span class="breakdown-text ${verdict.isVictory ? 'text-[#00ff66]' : 'text-[#ff5555]'} font-bold">${verdict.keyFactor}</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-tag">[ ОЦЕНКА ПО ДЕЛУ ]:</span>
              <span class="breakdown-text text-white/90">${verdict.caseSpecificAnalysis}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Осциллограф СМИЛ -->
      <div class="terminal-chart-box">
        <div class="chart-header-tag">
          &gt;&gt; PSYCHOMETRIC SPECTRUM MONITOR // MMPI-2 PROFILE OSCILLOSCOPE
        </div>
        <canvas id="smil-chart"></canvas>
      </div>

      <!-- Таблица шкал СМИЛ -->
      <table class="terminal-matrix-table">
        <thead>
          <tr>
            <th>Шкала СМИЛ / Параметр</th>
            <th>Сырой балл</th>
            <th>Т-балл (Стандарт)</th>
            <th>Клиническая интерпретация</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Шкала L (Ложь / Святость)</td>
            <td>${rawScores.L} / 12</td>
            <td><strong class="text-white">${tScores.L} T</strong></td>
            <td>${tScores.L >= 65 ? 'Критическое превышение — демонстрация гипернормативности' : tScores.L >= 55 ? 'Умеренная коррекция' : 'Нормативная искренность'}</td>
          </tr>
          <tr>
            <td>Шкала F (Дистресс / Напряжение)</td>
            <td>${rawScores.F}</td>
            <td><strong class="text-white">${tScores.F} T</strong></td>
            <td>${tScores.F >= 70 ? 'Выраженная дезорганизация / психопатизация' : tScores.F >= 60 ? 'Умеренный эмоциональный дистресс' : 'Эмоциональный баланс'}</td>
          </tr>
          <tr>
            <td>Шкала K (Защита / Самоконтроль)</td>
            <td>${rawScores.K}</td>
            <td><strong class="text-white">${tScores.K} T</strong></td>
            <td>${tScores.K >= 65 ? 'Выраженная закрытость и психологическая защита' : tScores.K <= 40 ? 'Открытость / беззащитность' : 'Адекватный самоконтроль'}</td>
          </tr>
          <tr>
            <td>Шкала Pa (Паранойя / Бред отношения)</td>
            <td>${rawScores.Pa}</td>
            <td><strong class="text-white">${tScores.Pa} T</strong></td>
            <td>${tScores.Pa >= 70 ? 'Выраженная бредовая симптоматика / подозрительность' : tScores.Pa >= 60 ? 'Склонность к ригидности' : 'Норма'}</td>
          </tr>
          <tr>
            <td>Шкала Sc (Шизоидность / Схизис)</td>
            <td>${rawScores.Sc}</td>
            <td><strong class="text-white">${tScores.Sc} T</strong></td>
            <td>${tScores.Sc >= 70 ? 'Выраженная аутизация, схизис, расщепление мышления' : tScores.Sc >= 60 ? 'Своеобразие ассоциаций' : 'Норма'}</td>
          </tr>
          <tr>
            <td>Шкала Pd (Психопатия / Асоциальность)</td>
            <td>${rawScores.Pd}</td>
            <td><strong class="text-white">${tScores.Pd} T</strong></td>
            <td>${tScores.Pd >= 70 ? 'Ядерная диссоциальная психопатия, дефицит эмпатии' : tScores.Pd >= 60 ? 'Импульсивность' : 'Норма'}</td>
          </tr>
          <tr>
            <td>Шкала Fp (Гротескный псевдобред)</td>
            <td><strong class="${fpScore >= 2 ? 'text-[#ff5555]' : 'text-white'}">${fpScore}</strong> / 12</td>
            <td>—</td>
            <td>${fpScore >= 3 ? 'ГРУБАЯ СИМУЛЯЦИЯ (невозможные симптомы)' : fpScore >= 2 ? 'Подозрение на аггравацию' : 'Данных за псевдобред нет'}</td>
          </tr>
          <tr>
            <td>Индекс VRIN (Противоречивость)</td>
            <td><strong class="${vrinScore >= 4 ? 'text-[#ff5555]' : 'text-white'}">${vrinScore}</strong> / 15</td>
            <td>—</td>
            <td>${vrinScore >= 4 ? 'ПРОТОКОЛ НЕДОСТОВЕРЕН (множество противоречий)' : vrinScore >= 2 ? 'Умеренная вариативность' : 'Высокая внутренняя согласованность'}</td>
          </tr>
          <tr>
            <td>Индекс TRIN (Перекос Да/Нет)</td>
            <td><strong>${trinScore}</strong> / 10</td>
            <td>—</td>
            <td>${trinScore >= 7 ? 'Установочная тенденция к согласию/отрицанию' : 'Баланс ответов соблюдён'}</td>
          </tr>
          <tr>
            <td>Индекс Гоуфа (F − K)</td>
            <td><strong>${goughIndex > 0 ? '+' : ''}${goughIndex}</strong></td>
            <td>—</td>
            <td>${goughIndex > 14 ? 'Грубая аггравация' : goughIndex >= 4 ? 'Острый психотический регистр' : goughIndex <= -4 ? 'Диссимуляция / закрытость' : 'Нормативный коридор'}</td>
          </tr>
          <tr>
            <td>Телеметрия: средний темп ответа</td>
            <td>${avgTime} сек</td>
            <td>Всего: ${totalTime} с</td>
            <td>${randomClick ? 'Хаотичное прокликивание' : parseFloat(avgTime) < 0.4 ? 'Аномально быстро' : 'Физиологический темп'}</td>
          </tr>
          <tr>
            <td>Когнитивные паузы на лжи (L/Fp)</td>
            <td>${hesitation ? '<span class="text-[#ff5555]">ОБНАРУЖЕНЫ</span>' : '<span class="text-[#00ff66]">НЕТ</span>'}</td>
            <td>—</td>
            <td>${hesitation ? 'Задержки ответа на шкалы L/Fp указывают на расчетливую симуляцию' : 'Признаков сознательной подгонки не выявлено'}</td>
          </tr>
        </tbody>
      </table>

      <!-- Заключение экспертной комиссии -->
      <div class="terminal-conclusions-box">
        <div class="text-xs font-bold text-[#ffb000] uppercase mb-1">
          &gt;&gt; ЗАКЛЮЧЕНИЕ КОМИССИИ ЭКСПЕРТОВ:
        </div>
        <p class="font-bold text-white mb-2">${verdict.text}</p>
        <p class="text-xs text-white/80 leading-relaxed">${verdict.details}</p>
      </div>

      <!-- Сюжетный эпилог -->
      <div class="terminal-epilogue-box">
        <div class="text-xs font-bold text-[#00f0ff] uppercase mb-1">
          &gt;&gt; ДАЛЬНЕЙШАЯ СУДЬБА ПОДСЛЕДСТВЕННОГО (СУДЕБНОЕ РЕШЕНИЕ):
        </div>
        <p class="text-sm text-white">${verdict.epilogue}</p>
      </div>

      <!-- Панель действий: Разбор полетов и Рестарт -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <button id="btn-to-debrief" class="btn-term-debrief">
          [ &gt;&gt; РАЗБОР ЭКСПЕРТИЗЫ: КАК НАДО БЫЛО ИГРАТЬ И РЕАЛЬНАЯ СПЭ (D) → ]
        </button>
        <button id="btn-restart" class="btn-term-restart">
          [ RE-INITIALIZE / NEW SESSION (R) ]
        </button>
      </div>
    </div>
  `;
}

function attachVerdictListeners() {
  const btnDebrief = document.getElementById('btn-to-debrief');
  if (btnDebrief) {
    btnDebrief.addEventListener('click', () => {
      TerminalAudio.playBeep();
      renderScreen('debrief');
    });
  }

  const btn = document.getElementById('btn-restart');
  if (btn) {
    btn.addEventListener('click', () => {
      TerminalAudio.playKeyClick();
      AppState.currentQuestionIndex = 0;
      AppState.answers.clear();
      AppState.interventionAnswers = [];
      AppState.activeIntervention = null;
      AppState.telemetry = new Telemetry();
      AppState.results = null;
      AppState.verdict = null;
      if (AppState.chartInstance) {
        AppState.chartInstance.destroy();
        AppState.chartInstance = null;
      }
      renderScreen('briefing');
    });
  }
}

// Экран 5: Разбор результатов экспертизы (Debrief)
function renderDebriefScreen() {
  const selectedCase = CASES.find(c => c.id === AppState.selectedCaseId) || CASES[0];
  const selectedStrategy = STRATEGIES.find(s => s.id === AppState.selectedStrategyId) || STRATEGIES[0];
  const debriefData = DebriefEngine.getDebriefData(
    AppState.results,
    AppState.telemetry,
    selectedCase,
    selectedStrategy,
    AppState.verdict
  );

  return `
    <div class="fade-in max-w-4xl mx-auto space-y-6">
      <!-- ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ -->
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#00ff66]/30">
        <button id="btn-back-to-verdict" class="btn-dossier-back">
          ← [ ESC / V ] ВЕРНУТЬСЯ К ВЕРДИКТУ
        </button>
        <div class="text-xs font-mono text-white/70">
          СЕКРЕТНЫЙ РАЗБОР // МЕТОДОЛОГИЯ СПЭ ИНСТИТУТА ИМ. СЕРБСКОГО
        </div>
      </div>

      <!-- СВОДНЫЙ БАННЕР РЕЗУЛЬТАТА -->
      <div class="terminal-debrief-banner ${debriefData.isVictory ? 'banner-win' : 'banner-loss'}">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div class="text-xs font-mono tracking-wider ${debriefData.isVictory ? 'text-[#00ff66]' : 'text-[#ff5555]'} font-bold">
              [ ИТОГОВЫЙ СТАТУС: ${debriefData.isVictory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'} ]
            </div>
            <h2 class="text-xl md:text-2xl font-bold text-white mt-1">
              ${debriefData.verdict.title}
            </h2>
          </div>
          <div class="terminal-stamp ${debriefData.isVictory ? 'stamp-win' : 'stamp-loss'}">
            ${debriefData.verdict.stamp}
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10 font-mono text-xs">
          <div><span class="text-white/50">УГОЛОВНОЕ ДЕЛО:</span> <span class="text-white font-bold">${selectedCase.code} • ${selectedCase.title}</span></div>
          <div><span class="text-white/50">ВЫБРАННАЯ МОДЕЛЬ ЗАЩИТЫ:</span> <span class="text-[#ffb000] font-bold">${selectedStrategy.title}</span></div>
        </div>
      </div>

      <!-- БЛОК 1: ЧТО ВЫ СДЕЛАЛИ (ИНДИВИДУАЛЬНЫЙ АНАЛИЗ ОШИБОК ИЛИ ТОЧНЫХ ХОДОВ) -->
      <div class="terminal-debrief-card">
        <div class="debrief-card-header text-[#ffb000]">
          &gt;&gt; 1. АНАЛИЗ ВАШЕГО ПРОХОЖДЕНИЯ (ГДЕ ВЫ СПАЛИЛИСЬ ИЛИ ЧТО СРАБОТАЛО):
        </div>
        <div class="space-y-3 mt-3">
          ${debriefData.analysisPoints.map(p => `
            <div class="p-3 bg-black/50 border ${p.type === 'success' ? 'border-[#00ff66]/30' : 'border-[#ff5555]/40'}">
              <div class="font-mono text-xs font-bold ${p.type === 'success' ? 'text-[#00ff66]' : 'text-[#ff5555]'} mb-1">
                ${p.tag}
              </div>
              <div class="text-sm text-white/90 leading-relaxed font-mono">
                ${p.text}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- БЛОК 2: ПОБЕДНЫЙ АЛГОРИТМ ДЛЯ ДАННОГО СЦЕНАРИЯ -->
      <div class="terminal-debrief-card">
        <div class="debrief-card-header text-[#00f0ff]">
          &gt;&gt; 2. ПОБЕДНЫЙ АЛГОРИТМ: КАК НАДО БЫЛО ИГРАТЬ ЭТО ДЕЛО И СТРАТЕГИЮ:
        </div>
        <div class="text-xs text-white/70 font-mono mt-1 mb-3">
          Тактическая инструкция по прохождению 100 вопросов MMPI-2 для связки «${selectedCase.title}» × «${selectedStrategy.title}»:
        </div>
        <div class="space-y-3">
          ${debriefData.winningSteps.map(step => `
            <div class="p-3 bg-black/40 border border-[#00f0ff]/20">
              <div class="text-white font-bold text-sm mb-1">${step.title}</div>
              <div class="text-xs text-white/80 leading-relaxed font-mono">${step.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- БЛОК 3: УНИВЕРСАЛЬНЫЙ РАЗБОР РЕАЛЬНОЙ ЭКСПЕРТИЗЫ -->
      <div class="terminal-debrief-card">
        <div class="debrief-card-header text-[#00ff66]">
          &gt;&gt; 3. АНАТОМИЯ РЕАЛЬНОЙ ЭКСПЕРТИЗЫ: ПОЧЕМУ ОБМАНУТЬ СЕРБСКОГО ПОЧТИ НЕВОЗМОЖНО:
        </div>
        <div class="text-xs text-white/70 font-mono mt-1 mb-3">
          Как в действительности устроена стационарная судебно-психиатрическая экспертиза (СПЭ / КСППЭ) в РФ:
        </div>
        <div class="space-y-3">
          ${debriefData.realityDeepDive.map(sec => `
            <div class="p-3.5 bg-black/60 border border-[#00ff66]/25">
              <div class="text-[#00ff66] font-bold text-sm mb-1.5">${sec.topic}</div>
              <div class="text-xs text-white/85 leading-relaxed font-mono">${sec.text}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ -->
      <div class="flex items-center justify-center gap-4 flex-wrap pt-4 pb-8">
        <button id="btn-debrief-back-verdict" class="btn-dossier-back">
          [ ← ВЕРНУТЬСЯ К ВЕРДИКТУ ]
        </button>
        <button id="btn-debrief-restart" class="btn-term-restart">
          [ &gt;&gt; НАЧАТЬ ЗАНОВО / НОВАЯ СЕССИЯ (R) ]
        </button>
      </div>
    </div>
  `;
}

function attachDebriefListeners() {
  const btnBack = document.getElementById('btn-back-to-verdict');
  const btnBack2 = document.getElementById('btn-debrief-back-verdict');
  const btnRestart = document.getElementById('btn-debrief-restart');

  const goBack = () => {
    TerminalAudio.playKeyClick();
    renderScreen('verdict');
  };

  if (btnBack) btnBack.addEventListener('click', goBack);
  if (btnBack2) btnBack2.addEventListener('click', goBack);

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      TerminalAudio.playKeyClick();
      AppState.currentQuestionIndex = 0;
      AppState.answers.clear();
      AppState.interventionAnswers = [];
      AppState.activeIntervention = null;
      AppState.telemetry = new Telemetry();
      AppState.results = null;
      AppState.verdict = null;
      if (AppState.chartInstance) {
        AppState.chartInstance.destroy();
        AppState.chartInstance = null;
      }
      renderScreen('briefing');
    });
  }
}

// Осциллограф СМИЛ (Chart.js)
function initChart() {
  const canvas = document.getElementById('smil-chart');
  if (!canvas) return;

  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
  }

  const { tScores } = AppState.results;
  const labels = ['L (Ложь)', 'F (Дистресс)', 'K (Защита)', 'Pa (Паранойя)', 'Sc (Схизис)', 'Pd (Психопатия)'];
  const data = [
    tScores.L || 50,
    tScores.F || 50,
    tScores.K || 50,
    tScores.Pa || 50,
    tScores.Sc || 50,
    tScores.Pd || 50
  ];

  const ctx = canvas.getContext('2d');

  AppState.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'СПЕКТРОГРАММА ИСПЫТУЕМОГО (Т-БАЛЛЫ)',
          data: data,
          borderColor: '#00ff66',
          backgroundColor: 'rgba(0, 255, 102, 0.15)',
          borderWidth: 3,
          pointBackgroundColor: '#39ff14',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.25
        },
        {
          label: 'ЛИНИЯ НОРМЫ (50 T)',
          data: Array(6).fill(50),
          borderColor: 'rgba(0, 255, 102, 0.35)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'ПОРОГ ПАТОЛОГИИ (70 T)',
          data: Array(6).fill(70),
          borderColor: 'rgba(255, 51, 51, 0.65)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'НИЖНЯЯ ГРАНИЦА (30 T)',
          data: Array(6).fill(30),
          borderColor: 'rgba(0, 240, 255, 0.3)',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.3,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#00ff66',
            font: {
              family: "'Share Tech Mono', monospace",
              size: 11
            },
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#050f07',
          titleColor: '#39ff14',
          bodyColor: '#00ff66',
          borderColor: '#00ff66',
          borderWidth: 1,
          titleFont: {
            family: "'Share Tech Mono', monospace"
          },
          bodyFont: {
            family: "'Share Tech Mono', monospace"
          },
          callbacks: {
            label: function (context) {
              if (context.datasetIndex === 0) {
                return `Т-балл: ${context.parsed.y} T`;
              }
              return context.dataset.label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 255, 102, 0.15)',
            drawBorder: true
          },
          ticks: {
            color: '#00ff66',
            font: {
              family: "'Share Tech Mono', monospace",
              size: 11,
              weight: 'bold'
            }
          }
        },
        y: {
          min: 20,
          max: 110,
          grid: {
            color: 'rgba(0, 255, 102, 0.15)',
            drawBorder: true
          },
          ticks: {
            color: '#00ff66',
            font: {
              family: "'Share Tech Mono', monospace",
              size: 10
            },
            stepSize: 10,
            callback: function (value) {
              return value + ' T';
            }
          }
        }
      }
    }
  });
}

// Запуск
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
