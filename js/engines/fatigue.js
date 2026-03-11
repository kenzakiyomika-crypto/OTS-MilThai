/**
 * TACTICAL FITNESS — FATIGUE ENGINE v1.0
 * คำนวณ Fatigue Index จากข้อมูล workout logs
 * ใช้ ACWR (Acute:Chronic Workload Ratio) แบบง่าย
 */

'use strict';

const FatigueEngine = (() => {

  /* ─────────────────────────────────────────
     CONFIG
  ───────────────────────────────────────── */
  const CONFIG = {
    acuteWindow:  7,   // days (short-term load)
    chronicWindow: 28, // days (long-term baseline)
    maxConsecutive: 3, // วันฝึกต่อเนื่องก่อนแนะนำพัก
    volumePerRep: 1,   // default weight factor
  };

  /* ─────────────────────────────────────────
     LOAD CALCULATION
  ───────────────────────────────────────── */

  /**
   * คำนวณ total volume load ของ session
   * sets × reps × bodyweight_factor
   */
  function calcSessionLoad(log) {
    if (!log?.exercises?.length) return log?.volumeLoad || 0;

    return log.exercises.reduce((total, ex) => {
      if (ex.type === 'timed') {
        return total + (ex.sets || 1) * ((ex.actualDuration || ex.duration || 60) / 10);
      }
      if (ex.type === 'distance') {
        return total + ((ex.distance || 0) / 100);
      }
      // repetition
      const reps = ex.actualReps?.length
        ? ex.actualReps.reduce((s, r) => s + (r || 0), 0)
        : (ex.sets || 1) * (ex.reps || 0);
      return total + reps * CONFIG.volumePerRep;
    }, 0);
  }

  /**
   * คำนวณ average daily load ของ window ที่กำหนด
   * @param {Array} logs - sorted logs
   * @param {string} endDate - YYYY-MM-DD
   * @param {number} days - window size
   */
  function avgLoad(logs, endDate, days) {
    const end   = new Date(endDate + 'T00:00:00');
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);
    const startStr = start.toISOString().split('T')[0];

    const windowLogs = logs.filter(l => l.date >= startStr && l.date <= endDate);
    if (!windowLogs.length) return 0;

    const totalLoad = windowLogs.reduce((s, l) => s + calcSessionLoad(l), 0);
    return totalLoad / days; // รวมวันพักด้วย (daily average)
  }

  /* ─────────────────────────────────────────
     ACWR — Acute:Chronic Workload Ratio
  ───────────────────────────────────────── */

  /**
   * คำนวณ ACWR
   * <0.8 = undertraining | 0.8–1.3 = sweet spot | >1.5 = overload risk
   */
  function calcACWR(logs, asOfDate = null) {
    const date = asOfDate || new Date().toISOString().split('T')[0];
    const acute   = avgLoad(logs, date, CONFIG.acuteWindow);
    const chronic = avgLoad(logs, date, CONFIG.chronicWindow);

    if (!chronic) return 1.0; // no baseline yet → neutral
    return Math.round((acute / chronic) * 100) / 100;
  }

  /* ─────────────────────────────────────────
     CONSECUTIVE DAYS
  ───────────────────────────────────────── */

  function calcConsecutiveDays(logs) {
    if (!logs?.length) return 0;

    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    const today  = new Date().toISOString().split('T')[0];
    const dates  = new Set(sorted.map(l => l.date));

    let count = 0;
    let check = today;
    while (dates.has(check)) {
      count++;
      const d = new Date(check + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      check = d.toISOString().split('T')[0];
    }
    return count;
  }

  /* ─────────────────────────────────────────
     FATIGUE INDEX (0–100)
  ───────────────────────────────────────── */

  /**
   * คำนวณ Fatigue Index รวม
   * ผลรวมของ ACWR + consecutive days + weekly density
   * @returns {object} { index, label, acwr, consecutive, recommendation }
   */
  function calcFatigueIndex(logs, asOfDate = null) {
    if (!logs?.length) {
      return { index: 0, label: 'fresh', acwr: 1.0, consecutive: 0, weeklyLoad: 0, recommendation: 'เริ่มฝึกได้เลย' };
    }

    const acwr        = calcACWR(logs, asOfDate);
    const consecutive = calcConsecutiveDays(logs);
    const date        = asOfDate || new Date().toISOString().split('T')[0];
    const weeklyLoad  = avgLoad(logs, date, 7) * 7;

    // Fatigue score components (0–100)
    let score = 0;

    // ACWR component (weight: 50%)
    if (acwr > 1.5)       score += 50;
    else if (acwr > 1.3)  score += 35;
    else if (acwr > 1.1)  score += 20;
    else if (acwr < 0.6)  score += 5; // undertrained also mild concern
    else                   score += 0;

    // Consecutive days (weight: 30%)
    if (consecutive >= 5)      score += 30;
    else if (consecutive >= 4) score += 20;
    else if (consecutive >= 3) score += 10;
    else                        score += 0;

    // Weekly session count (weight: 20%)
    const weekStart = new Date(date + 'T00:00:00');
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const weekCount = logs.filter(l =>
      l.date >= weekStart.toISOString().split('T')[0] &&
      l.date <= weekEnd.toISOString().split('T')[0]
    ).length;

    if (weekCount >= 6)      score += 20;
    else if (weekCount >= 5) score += 10;
    else                      score += 0;

    score = Math.min(100, Math.max(0, score));

    // Label
    let label, recommendation;
    if (score <= 20) {
      label = 'fresh';
      recommendation = 'สภาพร่างกายดีเยี่ยม พร้อมฝึกเต็มที่';
    } else if (score <= 45) {
      label = 'moderate';
      recommendation = 'มีความล้าพอสมควร ฝึกได้แต่ลดความหนักลง 10–20%';
    } else if (score <= 70) {
      label = 'tired';
      recommendation = 'ร่างกายเริ่มล้า แนะนำ active recovery หรือ light session';
    } else {
      label = 'overload';
      recommendation = 'ควรพักอย่างน้อย 1–2 วัน เสี่ยงต่อการบาดเจ็บ';
    }

    return { index: score, label, acwr, consecutive, weeklyLoad, recommendation };
  }

  /* ─────────────────────────────────────────
     RECOVERY PREDICTION
  ───────────────────────────────────────── */

  /**
   * คาดการณ์ว่าต้องพักกี่วันถึงจะ fresh
   */
  function daysToRecovery(fatigueResult) {
    const { index } = fatigueResult;
    if (index <= 20) return 0;
    if (index <= 45) return 1;
    if (index <= 70) return 2;
    return 3;
  }

  /* ─────────────────────────────────────────
     WEEKLY LOAD TREND
  ───────────────────────────────────────── */

  /**
   * คำนวณ load รายสัปดาห์ย้อนหลัง N สัปดาห์
   * @returns {Array} [{ weekLabel, load, sessions }]
   */
  function weeklyLoadTrend(logs, weeks = 8) {
    const today  = new Date();
    const result = [];

    for (let w = weeks - 1; w >= 0; w--) {
      const mon = new Date(today);
      mon.setDate(today.getDate() - today.getDay() + 1 - w * 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const monStr = mon.toISOString().split('T')[0];
      const sunStr = sun.toISOString().split('T')[0];

      const weekLogs = logs.filter(l => l.date >= monStr && l.date <= sunStr);
      const load     = weekLogs.reduce((s, l) => s + calcSessionLoad(l), 0);

      result.push({
        weekLabel: `W${weeks - w}`,
        weekStart: monStr,
        load:      Math.round(load),
        sessions:  weekLogs.length,
      });
    }

    return result;
  }

  /* ─────────────────────────────────────────
     SMART REST DAY SUGGESTION
  ───────────────────────────────────────── */

  /**
   * แนะนำว่าวันนี้ควรฝึกหรือพัก
   * @returns {'train'|'rest'|'light'} recommendation
   */
  function suggestToday(logs) {
    const fatigue = calcFatigueIndex(logs);

    if (fatigue.label === 'overload')  return 'rest';
    if (fatigue.label === 'tired')     return 'light';
    if (fatigue.consecutive >= CONFIG.maxConsecutive) return 'rest';
    return 'train';
  }

  /* ─────────────────────────────────────────
     SAVE SNAPSHOT TO STORAGE
  ───────────────────────────────────────── */

  async function saveSnapshot(logs) {
    try {
      const result   = calcFatigueIndex(logs);
      const snapshot = Schema.createFatigueSnapshot({
        date:            new Date().toISOString().split('T')[0],
        index:           result.index,
        label:           result.label,
        weeklyLoad:      result.weeklyLoad,
        consecutiveDays: result.consecutive,
      });
      await Storage.Fatigue.save(snapshot);
      return snapshot;
    } catch (err) {
      console.warn('[FatigueEngine] Could not save snapshot:', err);
      return null;
    }
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  return {
    calcFatigueIndex,
    calcACWR,
    calcConsecutiveDays,
    calcSessionLoad,
    weeklyLoadTrend,
    daysToRecovery,
    suggestToday,
    saveSnapshot,
  };

})();
