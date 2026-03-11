/**
 * ULTIMATE FITNESS RULE ENGINE v3.0
 * ═══════════════════════════════════════════════════════════════════
 * Personal Baseline · Scenario Simulation · Meta-Learning · Auto-Evolution
 * Priority Chain: Safety → Recovery → Performance → Progression
 *
 * อ้างอิง: NSCA · ACSM · Gabbett (ACWR) · Kiviniemi (HRV)
 *          Israetel (MRV) · Verkhoshansky · Army FM 7-22
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const UltimateEngine = (() => {

  /* ──────────────────────────────────────────────────────────────
     EXPLAIN CHAIN — ทุก decision มีที่มา
  ────────────────────────────────────────────────────────────── */
  class ExplainChain {
    constructor(title) { this.title = title; this.steps = []; }
    input(k, v, u = '')  { this.steps.push({ type: 'input', k, v, u }); return this; }
    rule(formula, result, source) { this.steps.push({ type: 'formula', formula, result, source }); return this; }
    decide(cond, outcome, why) { this.steps.push({ type: 'decision', cond, outcome, why }); return this; }
    warn(msg) { this.steps.push({ type: 'warning', msg }); return this; }
    conclude(text) { this.steps.push({ type: 'conclusion', text }); return this; }

    toHTML() {
      const rows = this.steps.map(s => {
        if (s.type === 'input')    return `<div class="ec-formula"><span class="ec-eq">▸ ${s.k}</span><span class="ec-res">${s.v} ${s.u}</span></div>`;
        if (s.type === 'formula')  return `<div class="ec-formula"><span class="ec-eq">${s.formula}</span><span class="ec-res">= ${s.result}</span><span class="ec-src">${s.source || ''}</span></div>`;
        if (s.type === 'decision') return `<div class="ec-decision"><span class="ec-if">IF</span> ${s.cond} → <strong>${s.outcome}</strong><span class="ec-why">${s.why || ''}</span></div>`;
        if (s.type === 'warning')  return `<div class="ec-warn">⚠ ${s.msg}</div>`;
        if (s.type === 'conclusion') return `<div class="ec-conclusion">∴ ${s.text}</div>`;
        return '';
      }).join('');
      return `<div class="explain-chain visible"><div class="ec-title">${this.title}</div>${rows}</div>`;
    }
  }

  /* ──────────────────────────────────────────────────────────────
     UTILITY MATH
  ────────────────────────────────────────────────────────────── */
  const Math2 = {
    movingAvg(arr, n) {
      if (!arr || !arr.length) return 0;
      const slice = arr.slice(-n);
      return slice.reduce((s, v) => s + (v || 0), 0) / slice.length;
    },
    percentile(arr, p) {
      if (!arr || !arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * sorted.length);
      return sorted[Math.min(idx, sorted.length - 1)];
    },
    variance(arr) {
      if (!arr || arr.length < 2) return 0;
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    },
    clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
  };

  /* ──────────────────────────────────────────────────────────────
     PERSONAL BASELINE ENGINE — หัวใจหลักของความ personalized
  ────────────────────────────────────────────────────────────── */
  class BaselineEngine {
    constructor() { this._cache = null; this._cacheTime = 0; }

    compute(logs = []) {
      const now = Date.now();
      if (this._cache && now - this._cacheTime < 60000) return this._cache;

      const last30 = logs.slice(-90);  // ~30 sessions
      const readinesses = last30.map(l => l.readiness).filter(v => v > 0);
      const rpes        = last30.map(l => l.avgRpe).filter(v => v > 0);
      const vols        = last30.map(l => l.volumeLoad).filter(v => v > 0);
      const reps        = last30.flatMap(l =>
        (l.exercises || []).flatMap(e => e.actualReps || []).filter(v => v > 0)
      );

      const baseline = {
        readiness_p10: Math2.percentile(readinesses, 10) || 50,
        readiness_p50: Math2.percentile(readinesses, 50) || 70,
        readiness_p90: Math2.percentile(readinesses, 90) || 85,
        readiness_avg: Math2.movingAvg(readinesses, 30) || 70,

        rpe_avg: Math2.movingAvg(rpes, 14) || 7,
        rpe_variance: Math2.variance(rpes.slice(-14)),

        vol_avg: Math2.movingAvg(vols, 14) || 100,
        vol_p75: Math2.percentile(vols, 75) || 120,

        reps_avg: Math2.movingAvg(reps, 20) || 10,
        adaptation_rate: this._calcAdaptationRate(logs),
        recovery_rate: this._calcRecoveryRate(logs),
        session_count: logs.length,
      };

      this._cache = baseline;
      this._cacheTime = now;
      return baseline;
    }

    _calcAdaptationRate(logs) {
      if (logs.length < 8) return 0;
      const early = logs.slice(0, Math.floor(logs.length / 2));
      const late  = logs.slice(Math.floor(logs.length / 2));
      const eVol  = Math2.movingAvg(early.map(l => l.volumeLoad || 0), early.length);
      const lVol  = Math2.movingAvg(late.map(l => l.volumeLoad || 0), late.length);
      return eVol > 0 ? (lVol - eVol) / eVol : 0;
    }

    _calcRecoveryRate(logs) {
      // estimated recovery: ดู soreness drop หลัง high volume session
      const pairs = [];
      for (let i = 1; i < logs.length; i++) {
        if ((logs[i-1].volumeLoad || 0) > 150) {
          pairs.push((logs[i].readiness || 70) - (logs[i-1].readiness || 70));
        }
      }
      return pairs.length ? Math2.movingAvg(pairs, pairs.length) : 5;
    }
  }

  const baselineEngine = new BaselineEngine();

  /* ──────────────────────────────────────────────────────────────
     FATIGUE CALCULATOR (Inline, ไม่ depend on FatigueEngine)
  ────────────────────────────────────────────────────────────── */
  function calcFatigueIndex(logs = []) {
    if (!logs.length) return 50;
    const now   = new Date().toISOString().split('T')[0];
    const acute = avgLoad(logs, now, 7);
    const chron = avgLoad(logs, now, 28);
    if (!chron) return 50;
    const acwr = acute / chron;
    // normalize: ACWR 1.0 = fatigue 50, >1.5 = 90, <0.8 = 20
    return Math2.clamp(Math.round((acwr - 0.8) / 0.7 * 70 + 20), 5, 100);
  }

  function avgLoad(logs, endDate, days) {
    const end   = new Date(endDate + 'T00:00:00');
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);
    const startStr = start.toISOString().split('T')[0];
    const window = logs.filter(l => l.date >= startStr && l.date <= endDate);
    const total  = window.reduce((s, l) => s + (l.volumeLoad || 0), 0);
    return total / days;
  }

  /* ──────────────────────────────────────────────────────────────
     TREND CALCULATOR
  ────────────────────────────────────────────────────────────── */
  function calcTrend(logs, metric, weeks = 4) {
    const slice = logs.slice(-(weeks * 3));
    if (slice.length < 4) return 0;
    const start = slice.slice(0, 3).reduce((s, l) => s + (l[metric] || 0), 0) / 3;
    const end   = slice.slice(-3).reduce((s, l)  => s + (l[metric] || 0), 0) / 3;
    return start > 0 ? (end - start) / start : 0;
  }

  /* ──────────────────────────────────────────────────────────────
     SCENARIO SIMULATION — Look-ahead 3 days
  ────────────────────────────────────────────────────────────── */
  function simulate3Days(state, plan) {
    let s = { ...state };
    for (let d = 1; d <= 3; d++) {
      const intensity = plan.rpe || 7;
      const volume    = plan.sets * (plan.repsNum || 10) || 30;
      s.fatigueIndex  = Math2.clamp(s.fatigueIndex + intensity * 0.4, 0, 100);
      s.readiness    *= (1 - volume * 0.003);
      s.readiness     = Math2.clamp(s.readiness + s.baseline.recovery_rate, 30, 100);
    }
    const perfRatio = s.readiness / state.readiness;
    return {
      projectedReadiness: Math.round(s.readiness),
      projectedFatigue:   Math.round(s.fatigueIndex),
      performanceRatio:   Math.round(perfRatio * 1000) / 1000,
      overreachRisk:      s.fatigueIndex > 85 ? 'HIGH' : s.fatigueIndex > 70 ? 'MODERATE' : 'LOW',
    };
  }

  /* ──────────────────────────────────────────────────────────────
     RULE PERFORMANCE TRACKER — Meta-Learning
  ────────────────────────────────────────────────────────────── */
  const RuleTracker = {
    _stats: {},
    _loaded: false,

    load() {
      if (this._loaded) return;
      try {
        const raw = localStorage.getItem('ue_ruleStats');
        this._stats = raw ? JSON.parse(raw) : {};
      } catch (e) { this._stats = {}; }
      this._loaded = true;
    },

    save() {
      try { localStorage.setItem('ue_ruleStats', JSON.stringify(this._stats)); } catch (e) {}
    },

    record(ruleId, outcome /* 'good'|'neutral'|'bad' */) {
      this.load();
      const s = this._stats[ruleId] || { total: 0, good: 0, neutral: 0, bad: 0, threshMult: 1.0 };
      s.total++;
      s[outcome] = (s[outcome] || 0) + 1;
      const successRate = (s.good + s.neutral * 0.5) / s.total;
      if (s.total >= 5 && successRate < 0.60) {
        s.threshMult = Math2.clamp(s.threshMult * 1.12, 0.5, 2.0); // more conservative
      } else if (s.total >= 10 && successRate > 0.85) {
        s.threshMult = Math2.clamp(s.threshMult * 0.97, 0.5, 2.0); // slightly more aggressive
      }
      this._stats[ruleId] = s;
      this.save();
    },

    getMult(ruleId) {
      this.load();
      return (this._stats[ruleId] || {}).threshMult || 1.0;
    },

    getAll() {
      this.load();
      return { ...this._stats };
    },
  };

  /* ──────────────────────────────────────────────────────────────
     SAFETY RULES (Priority 1) — NEVER override
  ────────────────────────────────────────────────────────────── */
  const SAFETY_RULES = [
    {
      id: 'S001',
      name: 'Emergency Stop',
      check(s) { return s.soreness >= 8 || s.readiness <= 25; },
      plan(s, chain) {
        chain.decide(`Soreness ${s.soreness}/10 OR Readiness ${Math.round(s.readiness)}/100`, 'EMERGENCY STOP', 'Risk of acute injury');
        chain.warn('REST 48-72 ชั่วโมง + ประเมินอาการ');
        chain.conclude('ห้ามฝึก — medical evaluation recommended');
        return {
          mode: 'emergency_stop', priority: 'CRITICAL',
          sets: 0, reps: '—', rpe: 0,
          exercises: [],
          note: '⛔ ห้ามฝึก — พักและประเมินอาการก่อน',
          color: 'red',
        };
      },
    },
    {
      id: 'S002',
      name: 'High Fatigue Override',
      check(s) {
        const mult = RuleTracker.getMult('S002');
        return s.fatigueIndex > (85 * mult) && s.readiness < s.baseline.readiness_avg * 0.72;
      },
      plan(s, chain) {
        chain.decide(`Fatigue ${Math.round(s.fatigueIndex)}% > 85 AND Readiness < 72% baseline`, 'ACTIVE RECOVERY', 'CNS overloaded');
        chain.rule('Recovery protocol', '2 sets mobility only, RPE 2-3', 'ACWR safety zone');
        return {
          mode: 'active_recovery', priority: 'HIGH',
          sets: 2, reps: '20-30s holds', rpe: 3,
          exercises: ['Deep Breathing 5min', 'Mobility Flow', 'Cat-Cow 2×10', 'Hip Circle 2×10', 'Shoulder Roll 2×10'],
          note: '🔋 Fatigue สูงมาก — Active Recovery เท่านั้น',
          color: 'red',
        };
      },
    },
  ];

  /* ──────────────────────────────────────────────────────────────
     RECOVERY RULES (Priority 2)
  ────────────────────────────────────────────────────────────── */
  const RECOVERY_RULES = [
    {
      id: 'R001',
      name: 'Night Shift / Late Hour',
      check(s) { return s.hour >= 22 || s.hour <= 5 || s.dutyShift === 'plad3'; },
      plan(s, chain) {
        chain.decide(`Hour ${s.hour}:00 OR Night Shift`, 'GTG MOBILITY PROTOCOL', 'CNS preservation');
        return {
          mode: 'night_gtg', priority: 'MEDIUM',
          sets: 3, reps: '5-8 reps quality', rpe: 4,
          exercises: ['Dead Hang 20s ×3', 'Push-up Negatives 5×3 (5s eccentric)', 'Deep Squat Hold 30s ×3', 'Diaphragmatic Breathing 5min'],
          totalTime: 15,
          note: '🌙 Night Shift detected → GTG Mobility 15 นาที',
          color: 'amber',
        };
      },
    },
    {
      id: 'R002',
      name: 'Post-High-Volume Recovery',
      check(s) {
        const recentLoad = (s.logs || []).slice(-3).reduce((a, l) => a + (l.volumeLoad || 0), 0);
        return recentLoad > s.baseline.vol_p75 * 3 && s.readiness < 60;
      },
      plan(s, chain) {
        chain.decide('3-session volume > 75th percentile × 3 AND Readiness < 60', 'DELOAD SESSION', 'Accumulated fatigue');
        chain.rule('Deload = 40% volume reduction', '2 sets, 60% normal reps, RPE 5', 'Israetel MRV');
        return {
          mode: 'deload', priority: 'MEDIUM',
          sets: 2, reps: '60% normal', rpe: 5,
          exercises: ['Light Push-up 2×8', 'Light Squat 2×10', 'Plank 2×30s', 'Walking 10min'],
          note: '📉 Deload Week — Volume ลด 40%, รักษา movement pattern',
          color: 'amber',
        };
      },
    },
    {
      id: 'R003',
      name: 'Sleep Deficit Protocol',
      check(s) { return s.sleepHours < 5.5 && s.readiness < 65; },
      plan(s, chain) {
        chain.decide(`Sleep ${s.sleepHours}h < 5.5h AND Readiness < 65`, 'REDUCED SESSION', 'Sleep debt impairs recovery');
        return {
          mode: 'sleep_deficit', priority: 'MEDIUM',
          sets: 2, reps: 'Tech quality only', rpe: 5,
          exercises: ['Mobility Routine 10min', 'Breathing 5min', 'Light Walk 15min'],
          note: '😴 นอนน้อยเกิน — ลด volume 50%, เน้น technique',
          color: 'amber',
        };
      },
    },
  ];

  /* ──────────────────────────────────────────────────────────────
     PERFORMANCE RULES (Priority 3) — HRV / RPE auto-reg
  ────────────────────────────────────────────────────────────── */
  const PERFORMANCE_RULES = [
    {
      id: 'P001',
      name: 'High Performance Day',
      check(s) {
        return s.readiness >= s.baseline.readiness_p90 && s.fatigueIndex < 55 && s.motivation >= 4;
      },
      plan(s, chain) {
        chain.decide(`Readiness ≥ P90 (${Math.round(s.baseline.readiness_p90)}) AND Fatigue < 55%`, 'HIGH PERFORMANCE', 'Peak readiness window');
        chain.rule('Volume +10%, Intensity +5%', `${Math.round((s.baseline.vol_avg || 100) * 1.1)} target volume`, 'HRV Auto-Reg (Kiviniemi)');
        return {
          mode: 'high_performance', priority: 'NORMAL',
          sets: 4, repsNum: Math.round(s.baseline.reps_avg * 1.1), rpe: 8,
          reps: `${Math.round(s.baseline.reps_avg * 1.1)} (ลอง PR วันนี้)`,
          exercises: getProgExercises(s, 'high'),
          volMultiplier: 1.10,
          note: '🔥 High Performance Day — ลอง PR หรือเพิ่ม volume',
          color: 'green',
        };
      },
    },
    {
      id: 'P002',
      name: 'Normal Training',
      check(s) { return s.readiness >= 55 && s.fatigueIndex < 75; },
      plan(s, chain) {
        chain.decide(`55 ≤ Readiness < P90 AND Fatigue < 75%`, 'NORMAL TRAINING', 'Standard progressive overload');
        chain.rule('Volume ×1.0, RPE target 7', `${Math.round(s.baseline.vol_avg || 100)} volume`, 'NSCA Periodization');
        return {
          mode: 'normal', priority: 'NORMAL',
          sets: 3, repsNum: Math.round(s.baseline.reps_avg), rpe: 7,
          reps: `${Math.round(s.baseline.reps_avg)} (RPE 7)`,
          exercises: getProgExercises(s, 'normal'),
          volMultiplier: 1.0,
          note: '✅ ฝึกตามแผน — Progressive Overload',
          color: 'green',
        };
      },
    },
    {
      id: 'P003',
      name: 'Reduced Training',
      check(s) { return s.readiness >= 40; },
      plan(s, chain) {
        chain.decide(`40 ≤ Readiness < 55`, 'REDUCED SESSION', 'Sub-optimal readiness');
        chain.rule('Volume ×0.8, RPE ≤ 6', `${Math.round((s.baseline.vol_avg || 100) * 0.8)} volume`, 'HRV Low Day protocol');
        return {
          mode: 'reduced', priority: 'NORMAL',
          sets: 2, repsNum: Math.round(s.baseline.reps_avg * 0.8), rpe: 6,
          reps: `${Math.round(s.baseline.reps_avg * 0.8)} (RPE 6)`,
          exercises: getProgExercises(s, 'reduced'),
          volMultiplier: 0.80,
          note: '📊 Readiness ต่ำ — ลด volume 20%, รักษา frequency',
          color: 'amber',
        };
      },
    },
  ];

  /* ──────────────────────────────────────────────────────────────
     PROGRESSION RULES (Priority 4) — Long-term adaptation
  ────────────────────────────────────────────────────────────── */
  const PROGRESSION_RULES = [
    {
      id: 'G001',
      name: 'Plateau Buster',
      check(s) { return s.rpeTrend > 0.08 && s.repsTrend4w < 0.02; },
      plan(s, chain) {
        chain.decide(`RPE trend +8% with reps stagnant < +2%`, 'PLATEAU — CHANGE STIMULUS', 'Neural adaptation required');
        chain.rule('Plateau break = variation + rep range shift', 'New exercise variation', 'Verkhoshansky');
        return {
          mode: 'plateau_break', priority: 'LOW',
          sets: 3, repsNum: 6, rpe: 8,
          reps: '6 (strength focus) หรือ ลอง variation ใหม่',
          exercises: getProgExercises(s, 'plateau'),
          note: '⚡ Plateau detected — เปลี่ยน rep range เป็น strength (4-6 reps)',
          color: 'amber',
        };
      },
    },
    {
      id: 'G002',
      name: 'Standard Progression',
      check() { return true; },
      plan(s, chain) {
        chain.conclude('Standard progression protocol — +1 rep หรือ +1 set ต่อ 2 สัปดาห์');
        return {
          mode: 'standard', priority: 'LOW',
          sets: 3, repsNum: Math.round(s.baseline.reps_avg), rpe: 7,
          reps: `${Math.round(s.baseline.reps_avg)}`,
          exercises: getProgExercises(s, 'normal'),
          volMultiplier: 1.0,
          note: '📈 Standard Progression — +1 rep จากครั้งที่แล้ว',
          color: 'green',
        };
      },
    },
  ];

  /* ──────────────────────────────────────────────────────────────
     EXERCISE SELECTOR — based on context
  ────────────────────────────────────────────────────────────── */
  function getProgExercises(s, level) {
    const eq = s.equipment || 'bodyweight';
    const focus = s.focus || 'fullbody';

    const SETS = {
      high:    { upper: ['Archer Push-up', 'Weighted Pull-up', 'Pike Push-up'], lower: ['Pistol Squat', 'Single-leg Squat', 'Jump Squat'], core: ['Dragon Flag', 'L-sit 10s', 'Ab Wheel'] },
      normal:  { upper: ['Push-up', 'Pull-up', 'Dip'],  lower: ['Squat', 'Lunge', 'Step-up'],   core: ['Plank 60s', 'Sit-up', 'Leg Raise'] },
      reduced: { upper: ['Incline Push-up', 'Inverted Row', 'Band Row'],  lower: ['Box Squat', 'Wall Sit', 'Calf Raise'], core: ['Plank 30s', 'Dead Bug', 'Bird Dog'] },
      plateau: { upper: ['Tempo Push-up 3-1-3', 'Eccentric Pull-up 5s', 'Close-grip Push-up'], lower: ['Pause Squat 3s', 'Tempo Lunge', 'Bulgarian Split Squat'], core: ['RKC Plank', 'Plank+Reach', 'Hollow Body Hold'] },
    };

    const set = SETS[level] || SETS.normal;
    if (focus === 'upper') return [...set.upper, set.core[0]];
    if (focus === 'lower') return [...set.lower, set.core[0]];
    if (focus === 'core')  return [...set.core, set.upper[0]];
    return [set.upper[0], set.upper[1], set.lower[0], set.core[0], 'วิ่ง 2km / Burpee 3×10'];
  }

  /* ──────────────────────────────────────────────────────────────
     XP / GAMIFICATION
  ────────────────────────────────────────────────────────────── */
  const XPSystem = {
    RANKS: [
      { xp: 0,     name: 'พลเรือน',        icon: '👤' },
      { xp: 500,   name: 'Operator Cadet', icon: '🎖' },
      { xp: 2000,  name: 'SEAL Candidate', icon: '⚓' },
      { xp: 5000,  name: 'Operator',       icon: '🦅' },
      { xp: 10000, name: 'Operator Elite', icon: '⭐' },
      { xp: 20000, name: 'Master Operator',icon: '💎' },
    ],

    calcSessionXP(plan, feedback, streak) {
      let xp = 0;
      xp += { emergency_stop: 0, active_recovery: 10, night_gtg: 15, deload: 20,
               sleep_deficit: 20, reduced: 30, normal: 50, high_performance: 80,
               plateau_break: 60, standard: 40 }[plan.mode] || 30;
      if (feedback > 3) xp += 10;
      if (streak > 7)   xp += 15;
      if (streak > 30)  xp += 25;
      return xp;
    },

    getRank(totalXP) {
      let rank = this.RANKS[0];
      for (const r of this.RANKS) { if (totalXP >= r.xp) rank = r; }
      const nextIdx = this.RANKS.findIndex(r => r.xp > totalXP);
      const next = nextIdx >= 0 ? this.RANKS[nextIdx] : null;
      return { ...rank, totalXP, next, progress: next ? (totalXP - rank.xp) / (next.xp - rank.xp) : 1 };
    },
  };

  /* ──────────────────────────────────────────────────────────────
     META-RULE MANAGER — rules that modify rules
  ────────────────────────────────────────────────────────────── */
  function applyMetaRules(state) {
    const logs = state.logs || [];
    const readinesses = logs.slice(-14).map(l => l.readiness || 70);
    const variance = Math2.variance(readinesses);

    // High variance in readiness → be more conservative across board
    if (variance > 200) {
      state._meta_conservative = true;
    }

    // Injury streak (multiple emergency stops) → lower all thresholds
    const recentStats = RuleTracker.getAll();
    const s001 = recentStats['S001'];
    if (s001 && s001.total > 3 && (s001.bad || 0) / s001.total > 0.3) {
      state._meta_injury_flag = true;
    }

    return state;
  }

  /* ──────────────────────────────────────────────────────────────
     MAIN ENGINE — PUBLIC API
  ────────────────────────────────────────────────────────────── */

  /**
   * evaluate(input, logs) — Main entry point
   * @param {object} input - current state inputs
   * @param {Array}  logs  - workout log history
   * @returns {object}     - full plan with explanation
   */
  function evaluate(input = {}, logs = []) {
    // 1. Build state
    const baseline = baselineEngine.compute(logs);
    const fatigueIndex = calcFatigueIndex(logs);
    const repsTrend4w  = calcTrend(logs, 'volumeLoad', 4);
    const rpeTrend     = calcTrend(logs, 'avgRpe', 2);

    let state = {
      // Direct inputs
      readiness:    input.readiness  ?? 70,
      soreness:     input.soreness   ?? 3,
      sleepHours:   input.sleepHours ?? 7,
      hrvManual:    input.hrvManual  ?? 3,
      motivation:   input.motivation ?? 3,
      dutyShift:    input.dutyShift  ?? 'none',
      equipment:    input.equipment  ?? 'bodyweight',
      timeAvailable:input.timeAvailable ?? 45,
      focus:        input.focus      ?? 'fullbody',
      hour:         new Date().getHours(),

      // Computed
      fatigueIndex,
      repsTrend4w,
      rpeTrend,
      baseline,
      logs,

      // Meta flags
      _meta_conservative: false,
      _meta_injury_flag:  false,
    };

    // 2. Apply meta-rules
    state = applyMetaRules(state);

    // 3. Build explain chain
    const chain = new ExplainChain('ULTIMATE ENGINE — Intelligence Chain');
    chain.input('Readiness', Math.round(state.readiness), '/100');
    chain.input('Soreness',  state.soreness, '/10');
    chain.input('Sleep',     state.sleepHours, 'h');
    chain.input('Fatigue Index', Math.round(state.fatigueIndex), '%');
    chain.input('Baseline Readiness (P50)', Math.round(state.baseline.readiness_p50), '/100');
    chain.input('RPE Trend (2w)', `${(state.rpeTrend * 100).toFixed(1)}%`);

    if (state._meta_conservative) chain.warn('High readiness variance — conservative mode active');
    if (state._meta_injury_flag)  chain.warn('Injury history detected — extra caution');

    // 4. Hierarchical rule evaluation
    const rulesets = [
      { name: 'SAFETY',      rules: SAFETY_RULES },
      { name: 'RECOVERY',    rules: RECOVERY_RULES },
      { name: 'PERFORMANCE', rules: PERFORMANCE_RULES },
      { name: 'PROGRESSION', rules: PROGRESSION_RULES },
    ];

    let plan = null;
    let triggeredRule = null;

    for (const { name, rules } of rulesets) {
      for (const rule of rules) {
        if (rule.check(state)) {
          chain.decide(`[${name}] ${rule.name}`, 'TRIGGERED', rule.id);
          plan = rule.plan(state, chain);
          triggeredRule = rule;
          break;
        }
      }
      if (plan) break;
    }

    if (!plan) {
      chain.conclude('Fallback: standard protocol');
      plan = {
        mode: 'standard', sets: 3, reps: '10', repsNum: 10, rpe: 7,
        exercises: getProgExercises(state, 'normal'),
        note: '📈 Standard Training', color: 'green',
      };
    }

    // 5. Simulate 3-day outcome
    const projection = simulate3Days(state, plan);

    // 6. Build confidence score
    const confidence = calcConfidence(state, plan, projection);

    return {
      plan,
      state,
      baseline,
      projection,
      confidence,
      explanation: chain.toHTML(),
      triggeredRule: triggeredRule?.id,
      timestamp: Date.now(),
    };
  }

  function calcConfidence(state, plan, projection) {
    let score = 0.7;
    if (state.baseline.session_count >= 20) score += 0.10;
    if (state.baseline.session_count >= 50) score += 0.10;
    if (projection.overreachRisk === 'LOW')  score += 0.05;
    if (state._meta_conservative)            score -= 0.05;
    return Math2.clamp(Math.round(score * 100) / 100, 0.40, 0.98);
  }

  /* ──────────────────────────────────────────────────────────────
     COMMUNITY EXPORT / IMPORT
  ────────────────────────────────────────────────────────────── */
  function exportRuleset(baseline, performanceStats, profile) {
    const payload = {
      id: `op_${Date.now()}`,
      version: '3.0',
      baselineProfile: baseline,
      performance: performanceStats,
      userMetrics: {
        adherence: profile?.adherenceRate || 0,
        sessionCount: profile?.totalDaysActive || 0,
        rank: profile?.currentRank || 'พลเรือน',
      },
      exported: new Date().toISOString(),
    };
    return `operatorprotocol://v3?data=${btoa(JSON.stringify(payload))}`;
  }

  function importRuleset(url) {
    try {
      const raw = url.split('data=')[1];
      return raw ? JSON.parse(atob(raw)) : null;
    } catch (e) { return null; }
  }

  /* ──────────────────────────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────────────────────────── */
  return {
    evaluate,
    calcFatigueIndex,
    calcTrend,
    simulate3Days,
    BaselineEngine,
    baselineEngine,
    RuleTracker,
    XPSystem,
    exportRuleset,
    importRuleset,
  };

})();
