/**
 * TACTICAL FITNESS — PHASE 1 TRAINING ENHANCEMENTS
 * ══════════════════════════════════════════════════
 * Week 2 Upgrades:
 *   1. Wake Lock API — หน้าจอไม่ดับระหว่างฝึก
 *   2. Haptic Feedback — สั่นตาม event แต่ละประเภท
 *   3. Smart Rest Timer — ปรับเวลาพักตาม RPE อัตโนมัติ
 *   4. Quick-Log Swipe — บันทึก reps ด้วย gesture
 *   5. Audio Coach — Web Speech Synthesis ภาษาไทย
 * ══════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════
   1. WAKE LOCK — ป้องกันหน้าจอดับ
══════════════════════════════════════════════ */
const WakeLockManager = (() => {
  let _lock = null;
  let _active = false;

  async function acquire() {
    if (!('wakeLock' in navigator)) {
      console.log('[WakeLock] Not supported on this device');
      return false;
    }
    try {
      _lock   = await navigator.wakeLock.request('screen');
      _active = true;
      console.log('[WakeLock] Acquired');

      // Re-acquire on visibility change (iOS/Android background)
      document.addEventListener('visibilitychange', _onVisibility);
      _lock.addEventListener('release', () => {
        _active = false;
        console.log('[WakeLock] Released by system');
      });
      return true;
    } catch (err) {
      console.warn('[WakeLock] Failed:', err.message);
      return false;
    }
  }

  async function _onVisibility() {
    if (document.visibilityState === 'visible' && !_active) {
      await acquire();
    }
  }

  function release() {
    if (_lock) {
      _lock.release();
      _lock   = null;
      _active = false;
      document.removeEventListener('visibilitychange', _onVisibility);
      console.log('[WakeLock] Released manually');
    }
  }

  function isActive() { return _active; }

  return { acquire, release, isActive };
})();

/* ══════════════════════════════════════════════
   2. HAPTIC FEEDBACK — สั่นแต่ละ event
══════════════════════════════════════════════ */
const Haptic = {
  // ตรวจสอบว่า vibrate รองรับหรือไม่
  supported: 'vibrate' in navigator,

  // Set complete — medium click
  setDone()     { this._v([40]); },
  // PR achieved — celebration
  prAchieved()  { this._v([50, 30, 50, 30, 100]); },
  // Workout done — long pulse
  workoutDone() { this._v([80, 40, 80, 40, 200]); },
  // Risk warning — strong pulse
  riskAlert()   { this._v([200, 100, 200]); },
  // Rest start — light tap
  restStart()   { this._v([20]); },
  // Countdown (last 3s) — quick tick
  countdownTick(){ this._v([15]); },
  // Session start
  sessionStart() { this._v([30, 20, 30, 20, 60]); },
  // Error
  error()       { this._v([100, 50, 100]); },

  _v(pattern) {
    if (this.supported) {
      try { navigator.vibrate(pattern); } catch(e) {}
    }
  },
};

