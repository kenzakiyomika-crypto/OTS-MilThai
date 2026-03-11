/**
 * TACTICAL FITNESS — PHASE 3 ENGINE
 * ════════════════════════════════════════════════════
 * Week 9-10:  ACFT Benchmark Test (มาตรฐานทหารไทย + US Army)
 * Week 11-12: Audio Warfare (Web Audio API SFX + Drill Sergeant TTS)
 * Week 13-14: Platoon Mode (QR share + LocalStorage leaderboard)
 * ════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════
   WEEK 9-10 — ACFT BENCHMARK ENGINE
   มาตรฐาน 2 ระบบ: Thai Military + US ACFT
══════════════════════════════════════════════════ */

const ACFTEngine = (() => {

  /* ── Thai Military Fitness Standard (ทหารไทย) ── */
  const THAI_STANDARD = {
    name: 'มาตรฐานสมรรถภาพทางกาย กองทัพไทย',
    events: [
      {
        id: 'pushup_2min', name: 'วิดพื้น 2 นาที', unit: 'reps', higher: true,
        description: 'ทำท่าวิดพื้นให้ได้มากที่สุดภายใน 2 นาที',
        scoring: [
          { grade: 'ดีเยี่ยม', min: 60, color: '#00ff88' },
          { grade: 'ดีมาก',   min: 50, color: '#00d4ff' },
          { grade: 'ดี',      min: 40, color: '#ffaa00' },
          { grade: 'พอใช้',   min: 30, color: '#ff6600' },
          { grade: 'ต่ำกว่าเกณฑ์', min: 0, color: '#ff2d2d' },
        ],
      },
      {
        id: 'situp_2min', name: 'ลุก-นั่ง 2 นาที', unit: 'reps', higher: true,
        description: 'ทำท่าลุก-นั่งให้ได้มากที่สุดภายใน 2 นาที',
        scoring: [
          { grade: 'ดีเยี่ยม', min: 60, color: '#00ff88' },
          { grade: 'ดีมาก',   min: 50, color: '#00d4ff' },
          { grade: 'ดี',      min: 40, color: '#ffaa00' },
          { grade: 'พอใช้',   min: 30, color: '#ff6600' },
          { grade: 'ต่ำกว่าเกณฑ์', min: 0, color: '#ff2d2d' },
        ],
      },
      {
        id: 'run_3km', name: 'วิ่ง 3 กิโลเมตร', unit: 'sec', higher: false,
        description: 'วิ่ง 3 กม. บันทึกเวลาเป็นนาที:วินาที (น้อยกว่า = ดีกว่า)',
        scoring: [
          { grade: 'ดีเยี่ยม', max: 780,  color: '#00ff88' },   // <13:00
          { grade: 'ดีมาก',   max: 900,  color: '#00d4ff' },   // <15:00
          { grade: 'ดี',      max: 1020, color: '#ffaa00' },   // <17:00
          { grade: 'พอใช้',   max: 1140, color: '#ff6600' },   // <19:00
          { grade: 'ต่ำกว่าเกณฑ์', max: 9999, color: '#ff2d2d' },
        ],
      },
      {
        id: 'pullup', name: 'ดึงข้อ', unit: 'reps', higher: true,
        description: 'ดึงข้อให้ได้มากที่สุด ไม่จำกัดเวลา',
        scoring: [
          { grade: 'ดีเยี่ยม', min: 18, color: '#00ff88' },
          { grade: 'ดีมาก',   min: 12, color: '#00d4ff' },
          { grade: 'ดี',      min: 8,  color: '#ffaa00' },
          { grade: 'พอใช้',   min: 4,  color: '#ff6600' },
          { grade: 'ต่ำกว่าเกณฑ์', min: 0, color: '#ff2d2d' },
        ],
      },
    ],
  };

  /* ── US Army Combat Fitness Test (ACFT) ── */
  const US_ACFT = {
    name: 'US Army Combat Fitness Test (ACFT)',
    events: [
      {
        id: 'deadlift_3rm', name: '3-Rep Max Deadlift', unit: 'kg', higher: true,
        description: 'ยกน้ำหนัก 3 ครั้ง บันทึก max weight ที่ยกได้',
        scoring: [
          { grade: 'Gold',   min: 160, color: '#ffd700' },
          { grade: 'Silver', min: 140, color: '#c0c0c0' },
          { grade: 'Bronze', min: 120, color: '#cd7f32' },
          { grade: 'Pass',   min: 80,  color: '#00ff88' },
          { grade: 'Fail',   min: 0,   color: '#ff2d2d' },
        ],
      },
      {
        id: 'spt', name: 'Standing Power Throw', unit: 'm', higher: true,
        description: 'โยนลูกน้ำหนัก 10lb ไปข้างหลัง บันทึกระยะทาง (เมตร × 10)',
        scoring: [
          { grade: 'Gold',   min: 115, color: '#ffd700' },
          { grade: 'Silver', min: 100, color: '#c0c0c0' },
          { grade: 'Bronze', min: 85,  color: '#cd7f32' },
          { grade: 'Pass',   min: 65,  color: '#00ff88' },
          { grade: 'Fail',   min: 0,   color: '#ff2d2d' },
        ],
      },
      {
        id: 'hrpu', name: 'Hand Release Push-up', unit: 'reps', higher: true,
        description: 'วิดพื้นแล้วยกมือขึ้นจากพื้น — 2 นาที',
        scoring: [
          { grade: 'Gold',   min: 70, color: '#ffd700' },
          { grade: 'Silver', min: 55, color: '#c0c0c0' },
          { grade: 'Bronze', min: 40, color: '#cd7f32' },
          { grade: 'Pass',   min: 10, color: '#00ff88' },
          { grade: 'Fail',   min: 0,  color: '#ff2d2d' },
        ],
      },
      {
        id: 'sdc', name: 'Sprint-Drag-Carry (SDC)', unit: 'sec', higher: false,
        description: 'วิ่ง 25m สลับ 5 ท่า รวมระยะ 250m',
        scoring: [
          { grade: 'Gold',   max: 98,  color: '#ffd700' },
          { grade: 'Silver', max: 115, color: '#c0c0c0' },
          { grade: 'Bronze', max: 130, color: '#cd7f32' },
          { grade: 'Pass',   max: 180, color: '#00ff88' },
          { grade: 'Fail',   max: 9999,color: '#ff2d2d' },
        ],
      },
      {
        id: 'plk', name: 'Plank (ไม่จำกัดเวลา)', unit: 'sec', higher: true,
        description: 'ค้างท่า Plank ให้นานที่สุด',
        scoring: [
          { grade: 'Gold',   min: 220, color: '#ffd700' },
          { grade: 'Silver', min: 180, color: '#c0c0c0' },
          { grade: 'Bronze', min: 140, color: '#cd7f32' },
          { grade: 'Pass',   min: 60,  color: '#00ff88' },
          { grade: 'Fail',   min: 0,   color: '#ff2d2d' },
        ],
      },
      {
        id: 'run_2mile', name: '2-Mile Run', unit: 'sec', higher: false,
        description: 'วิ่ง 2 ไมล์ (3.2km) บันทึกเวลา',
        scoring: [
          { grade: 'Gold',   max: 900,  color: '#ffd700' },   // <15:00
          { grade: 'Silver', max: 1020, color: '#c0c0c0' },   // <17:00
          { grade: 'Bronze', max: 1140, color: '#cd7f32' },   // <19:00
          { grade: 'Pass',   max: 1320, color: '#00ff88' },   // <22:00
          { grade: 'Fail',   max: 9999, color: '#ff2d2d' },
        ],
      },
    ],
  };

  const STANDARDS = { thai: THAI_STANDARD, us_acft: US_ACFT };

  function getStandard(id) { return STANDARDS[id]; }
  function getAll()        { return STANDARDS; }

  /**
   * คำนวณ grade สำหรับ event หนึ่ง
   */
  function gradeEvent(event, value) {
    if (value === null || value === undefined) return { grade: '—', color: '#444', score: 0 };
    for (const s of event.scoring) {
      if (event.higher ? value >= s.min : value <= s.max) {
        return { grade: s.grade, color: s.color, score: _calcScore(event, value) };
      }
    }
    return { grade: '—', color: '#444', score: 0 };
  }

  function _calcScore(event, value) {
    const grades = event.scoring;
    const maxBound = event.higher ? grades[0].min : grades[0].max;
    const minBound = event.higher ? grades[grades.length-1].min : grades[grades.length-1].max;
    if (event.higher) {
      return Math.min(100, Math.round((value / maxBound) * 100));
    } else {
      const range = (minBound - maxBound);
      if (range <= 0) return 100;
      return Math.min(100, Math.round(((minBound - value) / range) * 100));
    }
  }

  /**
   * คำนวณผลรวม ACFT จาก scores object
   */
  function calcTotal(standardId, scores) {
    const std = STANDARDS[standardId];
    if (!std) return { total: 0, average: 0, passed: false, results: [] };
    let totalScore = 0;
    let passCount  = 0;
    const results  = std.events.map(ev => {
      const val    = scores[ev.id];
      const result = gradeEvent(ev, val);
      if (result.score > 0) { totalScore += result.score; passCount++; }
      return { event: ev, value: val, ...result };
    });
    const average = results.length > 0 ? Math.round(totalScore / results.length) : 0;
    const passed  = results.every(r => r.score >= 40);
    return { total: totalScore, average, passed, results };
  }

  /* ── Storage for test history ── */
  const STORAGE_KEY = 'tf_acft_history';

  function saveTest(standardId, scores, notes = '') {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const result  = calcTotal(standardId, scores);
      history.push({
        id:         `acft_${Date.now()}`,
        date:       new Date().toISOString().split('T')[0],
        standardId,
        scores,
        total:      result.total,
        average:    result.average,
        passed:     result.passed,
        notes,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20)));
      return result;
    } catch(e) { console.error('[ACFT] Save failed:', e); }
  }

  function getHistory(standardId = null) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return standardId ? all.filter(h => h.standardId === standardId) : all;
    } catch(e) { return []; }
  }

  return { getStandard, getAll, gradeEvent, calcTotal, saveTest, getHistory };
})();

