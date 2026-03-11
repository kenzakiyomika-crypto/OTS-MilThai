/**
 * TACTICAL FITNESS — PHASE 1 NOTIFICATION SYSTEM
 * ══════════════════════════════════════════════════
 * Week 3:
 *   1. Web Push Notification — เตือนเวลา training
 *   2. Streak Guard — แจ้งก่อน streak ขาด
 *   3. LocalNotification fallback — ไม่ต้องการ server
 * ══════════════════════════════════════════════════
 */

'use strict';

const NotificationSystem = (() => {

  /* ── CONFIG ── */
  const STORAGE_KEY = 'tf_notif_prefs';
  const DEFAULT_PREFS = {
    enabled:        false,
    trainingHour:   6,     // 06:00
    trainingMin:    0,
    streakGuardHour: 20,   // 20:00 — ถ้ายังไม่ได้ฝึก
    streakGuardMin:  0,
    permission:     'default',
  };

  function loadPrefs() {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch(e) { return { ...DEFAULT_PREFS }; }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch(e) {}
  }

  /* ── REQUEST PERMISSION ── */
  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    const prefs  = loadPrefs();
    prefs.permission = result;
    savePrefs(prefs);
    return result;
  }

  /* ── SHOW NOTIFICATION ── */
  function show(title, body, icon = '/icons/icon-192.png', data = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag:   data.tag || 'tf-general',
        data,
        vibrate: [100, 50, 100],
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        if (data.url) window.location.href = data.url;
        n.close();
      };
      return n;
    } catch(e) {
      console.warn('[Notif] Failed:', e.message);
    }
  }

  /* ── SCHEDULE via setTimeout (LocalNotification) ── */
  // ใช้ setTimeout สำหรับ notification ภายใน session (tab ยังเปิดอยู่)
  const _scheduled = {};

  function schedule(key, title, body, atHour, atMin, url = '') {
    // Cancel existing
    cancel(key);

    const now    = new Date();
    const target = new Date();
    target.setHours(atHour, atMin, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const ms = target - now;
    console.log(`[Notif] Scheduled "${key}" in ${Math.round(ms/60000)} min`);

    _scheduled[key] = setTimeout(() => {
      show(title, body, '/icons/icon-192.png', { tag: key, url });
      delete _scheduled[key];
    }, ms);
  }

  function cancel(key) {
    if (_scheduled[key]) {
      clearTimeout(_scheduled[key]);
      delete _scheduled[key];
    }
  }

  function cancelAll() {
    Object.keys(_scheduled).forEach(cancel);
  }

  /* ── SMART SCHEDULE based on profile ── */
  async function scheduleDaily(profile, todayLogs) {
    const prefs = loadPrefs();
    if (!prefs.enabled || Notification.permission !== 'granted') return;

    const streak      = profile?.currentStreak || 0;
    const trainedToday = todayLogs && todayLogs.length > 0;

    // 1. Morning training reminder
    const rankName = profile?.currentRank || 'Operator';
    schedule(
      'morning_training',
      `⚡ MISSION BRIEFING — ${rankName}`,
      'ถึงเวลา training แล้ว — ร่างกายพร้อม execute ภารกิจวันนี้',
      prefs.trainingHour,
      prefs.trainingMin,
      '/pages/training.html'
    );

    // 2. Streak Guard — เตือนตอนเย็นถ้ายังไม่ได้ฝึก
    if (!trainedToday && streak >= 3) {
      const urgency = streak >= 30 ? '🔥🔥' : streak >= 7 ? '🔥' : '⚠️';
      schedule(
        'streak_guard',
        `${urgency} STREAK GUARD — ${streak} วัน กำลังจะขาด!`,
        `อีก ${getHoursUntilMidnight()} ชั่วโมงก่อน streak ${streak} วันจะหายไป — EXECUTE NOW`,
        prefs.streakGuardHour,
        prefs.streakGuardMin,
        '/pages/training.html'
      );
    }
  }

  function getHoursUntilMidnight() {
    const now      = new Date();
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    return Math.round((midnight - now) / 3600000);
  }

  /* ── INSTANT NOTIFICATIONS (for in-app events) ── */
  const instant = {
    streakMilestone(streak) {
      show(
        `🔥 ${streak} DAY STREAK!`,
        `ความมุ่งมั่น ${streak} วันต่อเนื่อง — OPERATOR level dedication`,
        '/icons/icon-192.png',
        { tag: 'streak_milestone', url: '/pages/rank.html' }
      );
    },
    rankUp(rankName) {
      show(
        `🎖 RANK UP → ${rankName}`,
        `เลื่อนยศสำเร็จ! พลังของ ${rankName} unlock แล้ว`,
        '/icons/icon-192.png',
        { tag: 'rank_up', url: '/pages/rank.html' }
      );
    },
    missionComplete(missionName) {
      show(
        `⚔ MISSION COMPLETE`,
        `"${missionName}" — EXECUTED WITH EXCELLENCE`,
        '/icons/icon-192.png',
        { tag: 'mission_complete', url: '/pages/missions.html' }
      );
    },
    newPR(exercise, value, unit) {
      show(
        `💪 NEW PR — ${exercise}`,
        `${value} ${unit} — ทำลาย personal record!`,
        '/icons/icon-192.png',
        { tag: 'new_pr', url: '/pages/performance.html' }
      );
    },
  };

  /* ── SETTINGS UI RENDERER ── */
  function renderSettingsUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const prefs    = loadPrefs();
    const supported = 'Notification' in window;
    const granted   = supported && Notification.permission === 'granted';

    container.innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div>
            <div style="font-family:'Bebas Neue',cursive;font-size:16px;letter-spacing:2px;color:${granted?'var(--green)':'var(--gray)'}">
              ${supported ? (granted ? '🔔 NOTIFICATION ACTIVE' : '🔕 NOTIFICATION OFF') : '⚠ NOT SUPPORTED'}
            </div>
            <div style="font-size:9px;color:var(--gray);letter-spacing:1px;margin-top:2px">
              ${granted ? 'การแจ้งเตือนเปิดใช้งาน' : supported ? 'กดเพื่อเปิดการแจ้งเตือน' : 'Browser ไม่รองรับ'}
            </div>
          </div>
          ${supported && !granted ? `<button onclick="NotificationSystem.enable()" style="
            background:var(--green);color:#000;border:none;border-radius:5px;
            padding:8px 14px;font-family:'Bebas Neue',cursive;font-size:14px;
            letter-spacing:2px;cursor:pointer;flex-shrink:0;
          ">ENABLE</button>` : ''}
        </div>

        ${granted ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div>
            <div style="font-size:8px;letter-spacing:2px;color:var(--gray2);margin-bottom:5px">TRAINING TIME</div>
            <input type="time" id="notif-training-time"
              value="${String(prefs.trainingHour).padStart(2,'0')}:${String(prefs.trainingMin).padStart(2,'0')}"
              style="background:var(--bg3);border:1px solid var(--border);color:var(--white);padding:6px 8px;border-radius:4px;font-family:'Share Tech Mono',monospace;font-size:11px;width:100%">
          </div>
          <div>
            <div style="font-size:8px;letter-spacing:2px;color:var(--gray2);margin-bottom:5px">STREAK GUARD</div>
            <input type="time" id="notif-streak-time"
              value="${String(prefs.streakGuardHour).padStart(2,'0')}:${String(prefs.streakGuardMin).padStart(2,'0')}"
              style="background:var(--bg3);border:1px solid var(--border);color:var(--white);padding:6px 8px;border-radius:4px;font-family:'Share Tech Mono',monospace;font-size:11px;width:100%">
          </div>
        </div>
        <button onclick="NotificationSystem.saveFromUI()" style="
          background:var(--green-dim);border:1px solid rgba(0,255,136,.25);color:var(--green);
          border-radius:5px;padding:8px 16px;font-family:'Share Tech Mono',monospace;
          font-size:10px;letter-spacing:1px;cursor:pointer;
        ">💾 SAVE SCHEDULE</button>
        <button onclick="NotificationSystem.testNotif()" style="
          background:var(--bg3);border:1px solid var(--border);color:var(--gray);
          border-radius:5px;padding:8px 16px;font-family:'Share Tech Mono',monospace;
          font-size:10px;cursor:pointer;margin-left:8px;
        ">🔔 TEST</button>
        ` : ''}
      </div>
    `;
  }

  async function enable() {
    const result = await requestPermission();
    if (result === 'granted') {
      const prefs = loadPrefs();
      prefs.enabled = true;
      savePrefs(prefs);
      // Re-render
      renderSettingsUI('notif-settings-container');
    }
  }

  function saveFromUI() {
    const trainingTime = document.getElementById('notif-training-time')?.value;
    const streakTime   = document.getElementById('notif-streak-time')?.value;
    if (!trainingTime && !streakTime) return;

    const prefs = loadPrefs();
    if (trainingTime) {
      const [h, m] = trainingTime.split(':').map(Number);
      prefs.trainingHour = h; prefs.trainingMin = m;
    }
    if (streakTime) {
      const [h, m] = streakTime.split(':').map(Number);
      prefs.streakGuardHour = h; prefs.streakGuardMin = m;
    }
    prefs.enabled = true;
    savePrefs(prefs);

    // Show saved feedback
    const btn = document.querySelector('[onclick="NotificationSystem.saveFromUI()"]');
    if (btn) { btn.textContent = '✓ SAVED'; setTimeout(() => btn.textContent = '💾 SAVE SCHEDULE', 1500); }
  }

  function testNotif() {
    show('⚡ TEST NOTIFICATION', 'ระบบแจ้งเตือน Tactical Fitness ทำงานปกติ', '/icons/icon-192.png', { tag: 'test' });
  }

  /* ── AUTO-INIT on page load ── */
  function autoInit(profile, todayLogs) {
    const prefs = loadPrefs();
    if (prefs.enabled && Notification.permission === 'granted') {
      scheduleDaily(profile, todayLogs);
    }
  }

  return {
    requestPermission,
    show,
    schedule,
    cancel,
    cancelAll,
    scheduleDaily,
    instant,
    renderSettingsUI,
    enable,
    saveFromUI,
    testNotif,
    autoInit,
    loadPrefs,
    savePrefs,
  };
})();

window.NotificationSystem = NotificationSystem;