/* ══════════════════════════════════════════════
   3. SMART REST TIMER
   ปรับเวลาพักอัตโนมัติตาม RPE ที่ผู้ใช้รายงาน
══════════════════════════════════════════════ */
const SmartRestTimer = (() => {

  /**
   * คำนวณเวลาพักอัจฉริยะ
   * @param {number} baseRest   - เวลาพักตั้งต้น (seconds)
   * @param {number} rpe        - RPE ที่รายงาน (1-10), null = ไม่รายงาน
   * @param {number} setNumber  - set ที่เพิ่งทำเสร็จ (เริ่มที่ 1)
   * @param {number} totalSets  - sets ทั้งหมด
   * @returns {object} { seconds, reason, color }
   */
  function calc(baseRest, rpe, setNumber, totalSets) {
    let secs   = baseRest || 60;
    let reason = 'ตามแผน';
    let color  = 'green';

    // RPE adjustment
    if (rpe !== null && rpe !== undefined) {
      if (rpe >= 9) {
        secs   = Math.round(baseRest * 1.5);
        reason = `RPE ${rpe} สูงมาก — พักนานขึ้น 50%`;
        color  = 'red';
      } else if (rpe >= 7) {
        secs   = Math.round(baseRest * 1.2);
        reason = `RPE ${rpe} — พักนานขึ้น 20%`;
        color  = 'amber';
      } else if (rpe <= 4) {
        secs   = Math.round(baseRest * 0.75);
        reason = `RPE ${rpe} เบา — ลดพัก 25%`;
        color  = 'green';
      }
    }

    // Last set before final: extra rest
    if (setNumber === totalSets - 1 && totalSets > 2) {
      secs   = Math.round(secs * 1.15);
      reason += ' + ก่อน set สุดท้าย';
    }

    // Min/max bounds
    secs = Math.max(15, Math.min(300, secs));

    return { seconds: secs, reason, color };
  }

  /**
   * Quick RPE popup — แสดงหลัง set complete
   */
  function showRPEPopup(onSelect) {
    // Remove existing
    const existing = document.getElementById('rpe-quick-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'rpe-quick-popup';
    popup.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(13,13,13,.96); border:1px solid #2a2a2a;
      border-radius:12px; padding:12px 16px; z-index:500;
      box-shadow:0 8px 32px rgba(0,0,0,.8);
      animation: slideUp .25s cubic-bezier(0.16,1,0.3,1) both;
    `;

    // Inject animation keyframe once
    if (!document.getElementById('rpe-anim-style')) {
      const s = document.createElement('style');
      s.id = 'rpe-anim-style';
      s.textContent = `
        @keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes slideDown { from{opacity:1} to{opacity:0;transform:translateX(-50%) translateY(20px)} }
      `;
      document.head.appendChild(s);
    }

    popup.innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#444;letter-spacing:2px;margin-bottom:8px;text-align:center">RPE — ความหนักแค่ไหน?</div>
      <div style="display:flex;gap:6px;justify-content:center">
        ${[1,2,3,4,5,6,7,8,9,10].map(r => `
          <button onclick="window._rpeSelect(${r})" style="
            width:32px;height:32px;border-radius:6px;border:1px solid #2a2a2a;
            background:#111;color:${r>=9?'#ff2d2d':r>=7?'#ffaa00':'#00ff88'};
            font-family:'Share Tech Mono',monospace;font-size:13px;cursor:pointer;
            transition:all .1s;
          " onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='#111'">${r}</button>
        `).join('')}
      </div>
      <div style="text-align:center;margin-top:8px">
        <button onclick="window._rpeSelect(null)" style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#444;background:none;border:none;cursor:pointer">SKIP</button>
      </div>
    `;

    document.body.appendChild(popup);

    window._rpeSelect = (rpe) => {
      popup.style.animation = 'slideDown .2s ease both';
      setTimeout(() => { popup.remove(); delete window._rpeSelect; }, 200);
      onSelect(rpe);
    };

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (document.getElementById('rpe-quick-popup') === popup) {
        window._rpeSelect && window._rpeSelect(null);
      }
    }, 8000);
  }

  return { calc, showRPEPopup };
})();

/* ══════════════════════════════════════════════
   4. QUICK-LOG SWIPE GESTURE
   Swipe up on exercise row = +1 set complete
   Swipe down = undo
══════════════════════════════════════════════ */
const QuickLogGesture = (() => {
  function attach(element, onSwipeUp, onSwipeDown) {
    let startY = null;
    let startX = null;

    element.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }, { passive: true });

    element.addEventListener('touchend', e => {
      if (startY === null) return;
      const dy = startY - e.changedTouches[0].clientY;
      const dx = Math.abs(startX - e.changedTouches[0].clientX);

      // Only vertical swipes (not horizontal scrolls)
      if (Math.abs(dy) > 40 && dx < 60) {
        if (dy > 0 && onSwipeUp)   { onSwipeUp();   Haptic.setDone(); }
        if (dy < 0 && onSwipeDown) { onSwipeDown();  }
      }
      startY = null; startX = null;
    }, { passive: true });
  }

  return { attach };
})();

/* ══════════════════════════════════════════════
   5. AUDIO COACH — Web Speech Synthesis ภาษาไทย
══════════════════════════════════════════════ */
const AudioCoach = (() => {
  let _enabled = true;
  let _voice   = null;

  // Find Thai voice or fallback
  function _initVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    _voice = voices.find(v => v.lang.startsWith('th')) ||
             voices.find(v => v.lang.startsWith('en')) ||
             null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = _initVoice;
    _initVoice();
  }

  function speak(text, rate = 1.0) {
    if (!_enabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = 'th-TH';
      utt.rate   = rate;
      utt.volume = 0.8;
      if (_voice) utt.voice = _voice;
      window.speechSynthesis.speak(utt);
    } catch(e) {}
  }

  function setEnabled(v) { _enabled = v; }
  function isEnabled()   { return _enabled; }

  // Presets
  const say = {
    sessionStart:    () => speak('เริ่ม mission ได้เลย!'),
    setComplete:     (n, total) => speak(`เซ็ต ${n} จาก ${total} เสร็จแล้ว`),
    restStart:       (s) => speak(`พัก ${s} วินาที`),
    restDone:        () => speak('หมดเวลาพัก เริ่มได้'),
    countdown3:      () => speak('สาม'),
    countdown2:      () => speak('สอง'),
    countdown1:      () => speak('หนึ่ง'),
    exerciseDone:    (name) => speak(`${name} เสร็จแล้ว ยอดเยี่ยม`),
    workoutComplete: () => speak('Mission complete! ยอดเยี่ยมมาก'),
    newPR:           () => speak('PR ใหม่! สุดยอด!'),
    formWarning:     () => speak('ระวัง form'),
    rpeHigh:         () => speak('RPE สูง พักนานขึ้นนะ'),
  };

  return { speak, say, setEnabled, isEnabled };
})();