/* ══════════════════════════════════════════════════
   WEEK 11-12 — AUDIO WARFARE ENGINE
   Web Audio API SFX + Speech Synthesis Drill Sergeant
══════════════════════════════════════════════════ */

const AudioWarfare = (() => {

  let _ctx = null;
  let _masterGain = null;
  let _sfxEnabled = true;
  let _voiceEnabled = true;
  let _volume = 0.7;

  function _getCtx() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _masterGain = _ctx.createGain();
      _masterGain.gain.value = _volume;
      _masterGain.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  /* ── Core synth oscillator ── */
  function _tone(freq, type = 'sine', dur = 0.15, vol = 0.5, delay = 0) {
    if (!_sfxEnabled) return;
    try {
      const ctx  = _getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol * _volume, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.connect(gain);
      gain.connect(_masterGain || ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.01);
    } catch(e) {}
  }

  /* ── Noise burst (for impact SFX) ── */
  function _noise(dur = 0.1, vol = 0.3, delay = 0) {
    if (!_sfxEnabled) return;
    try {
      const ctx        = _getCtx();
      const bufSize    = Math.floor(ctx.sampleRate * dur);
      const buffer     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data       = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const source     = ctx.createBufferSource();
      const gain       = ctx.createGain();
      const filter     = ctx.createBiquadFilter();
      filter.type      = 'bandpass';
      filter.frequency.value = 800;
      source.buffer    = buffer;
      gain.gain.setValueAtTime(vol * _volume, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(_masterGain || ctx.destination);
      source.start(ctx.currentTime + delay);
    } catch(e) {}
  }

  /* ════════════════════════
     SFX LIBRARY — 20 effects
  ════════════════════════ */
  const SFX = {
    // ── Training Events ──
    setComplete() {
      _tone(660, 'square', 0.06, 0.3);
      _tone(880, 'square', 0.1,  0.3, 0.07);
    },
    prAchieved() {
      [523,659,784,1047].forEach((f,i) => _tone(f,'square',0.15,0.4,i*0.08));
      _noise(0.15, 0.2, 0.4);
    },
    workoutStart() {
      _noise(0.05, 0.5);
      _tone(440, 'sawtooth', 0.08, 0.4, 0.05);
      _tone(660, 'sawtooth', 0.12, 0.4, 0.12);
    },
    workoutComplete() {
      [523,659,784,1047,1319].forEach((f,i) => _tone(f,'triangle',0.2,0.5,i*0.1));
    },
    restStart() {
      _tone(330, 'sine', 0.2, 0.3);
    },
    restEnd() {
      _tone(880, 'square', 0.08, 0.4);
      _tone(1100,'square', 0.12, 0.4, 0.09);
    },
    countdown() {
      _tone(440, 'square', 0.06, 0.3);
    },
    countdownFinal() {
      _tone(880, 'square', 0.12, 0.5);
    },

    // ── Rank/Achievement ──
    rankUp() {
      [262,330,392,523,659,784].forEach((f,i) => _tone(f,'sawtooth',0.2,0.6,i*0.07));
      _noise(0.2, 0.3, 0.5);
    },
    medalEarned() {
      _tone(1047,'triangle',0.3,0.5);
      _tone(1319,'triangle',0.3,0.4,0.15);
      _tone(1568,'triangle',0.4,0.5,0.3);
    },
    missionComplete() {
      _noise(0.05, 0.6);
      [392,494,587,784].forEach((f,i) => _tone(f,'square',0.2,0.5,0.05+i*0.08));
    },
    streakMilestone() {
      _tone(659,'sine',0.1,0.4);
      _tone(784,'sine',0.1,0.4,0.12);
      _tone(1047,'sine',0.25,0.6,0.24);
    },

    // ── Alert/Warning ──
    riskRed() {
      _tone(220,'sawtooth',0.15,0.6);
      _tone(185,'sawtooth',0.15,0.6,0.18);
      _tone(220,'sawtooth',0.15,0.6,0.36);
    },
    riskAmber() {
      _tone(440,'square',0.1,0.4);
      _tone(330,'square',0.1,0.3,0.15);
    },
    formBreak() {
      _tone(330,'sawtooth',0.08,0.5);
      _noise(0.1,0.3,0.09);
    },
    error() {
      _tone(220,'sawtooth',0.12,0.4);
      _tone(196,'sawtooth',0.12,0.4,0.13);
    },

    // ── UI ──
    tap()     { _tone(880,'square',0.04,0.15); },
    select()  { _tone(660,'triangle',0.08,0.2); },
    cancel()  { _tone(330,'sine',0.1,0.2); },
    success() { _tone(880,'square',0.06,0.3); _tone(1100,'square',0.1,0.3,0.07); },

    // ── Boot screen ──
    bootUp() {
      [110,220,330,440,550,660,880,1100].forEach((f,i) =>
        _tone(f,'sawtooth',0.06,0.3,i*0.05));
    },
  };

  /* ════════════════════════
     DRILL SERGEANT (TTS)
     100 Thai commands
  ════════════════════════ */
  const COMMANDS = {
    warmup:   ['เริ่มวอร์มอัพ!', 'ยืดกล้ามเนื้อ!', 'เตรียมร่างกาย!'],
    start:    ['เริ่ม!', 'ออกแรง!', 'EXECUTE!', 'ลุยเลย!', 'อย่าหยุด!'],
    push:     ['ต่ำลง!', 'ออกแรงขึ้น!', 'ดัน!', 'อีกครั้ง!', 'เร็วเข้า!'],
    pull:     ['ดึง!', 'ดึงให้สุด!', 'ขึ้นมา!', 'แขนแข็ง!'],
    core:     ['เกร็ง core!', 'หน้าท้องแน่น!', 'หลังตรง!', 'ไม่ยอม!'],
    run:      ['วิ่งเร็วขึ้น!', 'ก้าวยาวขึ้น!', 'ควบคุมลมหายใจ!', 'อีกแค่นิดเดียว!'],
    rest:     ['พักได้', 'หายใจลึกๆ', 'ฟื้นตัว', 'เตรียมพร้อม round ต่อไป'],
    form:     ['form ถูกต้อง!', 'ข้อศอกตรง!', 'หัวไหล่ลง!', 'สะโพกตรง!'],
    motivate: [
      'ทหารไม่มีคำว่าเลิก!', 'เจ็บได้ แต่ยอมแพ้ไม่ได้!',
      'อีกหน่อยก็ถึง!', 'ร่างกายโกหกได้ จิตใจโกหกไม่ได้!',
      'ยอดเยี่ยม!', 'เกินกว่าที่คิด!', 'นั่นแหละทหาร!',
      'ไม่มีอะไรยากเกินไปสำหรับทหาร!',
    ],
    complete: [
      'Mission Complete!', 'ยอดเยี่ยมมาก!', 'เป็นเลิศ!',
      'ทหารตัวจริง!', 'ภารกิจสำเร็จ!',
    ],
    pr:       ['PR ใหม่! ทำลายสถิติ!', 'นั่นแหละ ELITE!', 'ประวัติศาสตร์ใหม่!'],
    rankup:   ['เลื่อนยศแล้ว!', 'ยศใหม่ได้มาแล้ว!', 'ขึ้นระดับสำเร็จ!'],
  };

  let _lastSpoke = 0;
  let _voices    = [];

  function _initVoices() {
    if (!('speechSynthesis' in window)) return;
    _voices = window.speechSynthesis.getVoices();
    if (!_voices.length) {
      window.speechSynthesis.onvoiceschanged = () => {
        _voices = window.speechSynthesis.getVoices();
      };
    }
  }

  function speak(text, rate = 1.1, force = false) {
    if (!_voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;
    const now = Date.now();
    if (!force && now - _lastSpoke < 1500) return; // debounce
    _lastSpoke = now;
    try {
      window.speechSynthesis.cancel();
      const utt   = new SpeechSynthesisUtterance(text);
      const voice = _voices.find(v => v.lang.startsWith('th')) ||
                    _voices.find(v => v.lang.startsWith('en')) || null;
      utt.lang    = 'th-TH';
      utt.rate    = rate;
      utt.volume  = _voiceEnabled ? _volume : 0;
      utt.pitch   = 0.9;
      if (voice) utt.voice = voice;
      window.speechSynthesis.speak(utt);
    } catch(e) {}
  }

  function drill(category) {
    const cmds = COMMANDS[category] || COMMANDS.motivate;
    const text = cmds[Math.floor(Math.random() * cmds.length)];
    speak(text, 1.2);
  }

  /* ── Settings ── */
  function setSFX(enabled)   { _sfxEnabled = enabled; }
  function setVoice(enabled) { _voiceEnabled = enabled; }
  function setVolume(vol)    { _volume = Math.max(0, Math.min(1, vol)); if (_masterGain) _masterGain.gain.value = _volume; }
  function isSFXEnabled()    { return _sfxEnabled; }
  function isVoiceEnabled()  { return _voiceEnabled; }
  function getVolume()       { return _volume; }

  // Load saved prefs
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('tf_audio_prefs') || '{}');
      _sfxEnabled   = p.sfx   !== false;
      _voiceEnabled = p.voice !== false;
      _volume       = p.volume ?? 0.7;
    } catch(e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem('tf_audio_prefs', JSON.stringify({
        sfx: _sfxEnabled, voice: _voiceEnabled, volume: _volume
      }));
    } catch(e) {}
  }

  _initVoices();
  loadPrefs();

  return {
    SFX, speak, drill, COMMANDS,
    setSFX, setVoice, setVolume,
    isSFXEnabled, isVoiceEnabled, getVolume,
    loadPrefs, savePrefs,
  };
})();

