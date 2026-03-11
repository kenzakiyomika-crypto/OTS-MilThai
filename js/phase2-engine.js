/**
 * TACTICAL FITNESS — PHASE 2 ENGINE
 * ════════════════════════════════════════════════════
 * Week 4: AAR Generator (After Action Review)
 * Week 5: Progressive Overload Engine
 * Week 6: Periodization Engine (12-week blocks)
 * Week 7-8: Medical Log + Injury Risk Predictor
 * ════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════
   WEEK 4 — AAR GENERATOR
   สรุปผลการฝึกรายสัปดาห์ Strong/Weak/Trend
══════════════════════════════════════════════════ */

const AARGenerator = (() => {

  /**
   * สร้าง After Action Review จาก logs ของสัปดาห์ที่กำหนด
   * @param {Array}  allLogs  - WorkoutLog[] ทั้งหมด
   * @param {object} pr       - PRRecord
   * @param {object} profile  - UserProfile
   * @param {Date}   weekStart - วันจันทร์ของสัปดาห์ (default: สัปดาห์ล่าสุด)
   */
  function generate(allLogs, pr, profile, weekStart = null) {
    const now = new Date();

    // Determine week range
    if (!weekStart) {
      const dow = now.getDay();
      weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      weekStart.setHours(0, 0, 0, 0);
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const ws = weekStart.toISOString().split('T')[0];
    const we = weekEnd.toISOString().split('T')[0];

    // Previous week for comparison
    const prevStart = new Date(weekStart); prevStart.setDate(weekStart.getDate() - 7);
    const prevEnd   = new Date(weekEnd);   prevEnd.setDate(weekEnd.getDate() - 7);
    const ps = prevStart.toISOString().split('T')[0];
    const pe = prevEnd.toISOString().split('T')[0];

    const weekLogs = allLogs.filter(l => l.date >= ws && l.date <= we);
    const prevLogs = allLogs.filter(l => l.date >= ps && l.date <= pe);

    // Core metrics
    const sessionCount   = weekLogs.length;
    const prevCount      = prevLogs.length;
    const totalVolume    = weekLogs.reduce((s, l) => s + (l.volumeLoad || 0), 0);
    const prevVolume     = prevLogs.reduce((s, l) => s + (l.volumeLoad || 0), 0);
    const avgCompletion  = sessionCount ? Math.round(weekLogs.reduce((s,l) => s+(l.completionPct||0), 0) / sessionCount) : 0;
    const totalDuration  = weekLogs.reduce((s, l) => s + (l.durationMinutes || 0), 0);
    const avgDuration    = sessionCount ? Math.round(totalDuration / sessionCount) : 0;

    // Exercise breakdown
    const exerciseMap = {};
    weekLogs.forEach(log => {
      (log.exercises || []).forEach(ex => {
        if (!exerciseMap[ex.name]) exerciseMap[ex.name] = { reps: 0, sets: 0, count: 0 };
        const reps = (ex.actualReps || []).reduce((s,r,i) => s + (ex.setDone?.[i] ? r : 0), 0);
        exerciseMap[ex.name].reps  += reps;
        exerciseMap[ex.name].sets  += (ex.setDone || []).filter(Boolean).length;
        exerciseMap[ex.name].count++;
      });
    });

    const topExercises = Object.entries(exerciseMap)
      .sort((a,b) => b[1].reps - a[1].reps)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    // ACWR
    const acwr = _calcACWR(allLogs, we);

    // Trend analysis
    const volumeTrend  = prevVolume  > 0 ? Math.round(((totalVolume - prevVolume)  / prevVolume)  * 100) : null;
    const sessionTrend = prevCount   > 0 ? Math.round(((sessionCount - prevCount)  / prevCount)   * 100) : null;

    // Strong / Weak / Action
    const strong = _identifyStrengths(weekLogs, pr, profile, sessionCount, acwr, avgCompletion);
    const weak   = _identifyWeaknesses(weekLogs, pr, acwr, sessionCount, avgCompletion);
    const action = _generateActions(weak, acwr, sessionCount, profile);

    // PR this week
    const newPRs = _findNewPRs(weekLogs, pr);

    // Score (0-100)
    let score = 50;
    score += Math.min(20, sessionCount * 5);
    score += Math.min(15, Math.round(avgCompletion * 0.15));
    score += acwr >= 0.8 && acwr <= 1.3 ? 10 : acwr > 1.5 ? -10 : 0;
    score += newPRs.length > 0 ? 10 : 0;
    score += sessionTrend > 0 ? 5 : 0;
    score = Math.max(0, Math.min(100, score));

    const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'D';

    return {
      weekLabel:    _fmtWeekLabel(weekStart, weekEnd),
      weekStart:    ws,
      weekEnd:      we,
      grade,
      score,
      sessionCount,
      prevCount,
      sessionTrend,
      totalVolume,
      prevVolume,
      volumeTrend,
      avgCompletion,
      avgDuration,
      totalDuration,
      acwr: Math.round(acwr * 100) / 100,
      topExercises,
      newPRs,
      strong,
      weak,
      action,
      generatedAt: Date.now(),
    };
  }

  /* ── Helpers ── */

  function _calcACWR(logs, toDateStr) {
    const to    = new Date(toDateStr);
    const acute = _volumeInWindow(logs, to, 7);
    const from4 = new Date(to); from4.setDate(to.getDate() - 27);
    const chronic4w = _volumeInWindow(logs, to, 28);
    const chronicAvg = chronic4w / 4;
    if (chronicAvg === 0) return 1.0;
    return Math.round((acute / chronicAvg) * 100) / 100;
  }

  function _volumeInWindow(logs, toDate, days) {
    const fromDate = new Date(toDate); fromDate.setDate(toDate.getDate() - days + 1);
    const fs = fromDate.toISOString().split('T')[0];
    const ts = toDate.toISOString().split('T')[0];
    return logs.filter(l => l.date >= fs && l.date <= ts)
               .reduce((s,l) => s + (l.volumeLoad || l.durationMinutes || 0), 0);
  }

  function _identifyStrengths(logs, pr, profile, count, acwr, completion) {
    const items = [];
    if (count >= 5)         items.push(`ฝึก ${count} ครั้งในสัปดาห์ — consistency ยอดเยี่ยม`);
    if (completion >= 85)   items.push(`Completion rate ${completion}% — execute ได้ตามแผน`);
    if (acwr >= 0.8 && acwr <= 1.3) items.push(`ACWR ${acwr} — training load สมดุล optimal zone`);
    if (profile?.currentStreak >= 7) items.push(`Streak ${profile.currentStreak} วัน — discipline ต่อเนื่อง`);
    if (items.length === 0) items.push('เริ่มสร้างฐานการฝึก — ทุก session มีค่า');
    return items;
  }

  function _identifyWeaknesses(logs, pr, acwr, count, completion) {
    const items = [];
    if (count < 3)          items.push(`ฝึกแค่ ${count} ครั้ง — target: 4-5 ครั้ง/สัปดาห์`);
    if (completion < 70)    items.push(`Completion ${completion}% ต่ำ — ตรวจสอบ session duration หรือ exercise selection`);
    if (acwr > 1.5)         items.push(`ACWR ${acwr} สูงเกินไป — เสี่ยง overtraining`);
    if (acwr < 0.6 && count > 0) items.push(`ACWR ${acwr} ต่ำ — underload, สามารถเพิ่ม volume ได้`);
    if (items.length === 0) items.push('ไม่มีจุดอ่อนเด่นชัด — รักษามาตรฐานนี้ไว้');
    return items;
  }

  function _generateActions(weak, acwr, count, profile) {
    const actions = [];
    if (count < 3)       actions.push('เพิ่มความถี่: เพิ่ม 1 session สั้นๆ 30 นาที/วัน');
    if (acwr > 1.5)      actions.push('ลด volume 30% สัปดาห์หน้า — ให้ร่างกายฟื้นตัว');
    if (acwr < 0.6)      actions.push('เพิ่ม intensity: เพิ่ม sets หรือ reps 10%');
    const rankIdx = profile?.rankIndex || 0;
    if (rankIdx < 5)     actions.push('โฟกัส: Push-up + Pull-up → ปลดล็อค NCO rank');
    if (actions.length === 0) actions.push('Progressive overload: เพิ่ม reps 5-10% จากสัปดาห์ที่แล้ว');
    return actions;
  }

  function _findNewPRs(logs, pr) {
    if (!pr) return [];
    const newPRs = [];
    logs.forEach(log => {
      (log.exercises || []).forEach(ex => {
        const best = Math.max(...(ex.actualReps || [0]));
        if (ex.name === 'Push-up' && best > (pr.pushup?.value||0)) newPRs.push(`Push-up: ${best} reps`);
        if (ex.name === 'Pull-up' && best > (pr.pullup?.value||0)) newPRs.push(`Pull-up: ${best} reps`);
        if (ex.name === 'Sit-up'  && best > (pr.situp?.value||0))  newPRs.push(`Sit-up: ${best} reps`);
      });
    });
    return [...new Set(newPRs)];
  }

  function _fmtWeekLabel(start, end) {
    const d1 = `${start.getDate()}/${start.getMonth()+1}`;
    const d2 = `${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()+543}`;
    return `${d1} – ${d2}`;
  }

  /** สร้าง AAR ย้อนหลัง N สัปดาห์ */
  function generateHistory(allLogs, pr, profile, weeks = 4) {
    const results = [];
    const now  = new Date();
    const dow  = now.getDay();
    const mon  = new Date(now);
    mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    mon.setHours(0,0,0,0);

    for (let i = 0; i < weeks; i++) {
      const ws = new Date(mon);
      ws.setDate(mon.getDate() - i * 7);
      results.push(generate(allLogs, pr, profile, ws));
    }
    return results;
  }

  return { generate, generateHistory };
})();

/* ══════════════════════════════════════════════════
   WEEK 5 — PROGRESSIVE OVERLOAD ENGINE
   คำนวณ target reps/sets สำหรับ session ถัดไป
══════════════════════════════════════════════════ */

const ProgressiveOverload = (() => {

  // Overload rates per exercise type
  const RATES = {
    'Push-up':       { rep: 0.05,  set: 0,    minRep: 10,  maxRep: 150, minSet: 3, maxSet: 6 },
    'Pull-up':       { rep: 0.07,  set: 0,    minRep: 3,   maxRep: 40,  minSet: 3, maxSet: 5 },
    'Sit-up':        { rep: 0.05,  set: 0,    minRep: 15,  maxRep: 100, minSet: 3, maxSet: 5 },
    'Plank':         { rep: 0,     set: 0,    minDur: 20,  maxDur: 600, durStep: 15 },
    'Dip':           { rep: 0.06,  set: 0,    minRep: 6,   maxRep: 30,  minSet: 3, maxSet: 5 },
    'Squat':         { rep: 0.05,  set: 0,    minRep: 10,  maxRep: 60,  minSet: 3, maxSet: 5 },
    'Burpee':        { rep: 0.08,  set: 0,    minRep: 5,   maxRep: 30,  minSet: 3, maxSet: 5 },
    'default':       { rep: 0.05,  set: 0,    minRep: 8,   maxRep: 50,  minSet: 3, maxSet: 5 },
  };

  /**
   * คำนวณ target สำหรับ session ถัดไป
   * @param {string}  exerciseName
   * @param {Array}   recentLogs    - WorkoutLog[] ล่าสุด 4 สัปดาห์
   * @param {object}  pr            - PRRecord
   * @param {boolean} plateauFlag   - จาก UltimateEngine
   * @returns {object} { targetReps, targetSets, targetDuration, reason, intensity, 1rm }
   */
  function calcNext(exerciseName, recentLogs, pr, plateauFlag = false) {
    const rate = RATES[exerciseName] || RATES.default;

    // Find best performance in last 4 sessions of this exercise
    let lastBestReps = 0;
    let lastBestDur  = 0;
    let sessionsSincePR = 0;
    let repHistory = [];

    recentLogs.forEach(log => {
      (log.exercises || []).forEach(ex => {
        if (ex.name !== exerciseName) return;
        const reps = Math.max(...(ex.actualReps || [0]).filter((r,i) => ex.setDone?.[i] !== false));
        const dur  = Math.max(...(ex.actualReps || [0]).filter((r,i) => ex.setDone?.[i] !== false));
        if (reps > lastBestReps) { lastBestReps = reps; sessionsSincePR = 0; }
        else sessionsSincePR++;
        repHistory.push(reps);
      });
    });

    // Get PR baseline
    const prVal = _getPRValue(exerciseName, pr);

    // Determine plateau
    const isPlateaued = plateauFlag || (repHistory.length >= 3 &&
      repHistory.slice(-3).every(r => Math.abs(r - repHistory[repHistory.length-1]) <= 1));

    let targetReps     = lastBestReps || prVal || (rate.minRep || 10);
    let targetSets     = 3;
    let targetDuration = lastBestDur || (rate.minDur || 60);
    let reason         = 'ตามแผน';
    let intensity      = 'normal';

    if (exerciseName === 'Plank') {
      // Plank: increase duration
      if (isPlateaued) {
        targetDuration = Math.min(rate.maxDur, (targetDuration || 60) + (rate.durStep || 15));
        reason = `เพิ่มเวลา ${rate.durStep}s — bust plateau`;
        intensity = 'high';
      } else {
        targetDuration = Math.min(rate.maxDur, Math.round((targetDuration || 60) * 1.1));
        reason = 'เพิ่ม 10% จาก session ล่าสุด';
      }
    } else if (isPlateaued) {
      // Plateau: switch strategy
      targetReps = Math.round(targetReps * 0.9);
      targetSets = Math.min(rate.maxSet, targetSets + 1);
      reason = 'Plateau detected → ลด reps + เพิ่ม sets';
      intensity = 'high';
    } else {
      // Normal progression
      const increase = Math.max(1, Math.round(targetReps * rate.rep));
      targetReps = Math.min(rate.maxRep, targetReps + increase);
      reason = `+${increase} reps (${Math.round(rate.rep*100)}% overload)`;
      intensity = 'normal';
    }

    // 1RM estimate (Epley formula for bodyweight exercises)
    const oneRM = targetReps <= 1 ? targetReps : Math.round(targetReps * (1 + 0.0333 * Math.min(targetReps, 30)));

    return {
      exerciseName,
      targetReps:     Math.max(rate.minRep || 1, targetReps),
      targetSets:     Math.max(rate.minSet || 3, targetSets),
      targetDuration: Math.max(rate.minDur || 0, targetDuration),
      isPlateaued,
      reason,
      intensity,
      oneRM,
      prCurrent:  prVal,
      isNewPRPossible: targetReps > prVal,
    };
  }

  function _getPRValue(name, pr) {
    if (!pr) return 0;
    const map = {
      'Push-up': pr.pushup?.value,
      'Pull-up': pr.pullup?.value,
      'Sit-up':  pr.situp?.value,
      'Plank':   pr.plank?.value,
    };
    return map[name] || 0;
  }

  /**
   * สร้าง Progressive Plan สำหรับ 4 สัปดาห์ข้างหน้า
   */
  function generateFourWeekPlan(exercises, recentLogs, pr) {
    return exercises.map(exName => {
      const weeks = [];
      let simLogs = [...recentLogs];
      let simPR   = pr ? { ...pr } : {};

      for (let w = 1; w <= 4; w++) {
        const next = calcNext(exName, simLogs, simPR);
        weeks.push({ week: w, ...next });
        // Simulate: add fake log entry for next week
        const fakeLog = {
          date: _addWeeks(new Date(), w).toISOString().split('T')[0],
          exercises: [{ name: exName, actualReps: Array(next.targetSets).fill(next.targetReps), setDone: Array(next.targetSets).fill(true) }],
        };
        simLogs = [...simLogs.slice(-20), fakeLog];
      }
      return { exercise: exName, weeks };
    });
  }

  function _addWeeks(date, n) {
    const d = new Date(date); d.setDate(d.getDate() + n * 7); return d;
  }

  return { calcNext, generateFourWeekPlan };
})();

/* ══════════════════════════════════════════════════
   WEEK 6 — PERIODIZATION ENGINE
   12-week Strength → Power → Endurance → Deload auto-cycle
══════════════════════════════════════════════════ */

const PeriodizationEngine = (() => {

  const PHASES = {
    strength: {
      name:    'STRENGTH',
      thLabel: 'สร้างฐานกำลัง',
      color:   '#00ff88',
      weeks:   4,
      repsRange: [6, 12],
      setsRange: [4, 5],
      restSec:   90,
      rpe:       7,
      focus:     ['Push-up', 'Pull-up', 'Dip', 'Squat'],
      cue:       'เน้น max reps + slow eccentric',
    },
    power: {
      name:    'POWER',
      thLabel: 'เพิ่มความเร็วและระเบิด',
      color:   '#ffaa00',
      weeks:   3,
      repsRange: [4, 8],
      setsRange: [5, 6],
      restSec:   120,
      rpe:       8,
      focus:     ['Burpee', 'Box Jump', 'Explosive Push-up', 'Sprint'],
      cue:       'เน้น speed + explosiveness',
    },
    endurance: {
      name:    'ENDURANCE',
      thLabel: 'ความอึดและทน',
      color:   '#00b4ff',
      weeks:   3,
      repsRange: [15, 30],
      setsRange: [3, 4],
      restSec:   45,
      rpe:       6,
      focus:     ['วิ่ง 5km', 'Plank', 'Sit-up', 'Mountain Climber'],
      cue:       'เน้น volume + pace control',
    },
    deload: {
      name:    'DELOAD',
      thLabel: 'พักฟื้น + ฟื้นฟู',
      color:   '#888888',
      weeks:   1,
      repsRange: [8, 12],
      setsRange: [2, 3],
      restSec:   60,
      rpe:       5,
      focus:     ['เดิน', 'Stretch', 'Plank', 'Light Run'],
      cue:       'ลด volume 50% — ให้ร่างกายฟื้น supercompensation',
    },
    peak: {
      name:    'PEAK',
      thLabel: 'ทดสอบ PR สูงสุด',
      color:   '#ff2d2d',
      weeks:   1,
      repsRange: [1, 5],
      setsRange: [3, 5],
      restSec:   180,
      rpe:       9,
      focus:     ['Push-up MAX', 'Pull-up MAX', 'Run 2.4km Test'],
      cue:       'ทุก set เป็น near-maximal — วัด PR ก่อน cycle ใหม่',
    },
  };

  // Standard 12-week block: S4 + P3 + E3 + D1 + Peak1
  const BLOCK_SEQUENCE = ['strength', 'power', 'endurance', 'deload', 'peak'];

  /**
   * คำนวณ phase ปัจจุบันจากวันที่เริ่มต้น + จำนวน session
   * @param {Date}   startDate  - วันเริ่ม 12-week cycle
   * @param {number} totalDays  - วันที่ฝึกทั้งหมด (totalDaysActive)
   * @returns {object} { phase, weekInPhase, weekInBlock, weeksRemaining, nextPhase, schedule }
   */
  function getCurrentPhase(startDate, totalDays) {
    if (!startDate) startDate = new Date();

    const daysSinceStart = Math.max(0, Math.floor((Date.now() - new Date(startDate)) / 86400000));
    const weekNumber     = Math.floor(daysSinceStart / 7) + 1;
    const blockWeek      = ((weekNumber - 1) % 12) + 1; // 1-12 cycling

    // Determine phase from block week
    let accumulated = 0;
    let currentPhaseName = 'strength';
    let weekInPhase = 1;

    for (const phaseName of BLOCK_SEQUENCE) {
      const phaseWeeks = PHASES[phaseName].weeks;
      if (blockWeek <= accumulated + phaseWeeks) {
        currentPhaseName = phaseName;
        weekInPhase = blockWeek - accumulated;
        break;
      }
      accumulated += phaseWeeks;
    }

    const phase        = PHASES[currentPhaseName];
    const nextPhaseName = _getNextPhase(currentPhaseName);
    const nextPhase    = PHASES[nextPhaseName];
    const weeksRemaining = phase.weeks - weekInPhase;

    // Generate 12-week schedule
    const schedule = _generateSchedule(new Date(startDate));

    return {
      phase: { ...phase, key: currentPhaseName },
      weekInPhase,
      blockWeek,
      weekNumber,
      weeksRemaining,
      nextPhase: { ...nextPhase, key: nextPhaseName },
      schedule,
    };
  }

  function _getNextPhase(current) {
    const idx = BLOCK_SEQUENCE.indexOf(current);
    return BLOCK_SEQUENCE[(idx + 1) % BLOCK_SEQUENCE.length];
  }

  function _generateSchedule(startDate) {
    const weeks = [];
    let weekStart = new Date(startDate);
    let phaseIdx  = 0;
    let phaseWeekCount = 0;

    for (let w = 1; w <= 12; w++) {
      const phaseName  = BLOCK_SEQUENCE[phaseIdx] || 'strength';
      const phase      = PHASES[phaseName];
      phaseWeekCount++;

      weeks.push({
        week:      w,
        phase:     phaseName,
        phaseName: phase.name,
        thLabel:   phase.thLabel,
        color:     phase.color,
        weekStart: weekStart.toISOString().split('T')[0],
        rpe:       phase.rpe,
      });

      weekStart.setDate(weekStart.getDate() + 7);
      if (phaseWeekCount >= phase.weeks) {
        phaseIdx++;
        phaseWeekCount = 0;
      }
    }
    return weeks;
  }

  /**
   * คำนวณ adjusted reps/sets ตาม phase ปัจจุบัน
   */
  function adjustForPhase(baseReps, baseSets, phaseName) {
    const phase = PHASES[phaseName] || PHASES.strength;
    const [minR, maxR] = phase.repsRange;
    const [minS, maxS] = phase.setsRange;

    const reps = Math.max(minR, Math.min(maxR, baseReps));
    const sets = Math.max(minS, Math.min(maxS, baseSets));
    return { reps, sets, rest: phase.restSec, rpe: phase.rpe };
  }

  return { getCurrentPhase, adjustForPhase, PHASES };
})();

/* ══════════════════════════════════════════════════
   WEEK 7-8 — MEDICAL LOG + INJURY RISK PREDICTOR
══════════════════════════════════════════════════ */

const MedicalSystem = (() => {

  const STORAGE_KEY = 'tf_medical_log';
  const MAX_ENTRIES = 200;

  // Pain locations
  const BODY_PARTS = [
    { id: 'shoulder_l', label: 'ไหล่ซ้าย',    x: 30,  y: 22, affectedEx: ['Push-up','Pull-up','Dip'] },
    { id: 'shoulder_r', label: 'ไหล่ขวา',     x: 70,  y: 22, affectedEx: ['Push-up','Pull-up','Dip'] },
    { id: 'elbow_l',    label: 'ข้อศอกซ้าย',  x: 20,  y: 38, affectedEx: ['Push-up','Dip'] },
    { id: 'elbow_r',    label: 'ข้อศอกขวา',   x: 80,  y: 38, affectedEx: ['Push-up','Dip'] },
    { id: 'lower_back', label: 'หลังล่าง',     x: 50,  y: 50, affectedEx: ['Squat','Deadlift','Run'] },
    { id: 'knee_l',     label: 'เข่าซ้าย',    x: 35,  y: 72, affectedEx: ['Squat','Lunge','Run'] },
    { id: 'knee_r',     label: 'เข่าขวา',     x: 65,  y: 72, affectedEx: ['Squat','Lunge','Run'] },
    { id: 'ankle_l',    label: 'ข้อเท้าซ้าย', x: 37,  y: 90, affectedEx: ['Run','Jump'] },
    { id: 'ankle_r',    label: 'ข้อเท้าขวา',  x: 63,  y: 90, affectedEx: ['Run','Jump'] },
    { id: 'neck',       label: 'คอ',           x: 50,  y: 12, affectedEx: ['Pull-up'] },
    { id: 'wrist_l',    label: 'ข้อมือซ้าย',  x: 15,  y: 48, affectedEx: ['Push-up','Plank','Dip'] },
    { id: 'wrist_r',    label: 'ข้อมือขวา',   x: 85,  y: 48, affectedEx: ['Push-up','Plank','Dip'] },
  ];

  const SEVERITY = {
    1: { label: 'เจ็บเล็กน้อย',    color: '#00ff88', rtmDays: 0  },
    2: { label: 'เจ็บปานกลาง',    color: '#ffaa00', rtmDays: 2  },
    3: { label: 'เจ็บมาก',        color: '#ff6600', rtmDays: 5  },
    4: { label: 'เจ็บรุนแรงมาก',  color: '#ff2d2d', rtmDays: 14 },
    5: { label: 'ไม่สามารถฝึก',   color: '#ff0000', rtmDays: 21 },
  };

  /* ── Storage ── */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function save(entries) {
    try {
      const trimmed = entries.slice(-MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch(e) {}
  }

  function logPain(partId, severity, notes = '') {
    const entries = load();
    const entry = {
      id:       `med_${Date.now()}`,
      date:     new Date().toISOString().split('T')[0],
      time:     new Date().toTimeString().slice(0,5),
      partId,
      severity,
      notes,
      rtmDate:  _calcRTM(severity),
    };
    entries.push(entry);
    save(entries);
    return entry;
  }

  function resolve(entryId) {
    const entries = load();
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx !== -1) {
      entries[idx].resolved   = true;
      entries[idx].resolvedAt = new Date().toISOString();
      save(entries);
    }
  }

  function getActive() {
    return load().filter(e => !e.resolved);
  }

  function getAll() { return load(); }

  function _calcRTM(severity) {
    const days = SEVERITY[severity]?.rtmDays || 0;
    if (!days) return null;
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /* ── Injury Risk Score ── */
  function calcInjuryRisk(logs, pr, activeInjuries) {
    let riskScore = 0;
    const factors = [];

    // Factor 1: Active injuries
    if (activeInjuries.length > 0) {
      const maxSev = Math.max(...activeInjuries.map(i => i.severity));
      riskScore += maxSev * 15;
      factors.push({ factor: `บาดเจ็บ active ${activeInjuries.length} จุด`, impact: maxSev * 15 });
    }

    // Factor 2: ACWR
    const today = new Date().toISOString().split('T')[0];
    const acute = _countSessions(logs, 7);
    const chronic = _countSessions(logs, 28) / 4;
    const acwr = chronic > 0 ? acute / chronic : 1.0;

    if (acwr > 1.5) {
      riskScore += 30;
      factors.push({ factor: `ACWR ${acwr.toFixed(2)} สูงเกิน 1.5`, impact: 30 });
    } else if (acwr > 1.3) {
      riskScore += 15;
      factors.push({ factor: `ACWR ${acwr.toFixed(2)} ใน caution zone`, impact: 15 });
    }

    // Factor 3: Consecutive days without rest
    const sortedDates = [...new Set(logs.map(l => l.date))].sort().reverse();
    let consecutiveDays = 0;
    const todayStr = today;
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(todayStr);
      expected.setDate(expected.getDate() - i);
      if (sortedDates[i] === expected.toISOString().split('T')[0]) consecutiveDays++;
      else break;
    }
    if (consecutiveDays >= 7) {
      riskScore += 20;
      factors.push({ factor: `ฝึก ${consecutiveDays} วันต่อเนื่องไม่มีหยุด`, impact: 20 });
    }

    // Factor 4: Low completion (fatigue indicator)
    const recentLogs = logs.slice(-5);
    const avgCompletion = recentLogs.length
      ? recentLogs.reduce((s,l) => s + (l.completionPct||100), 0) / recentLogs.length
      : 100;
    if (avgCompletion < 60) {
      riskScore += 15;
      factors.push({ factor: `Completion rate ${Math.round(avgCompletion)}% ต่ำ (fatigue indicator)`, impact: 15 });
    }

    riskScore = Math.min(100, riskScore);

    let level, color, action;
    if (riskScore >= 70)      { level = 'HIGH';   color = 'red';   action = 'หยุดพัก 48-72ชม และปรึกษาแพทย์หากเจ็บนาน'; }
    else if (riskScore >= 40) { level = 'MEDIUM'; color = 'amber'; action = 'ลด volume 40% และเลี่ยงท่าที่เจ็บ'; }
    else                      { level = 'LOW';    color = 'green'; action = 'ฝึกได้ตามปกติ — คง form ที่ถูกต้อง'; }

    // Blocked exercises based on active injuries
    const blockedEx = new Set();
    if (riskScore >= 70) {
      activeInjuries.forEach(inj => {
        const part = BODY_PARTS.find(p => p.id === inj.partId);
        if (part) part.affectedEx.forEach(ex => blockedEx.add(ex));
      });
    }

    return {
      score: riskScore,
      level,
      color,
      action,
      factors,
      blockedExercises: [...blockedEx],
      acwr: Math.round(acwr * 100) / 100,
      consecutiveDays,
    };
  }

  function _countSessions(logs, days) {
    const from = new Date(); from.setDate(from.getDate() - days);
    const fs   = from.toISOString().split('T')[0];
    return logs.filter(l => l.date >= fs).length;
  }

  /* ── RTM Calculator ── */
  function getRTMStatus(entry) {
    if (!entry.rtmDate) return { ready: true, daysLeft: 0 };
    const today  = new Date().toISOString().split('T')[0];
    const rtm    = entry.rtmDate;
    if (today >= rtm) return { ready: true, daysLeft: 0 };
    const days = Math.ceil((new Date(rtm) - new Date(today)) / 86400000);
    return { ready: false, daysLeft: days };
  }

  return {
    BODY_PARTS,
    SEVERITY,
    logPain,
    resolve,
    getActive,
    getAll,
    calcInjuryRisk,
    getRTMStatus,
  };
})();

/* ══════════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════════ */
window.AARGenerator      = AARGenerator;
window.ProgressiveOverload = ProgressiveOverload;
window.PeriodizationEngine = PeriodizationEngine;
window.MedicalSystem     = MedicalSystem;