/* ══════════════════════════════════════════════
   6. TRAINING SESSION OVERLAY PATCHES
   Inject into existing training.html flow
══════════════════════════════════════════════ */
const Phase1Training = {

  /** เรียกตอน session start */
  async onSessionStart() {
    const locked = await WakeLockManager.acquire();
    Haptic.sessionStart();
    AudioCoach.say.sessionStart();
    if (!locked) console.warn('[Phase1] Wake Lock unavailable — screen may sleep');
    this._patchRestTimer();
    this._injectRPEToSets();
  },

  /** เรียกตอน session end */
  onSessionEnd() {
    WakeLockManager.release();
    Haptic.workoutDone();
    AudioCoach.say.workoutComplete();
  },

  /** เรียกตอน set complete */
  onSetComplete(setNum, totalSets, baseRest, nextExName) {
    Haptic.setDone();
    AudioCoach.say.setComplete(setNum, totalSets);

    // Show RPE popup → then smart rest
    SmartRestTimer.showRPEPopup((rpe) => {
      const rest = SmartRestTimer.calc(baseRest, rpe, setNum, totalSets);
      this._showSmartRestBadge(rest);
      // Call existing startRest if available
      if (typeof startRest === 'function') {
        AudioCoach.say.restStart(rest.seconds);
        startRest(rest.seconds, nextExName || '', () => {
          AudioCoach.say.restDone();
          Haptic.restStart();
        });
      }
    });
  },

  /** เรียกตอน exercise complete */
  onExerciseDone(name) {
    AudioCoach.say.exerciseDone(name);
    Haptic.setDone();
  },

  /** เรียกตอน PR ใหม่ */
  onNewPR() {
    Haptic.prAchieved();
    AudioCoach.say.newPR();
    this._showPRFlash();
  },

  /** Countdown tick (last 3s) */
  onCountdown(remaining) {
    Haptic.countdownTick();
    if (remaining === 3) AudioCoach.say.countdown3();
    if (remaining === 2) AudioCoach.say.countdown2();
    if (remaining === 1) AudioCoach.say.countdown1();
  },

  /* ── Internal helpers ── */

  _showSmartRestBadge(rest) {
    const existing = document.getElementById('smart-rest-badge');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'smart-rest-badge';
    el.style.cssText = `
      position:fixed; top:70px; right:16px; z-index:400;
      background:rgba(13,13,13,.95); border:1px solid ${rest.color === 'red' ? '#ff2d2d' : rest.color === 'amber' ? '#ffaa00' : '#00ff88'};
      border-radius:8px; padding:8px 12px;
      font-family:'Share Tech Mono',monospace; font-size:10px;
      color:${rest.color === 'red' ? '#ff2d2d' : rest.color === 'amber' ? '#ffaa00' : '#00ff88'};
      animation: fadeInUp .3s var(--ease-out) both;
    `;
    el.innerHTML = `⏱ REST: ${rest.seconds}s<br><span style="color:#444;font-size:8px">${rest.reason}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, rest.seconds * 1000 + 1000);
  },

  _showPRFlash() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; inset:0; z-index:600;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none;
    `;
    el.innerHTML = `
      <div style="
        font-family:'Bebas Neue',cursive; font-size:72px; letter-spacing:8px;
        color:#00ff88; text-shadow:0 0 40px #00ff88, 0 0 80px rgba(0,255,136,.4);
        animation: prFlash .8s ease both;
      ">NEW PR!</div>
    `;
    if (!document.getElementById('pr-flash-style')) {
      const s = document.createElement('style');
      s.id = 'pr-flash-style';
      s.textContent = `@keyframes prFlash {
        0%   { opacity:0; transform:scale(.7); }
        30%  { opacity:1; transform:scale(1.1); }
        70%  { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(.95); }
      }`;
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  _patchRestTimer() {
    // Inject countdown hook into existing beepCountdown if present
    const original = window.beepCountdown;
    if (typeof original === 'function') {
      window.beepCountdown = (n) => {
        original(n);
        if (n <= 3) this.onCountdown(n);
      };
    }
  },

  _injectRPEToSets() {
    // Attach swipe gestures to exercise rows when screen-active is shown
    const observer = new MutationObserver(() => {
      const rows = document.querySelectorAll('.exercise-row:not([data-gesture])');
      rows.forEach(row => {
        row.setAttribute('data-gesture', '1');
        QuickLogGesture.attach(row,
          () => { row.click(); }, // swipe up = log set
          null
        );
      });
    });
    const active = document.getElementById('screen-active');
    if (active) observer.observe(active, { childList: true, subtree: true });
  },
};

/* ══════════════════════════════════════════════
   EXPORTS — attach to window for global access
══════════════════════════════════════════════ */
window.WakeLockManager = WakeLockManager;
window.Haptic          = Haptic;
window.SmartRestTimer  = SmartRestTimer;
window.QuickLogGesture = QuickLogGesture;
window.AudioCoach      = AudioCoach;
window.Phase1Training  = Phase1Training;