/* ══════════════════════════════════════════════════
   WEEK 13-14 — PLATOON MODE
   QR code sharing + LocalStorage leaderboard (no server)
══════════════════════════════════════════════════ */

const PlatoonMode = (() => {

  const STORAGE_KEY  = 'tf_platoon_data';
  const MY_KEY       = 'tf_platoon_me';
  const MAX_MEMBERS  = 10;

  /* ── Own profile card ── */
  function buildMyCard(profile, pr) {
    const rankName = RANKS?.[profile?.rankIndex||0]?.name || '—';
    const card = {
      callsign:    profile?.callsign || 'OPERATOR',
      rankName,
      rankIndex:   profile?.rankIndex || 0,
      streak:      profile?.currentStreak || 0,
      totalDays:   profile?.totalDaysActive || 0,
      pushup:      pr?.pushup?.value || 0,
      pullup:      pr?.pullup?.value || 0,
      plank:       pr?.plank?.value  || 0,
      run2km:      pr?.run2km?.value || null,
      score:       pr?.totalScore    || 0,
      updatedAt:   new Date().toISOString().split('T')[0],
    };
    localStorage.setItem(MY_KEY, JSON.stringify(card));
    return card;
  }

  function getMyCard() {
    try { return JSON.parse(localStorage.getItem(MY_KEY) || 'null'); }
    catch(e) { return null; }
  }

  /* ── QR / URL encode/decode ── */
  function encodeCard(card) {
    try {
      const minimal = {
        c: card.callsign,
        r: card.rankIndex,
        s: card.streak,
        d: card.totalDays,
        p: [card.pushup, card.pullup, card.plank, card.run2km || 0, card.score],
        u: card.updatedAt,
      };
      return btoa(JSON.stringify(minimal)).replace(/[+/=]/g, c =>
        ({'+':'-','/':'_','=':''}[c]));
    } catch(e) { return ''; }
  }

  function decodeCard(encoded) {
    try {
      const padded = encoded.replace(/[-_]/g, c => ({'-':'+','_':'/'}[c]));
      const obj    = JSON.parse(atob(padded));
      return {
        callsign:  obj.c || 'OPERATOR',
        rankIndex: obj.r || 0,
        rankName:  RANKS?.[obj.r||0]?.name || '—',
        streak:    obj.s || 0,
        totalDays: obj.d || 0,
        pushup:    obj.p?.[0] || 0,
        pullup:    obj.p?.[1] || 0,
        plank:     obj.p?.[2] || 0,
        run2km:    obj.p?.[3] || null,
        score:     obj.p?.[4] || 0,
        updatedAt: obj.u || '—',
        _imported: true,
      };
    } catch(e) { return null; }
  }

  function buildShareURL(card) {
    const encoded = encodeCard(card);
    const base    = window.location.origin + window.location.pathname.replace(/\/[^/]+$/, '/');
    return `${base}platoon-join.html?op=${encoded}`;
  }

  /* ── Platoon roster (localStorage) ── */
  function loadRoster() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function saveRoster(roster) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(roster.slice(0, MAX_MEMBERS))); }
    catch(e) {}
  }

  function addMember(card) {
    if (!card || !card.callsign) return false;
    const roster = loadRoster();
    const existing = roster.findIndex(m => m.callsign === card.callsign);
    if (existing >= 0) {
      roster[existing] = card; // update
    } else if (roster.length < MAX_MEMBERS) {
      roster.push(card);
    } else {
      return false; // full
    }
    saveRoster(roster);
    return true;
  }

  function removeMember(callsign) {
    const roster = loadRoster().filter(m => m.callsign !== callsign);
    saveRoster(roster);
  }

  /* ── Leaderboard ── */
  const CATEGORIES = [
    { id: 'score',    label: 'TOTAL SCORE',  field: 'score',    unit: 'pts',  higher: true },
    { id: 'pushup',   label: 'PUSH-UP PR',   field: 'pushup',   unit: 'reps', higher: true },
    { id: 'pullup',   label: 'PULL-UP PR',   field: 'pullup',   unit: 'reps', higher: true },
    { id: 'streak',   label: 'STREAK',       field: 'streak',   unit: 'days', higher: true },
    { id: 'totalDays',label: 'ACTIVE DAYS',  field: 'totalDays',unit: 'days', higher: true },
    { id: 'run2km',   label: 'RUN 2KM PR',   field: 'run2km',   unit: 'min',  higher: false },
  ];

  function getLeaderboard(category = 'score', includeMe = true) {
    const myCard = getMyCard();
    const roster = loadRoster();
    const all    = includeMe && myCard ? [{ ...myCard, isMe: true }, ...roster] : roster;

    const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
    return all
      .filter(m => m[cat.field] !== null && m[cat.field] !== undefined)
      .sort((a, b) => cat.higher
        ? (b[cat.field] || 0) - (a[cat.field] || 0)
        : ((a[cat.field] || 9999) - (b[cat.field] || 9999))
      )
      .map((m, i) => ({ ...m, rank: i + 1 }));
  }

  /* ── QR Code generator (pure JS, no library) ── */
  // Simple URL-based QR via google charts API fallback
  // Pure CSS/JS QR via canvas — encode URL as text
  function renderQR(url, canvasId, size = 200) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    canvas.width = canvas.height = size;

    // Use QR API image fallback (works offline if cached)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=080808&color=00ff88`;
    img.onload  = () => ctx.drawImage(img, 0, 0, size, size);
    img.onerror = () => {
      // Fallback: show URL text
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#00ff88';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN QR', size/2, size/2 - 10);
      ctx.fillText('(requires online)', size/2, size/2 + 10);
    };
  }

  return {
    buildMyCard, getMyCard,
    encodeCard, decodeCard, buildShareURL,
    loadRoster, addMember, removeMember,
    getLeaderboard, CATEGORIES,
    renderQR,
  };
})();

/* ── Exports ── */
window.ACFTEngine   = ACFTEngine;
window.AudioWarfare = AudioWarfare;
window.PlatoonMode  = PlatoonMode;
