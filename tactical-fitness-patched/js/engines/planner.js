/**
 * TACTICAL FITNESS — PLANNER ENGINE v1.0
 * สร้างตารางฝึกรายเดือนอัตโนมัติ
 * รองรับ 4 โปรแกรม: fullbody / upper_lower / push_pull / cardio_strength
 */

'use strict';

const PlannerEngine = (() => {

  /* ─────────────────────────────────────────
     PROGRAM TEMPLATES
  ───────────────────────────────────────── */

  const PROGRAMS = {

    fullbody: {
      name: 'Full Body',
      description: 'ฝึกทุกกลุ่มกล้ามเนื้อในแต่ละวัน เหมาะสำหรับ 3 วัน/สัปดาห์',
      days: [
        {
          focus: 'Full Body A',
          exercises: [
            { name: 'Push-up',   type: 'repetition', sets: 4, reps: 15, rest: 60, muscleGroup: 'upper' },
            { name: 'Pull-up',   type: 'repetition', sets: 3, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Squat',     type: 'repetition', sets: 4, reps: 15, rest: 60, muscleGroup: 'lower' },
            { name: 'Plank',     type: 'timed',      sets: 3, duration: 60, rest: 45, muscleGroup: 'core' },
            { name: 'Burpee',    type: 'repetition', sets: 3, reps: 10, rest: 60, muscleGroup: 'cardio' },
          ],
        },
        {
          focus: 'Full Body B',
          exercises: [
            { name: 'Diamond Push-up', type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Chin-up',         type: 'repetition', sets: 3, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Lunge',           type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'lower' },
            { name: 'Sit-up',          type: 'repetition', sets: 3, reps: 20, rest: 45, muscleGroup: 'core' },
            { name: 'วิ่ง 2km',         type: 'distance',   sets: 1, distance: 2000, rest: 0, muscleGroup: 'cardio' },
          ],
        },
        {
          focus: 'Full Body C',
          exercises: [
            { name: 'Pike Push-up',    type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Inverted Row',    type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Step-up',         type: 'repetition', sets: 3, reps: 12, rest: 45, muscleGroup: 'lower' },
            { name: 'Mountain Climber',type: 'timed',      sets: 3, duration: 30, rest: 30, muscleGroup: 'core' },
            { name: 'Leg Raise',       type: 'repetition', sets: 3, reps: 15, rest: 45, muscleGroup: 'core' },
          ],
        },
      ],
    },

    upper_lower: {
      name: 'Upper / Lower Split',
      description: 'สลับวันบน/ล่าง เหมาะสำหรับ 4 วัน/สัปดาห์',
      days: [
        {
          focus: 'Upper Body',
          exercises: [
            { name: 'Push-up',    type: 'repetition', sets: 4, reps: 15, rest: 60, muscleGroup: 'upper' },
            { name: 'Pull-up',    type: 'repetition', sets: 4, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Dip',        type: 'repetition', sets: 3, reps: 10, rest: 90, muscleGroup: 'upper' },
            { name: 'Chin-up',    type: 'repetition', sets: 3, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Plank',      type: 'timed',      sets: 3, duration: 60, rest: 45, muscleGroup: 'core' },
          ],
        },
        {
          focus: 'Lower Body',
          exercises: [
            { name: 'Squat',      type: 'repetition', sets: 4, reps: 20, rest: 60, muscleGroup: 'lower' },
            { name: 'Lunge',      type: 'repetition', sets: 3, reps: 15, rest: 60, muscleGroup: 'lower' },
            { name: 'Step-up',    type: 'repetition', sets: 3, reps: 12, rest: 45, muscleGroup: 'lower' },
            { name: 'Calf Raise', type: 'repetition', sets: 3, reps: 25, rest: 30, muscleGroup: 'lower' },
            { name: 'Sit-up',     type: 'repetition', sets: 3, reps: 20, rest: 45, muscleGroup: 'core' },
          ],
        },
      ],
    },

    push_pull: {
      name: 'Push / Pull / Legs',
      description: 'แยก push/pull/legs เหมาะสำหรับ 5–6 วัน/สัปดาห์',
      days: [
        {
          focus: 'Push',
          exercises: [
            { name: 'Push-up',        type: 'repetition', sets: 4, reps: 20, rest: 60, muscleGroup: 'upper' },
            { name: 'Diamond Push-up',type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Pike Push-up',   type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Dip',            type: 'repetition', sets: 3, reps: 10, rest: 90, muscleGroup: 'upper' },
            { name: 'Plank',          type: 'timed',      sets: 3, duration: 60, rest: 45, muscleGroup: 'core' },
          ],
        },
        {
          focus: 'Pull',
          exercises: [
            { name: 'Pull-up',      type: 'repetition', sets: 4, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Chin-up',      type: 'repetition', sets: 3, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Inverted Row', type: 'repetition', sets: 3, reps: 12, rest: 60, muscleGroup: 'upper' },
            { name: 'Sit-up',       type: 'repetition', sets: 3, reps: 20, rest: 45, muscleGroup: 'core' },
            { name: 'Leg Raise',    type: 'repetition', sets: 3, reps: 15, rest: 45, muscleGroup: 'core' },
          ],
        },
        {
          focus: 'Legs & Core',
          exercises: [
            { name: 'Squat',           type: 'repetition', sets: 4, reps: 20, rest: 60, muscleGroup: 'lower' },
            { name: 'Lunge',           type: 'repetition', sets: 3, reps: 15, rest: 60, muscleGroup: 'lower' },
            { name: 'Calf Raise',      type: 'repetition', sets: 3, reps: 25, rest: 30, muscleGroup: 'lower' },
            { name: 'Mountain Climber',type: 'timed',      sets: 3, duration: 30, rest: 30, muscleGroup: 'core' },
            { name: 'Plank',           type: 'timed',      sets: 3, duration: 60, rest: 45, muscleGroup: 'core' },
          ],
        },
      ],
    },

    cardio_strength: {
      name: 'Cardio + Strength',
      description: 'สลับวันวิ่งกับวันกล้ามเนื้อ เน้นสมรรถภาพทหาร',
      days: [
        {
          focus: 'Strength',
          exercises: [
            { name: 'Push-up', type: 'repetition', sets: 4, reps: 15, rest: 60, muscleGroup: 'upper' },
            { name: 'Pull-up', type: 'repetition', sets: 3, reps: 8,  rest: 90, muscleGroup: 'upper' },
            { name: 'Squat',   type: 'repetition', sets: 4, reps: 20, rest: 60, muscleGroup: 'lower' },
            { name: 'Sit-up',  type: 'repetition', sets: 3, reps: 20, rest: 45, muscleGroup: 'core' },
            { name: 'Plank',   type: 'timed',      sets: 3, duration: 60, rest: 45, muscleGroup: 'core' },
          ],
        },
        {
          focus: 'Cardio',
          exercises: [
            { name: 'วิ่ง 3km', type: 'distance', sets: 1, distance: 3000, rest: 0, muscleGroup: 'cardio' },
            { name: 'Burpee',  type: 'repetition', sets: 3, reps: 10, rest: 60, muscleGroup: 'cardio' },
          ],
        },
      ],
    },

  };

  /* ─────────────────────────────────────────
     PROGRESSIVE OVERLOAD MULTIPLIER
  ───────────────────────────────────────── */

  /**
   * คำนวณ volume multiplier ตามสัปดาห์
   * Week 1: 1.0, Week 2: 1.05, Week 3: 1.10, Week 4 (deload): 0.90
   */
  function getVolumeMultiplier(weekNumber) {
    const cycle = ((weekNumber - 1) % 4) + 1;
    const map   = { 1: 1.0, 2: 1.05, 3: 1.10, 4: 0.90 };
    return map[cycle] || 1.0;
  }

  /* ─────────────────────────────────────────
     APPLY MULTIPLIER TO EXERCISES
  ───────────────────────────────────────── */

  function scaleExercises(exercises, multiplier) {
    return exercises.map(ex => {
      const scaled = { ...ex };
      if (ex.type === 'repetition') {
        scaled.reps = Math.round(ex.reps * multiplier);
      } else if (ex.type === 'timed') {
        scaled.duration = Math.round(ex.duration * multiplier);
      } else if (ex.type === 'distance') {
        scaled.distance = Math.round(ex.distance * multiplier / 100) * 100;
      }
      return scaled;
    });
  }

  /* ─────────────────────────────────────────
     GENERATE MONTHLY PLAN
  ───────────────────────────────────────── */

  /**
   * สร้างแผนรายเดือน
   * @param {object} options
   * @param {number} options.year
   * @param {number} options.month  1-12
   * @param {number[]} options.trainingDays  [0-6] วันที่ฝึก (0=อาทิตย์)
   * @param {string} options.program  'fullbody'|'upper_lower'|'push_pull'|'cardio_strength'
   * @param {number} options.startWeek  สัปดาห์เริ่มของ progressive cycle (default: 1)
   * @returns {object} MonthlyPlan
   */
  function generateMonthlyPlan(options = {}) {
    const {
      year         = new Date().getFullYear(),
      month        = new Date().getMonth() + 1,
      trainingDays = [1, 3, 5],  // Mon, Wed, Fri
      program      = 'fullbody',
      startWeek    = 1,
    } = options;

    const template = PROGRAMS[program] || PROGRAMS.fullbody;
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDOW    = new Date(year, month - 1, 1).getDay();

    // Build flat days map: dateStr → DaySession
    const _days = {};
    let templateIdx = 0;
    let weekNumber  = startWeek;
    let prevWeekOfMonth = -1;

    for (let d = 1; d <= daysInMonth; d++) {
      const date   = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow    = new Date(year, month - 1, d).getDay();
      const weekOfMonth = Math.floor((d + firstDOW - 1) / 7);

      if (weekOfMonth !== prevWeekOfMonth) {
        weekNumber = startWeek + weekOfMonth;
        prevWeekOfMonth = weekOfMonth;
      }

      if (!trainingDays.includes(dow)) continue;

      const dayTemplate  = template.days[templateIdx % template.days.length];
      const multiplier   = getVolumeMultiplier(weekNumber);
      const scaledExercises = scaleExercises(dayTemplate.exercises, multiplier);

      _days[date] = {
        focus:            dayTemplate.focus,
        exercises:        scaledExercises,
        isRest:           false,
        isCompleted:      false,
        volumeMultiplier: multiplier,
      };

      templateIdx++;
    }

    const totalSessions = Object.keys(_days).length;

    return {
      id:               `plan_${year}_${month}`,
      year,
      month,
      createdAt:        Date.now(),
      updatedAt:        Date.now(),
      programType:      program,
      programName:      template.name,
      trainingDays,
      _days,             // flat map: dateStr → session
      totalSessions,
      completedSessions: 0,
    };
  }

  /* ─────────────────────────────────────────
     SYNC COMPLETED SESSIONS FROM LOGS
  ───────────────────────────────────────── */

  /**
   * อัพเดต isCompleted ใน plan จาก workout logs
   */
  function syncCompleted(plan, logs) {
    if (!plan?._days) return plan;

    const logDates = new Set(logs.map(l => l.date));
    let completed  = 0;

    const updated = { ...plan, _days: { ...plan._days } };
    for (const [date, session] of Object.entries(updated._days)) {
      if (logDates.has(date)) {
        updated._days[date] = { ...session, isCompleted: true };
        completed++;
      }
    }
    updated.completedSessions = completed;
    return updated;
  }

  /* ─────────────────────────────────────────
     GET TODAY'S SESSION FROM PLAN
  ───────────────────────────────────────── */

  function getTodaySession(plan) {
    if (!plan?._days) return null;
    const today = new Date().toISOString().split('T')[0];
    return plan._days[today] || null;
  }

  /* ─────────────────────────────────────────
     AVAILABLE PROGRAMS LIST
  ───────────────────────────────────────── */

  function getProgramList() {
    return Object.entries(PROGRAMS).map(([key, val]) => ({
      key,
      name:        val.name,
      description: val.description,
      dayCount:    val.days.length,
    }));
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  return {
    generateMonthlyPlan,
    syncCompleted,
    getTodaySession,
    getProgramList,
    getVolumeMultiplier,
    PROGRAMS,
  };

})();
