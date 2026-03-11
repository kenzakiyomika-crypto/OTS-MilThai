/**
 * TACTICAL FITNESS — DATA SCHEMA v1.0
 * Single source of truth for all data structures
 * Used by Storage, Engines, and UI layers
 */

'use strict';

const Schema = {

  /* ─────────────────────────────────────────
     USER PROFILE
  ───────────────────────────────────────── */
  createUserProfile: (data = {}) => ({
    id: 'user_profile',
    version: '1.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // Identity
    callsign: data.callsign || 'OPERATOR',
    gender: data.gender || 'male',           // 'male' | 'female'
    age: data.age || 25,
    weight: data.weight || 70,               // kg
    height: data.height || 170,             // cm

    // Fitness Level
    fitnessLevel: data.fitnessLevel || 'beginner', // 'beginner' | 'intermediate' | 'advanced'
    trainingDaysPerWeek: data.trainingDaysPerWeek || 3,
    preferredTime: data.preferredTime || 'morning', // 'morning' | 'afternoon' | 'evening'

    // Rank System
    currentRank: data.currentRank || 'พลเรือน',
    rankIndex: data.rankIndex || 0,          // 0–20
    prestigeStars: data.prestigeStars || 0,

    // Career Path (unlocked at ร้อยตรี)
    careerPath: data.careerPath || null,     // 'assault' | 'recon' | 'tactical' | 'instructor'

    // Stats tracking
    totalDaysActive: data.totalDaysActive || 0,
    currentStreak: data.currentStreak || 0,
    longestStreak: data.longestStreak || 0,
    lastTrainedDate: data.lastTrainedDate || null,

    // Onboarding
    onboardingComplete: data.onboardingComplete || false,
    onboardingStep: data.onboardingStep || 0,
  }),

  /* ─────────────────────────────────────────
     PERFORMANCE RECORDS (PR)
  ───────────────────────────────────────── */
  createPRRecord: () => ({
    id: 'pr_record',
    updatedAt: Date.now(),

    pushup: { value: 0, date: null, history: [] },
    pullup: { value: 0, date: null, history: [] },
    plank:  { value: 0, date: null, history: [] },   // seconds
    situp:  { value: 0, date: null, history: [] },
    run2km: { value: null, date: null, history: [] }, // seconds (lower = better)
    run5km: { value: null, date: null, history: [] }, // seconds

    // Calculated scores
    strengthScore:  0,
    enduranceScore: 0,
    coreScore:      0,
    totalScore:     0,
  }),

  /* ─────────────────────────────────────────
     WORKOUT LOG (per session)
  ───────────────────────────────────────── */
  createWorkoutLog: (data = {}) => ({
    id: `log_${Date.now()}`,
    date: data.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    dayOfWeek: data.dayOfWeek || new Date().getDay(),
    sessionType: data.sessionType || 'full',  // 'full' | 'quick'
    focus: data.focus || 'Full Body',

    startTime: data.startTime || null,
    endTime: data.endTime || null,
    durationMinutes: data.durationMinutes || 0,

    exercises: data.exercises || [],          // array of ExerciseLog
    completionPct: data.completionPct || 0,
    notes: data.notes || '',

    // Fatigue snapshot at time of session
    fatigueAtStart: data.fatigueAtStart || 0,
    volumeLoad: data.volumeLoad || 0,         // Sets × Reps × WeightFactor
  }),

  /* ─────────────────────────────────────────
     EXERCISE LOG (inside WorkoutLog)
  ───────────────────────────────────────── */
  createExerciseLog: (data = {}) => ({
    name: data.name || '',
    type: data.type || 'repetition',         // 'repetition' | 'timed' | 'distance'
    sets: data.sets || 0,
    reps: data.reps || 0,                    // per set (repetition type)
    duration: data.duration || 0,            // seconds (timed type)
    distance: data.distance || 0,            // meters (distance type)
    rest: data.rest || 60,                   // seconds between sets
    completed: data.completed || false,
    actualReps: data.actualReps || [],       // actual reps per set [15,14,13]
    actualDuration: data.actualDuration || 0,
  }),

  /* ─────────────────────────────────────────
     FATIGUE SNAPSHOT (daily)
  ───────────────────────────────────────── */
  createFatigueSnapshot: (data = {}) => ({
    id: `fatigue_${data.date || new Date().toISOString().split('T')[0]}`,
    date: data.date || new Date().toISOString().split('T')[0],
    index: data.index || 0,                  // 0–100
    label: data.label || 'fresh',            // 'fresh' | 'moderate' | 'overload'
    weeklyLoad: data.weeklyLoad || 0,
    consecutiveDays: data.consecutiveDays || 0,
    restHours: data.restHours || 8,
  }),

  /* ─────────────────────────────────────────
     MONTHLY PLAN (one month)
  ───────────────────────────────────────── */
  createMonthlyPlan: (data = {}) => ({
    id: `plan_${data.year}_${data.month}`,
    year: data.year || new Date().getFullYear(),
    month: data.month || new Date().getMonth() + 1, // 1–12
    createdAt: Date.now(),

    weeks: data.weeks || [],                 // array of WeekPlan
    totalSessions: data.totalSessions || 0,
    completedSessions: data.completedSessions || 0,
  }),

  /* ─────────────────────────────────────────
     WEEK PLAN (inside MonthlyPlan)
  ───────────────────────────────────────── */
  createWeekPlan: (data = {}) => ({
    weekNumber: data.weekNumber || 1,
    days: {
      0: data.days?.[0] || null, // Sun
      1: data.days?.[1] || null, // Mon
      2: data.days?.[2] || null, // Tue
      3: data.days?.[3] || null, // Wed
      4: data.days?.[4] || null, // Thu
      5: data.days?.[5] || null, // Fri
      6: data.days?.[6] || null, // Sat
    },
  }),

  /* ─────────────────────────────────────────
     DAY SESSION (inside WeekPlan.days)
     null = rest day
  ───────────────────────────────────────── */
  createDaySession: (data = {}) => ({
    focus: data.focus || 'Full Body',
    exercises: data.exercises || [],         // array of Exercise template
    isRest: data.isRest || false,
    isCompleted: data.isCompleted || false,
    volumeMultiplier: data.volumeMultiplier || 1.0, // for progressive overload
  }),

  /* ─────────────────────────────────────────
     EXERCISE TEMPLATE (in plan, not log)
  ───────────────────────────────────────── */
  createExercise: (data = {}) => ({
    name: data.name || '',
    type: data.type || 'repetition',
    sets: data.sets || 3,
    reps: data.reps || 10,
    duration: data.duration || 60,          // seconds
    rest: data.rest || 60,
    muscleGroup: data.muscleGroup || 'full', // 'upper'|'lower'|'core'|'full'|'cardio'
  }),

  /* ─────────────────────────────────────────
     MISSION
  ───────────────────────────────────────── */
  createMission: (data = {}) => ({
    id: data.id || `mission_${Date.now()}`,
    name: data.name || '',
    description: data.description || '',
    type: data.type || 'streak',            // 'streak' | 'performance' | 'volume' | 'test'
    icon: data.icon || '⚔',

    target: data.target || 30,              // depends on type
    current: data.current || 0,
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || null,

    isActive: data.isActive || true,
    isCompleted: data.isCompleted || false,
    completedDate: data.completedDate || null,
    rewardMedal: data.rewardMedal || null,
  }),

  /* ─────────────────────────────────────────
     MEDAL
  ───────────────────────────────────────── */
  createMedal: (data = {}) => ({
    id: data.id || '',
    name: data.name || '',
    description: data.description || '',
    icon: data.icon || '🏅',
    earnedDate: data.earnedDate || null,
    isEarned: data.isEarned || false,
  }),

  /* ─────────────────────────────────────────
     APP STATE (meta, not user data)
  ───────────────────────────────────────── */
  createAppState: () => ({
    id: 'app_state',
    version: '1.0',
    firstLaunch: Date.now(),
    lastOpened: Date.now(),
    activeScreen: 'onboarding',
    theme: 'dark',
  }),

};

/* ─────────────────────────────────────────
   RANK TABLE (21 levels)
───────────────────────────────────────── */
const RANKS = [
  { index: 0,  name: 'พลเรือน',              tier: 'civilian',    pushup: 0,   pullup: 0,  plank: 0,    run2km: null,  run5km: null,  extra: 'เริ่มต้นระบบ' },
  { index: 1,  name: 'พลทหาร',              tier: 'enlisted',    pushup: 15,  pullup: 0,  plank: 60,   run2km: 840,   run5km: null,  extra: 'ฝึกครบ 7 วัน' },
  { index: 2,  name: 'สิบตรี',               tier: 'enlisted',    pushup: 20,  pullup: 3,  plank: 90,   run2km: 780,   run5km: null,  extra: null },
  { index: 3,  name: 'สิบโท',               tier: 'enlisted',    pushup: 30,  pullup: 5,  plank: 120,  run2km: 720,   run5km: null,  extra: null },
  { index: 4,  name: 'สิบเอก',              tier: 'enlisted',    pushup: 40,  pullup: 8,  plank: 150,  run2km: 660,   run5km: null,  extra: null },
  { index: 5,  name: 'จ่าสิบตรี',            tier: 'nco',         pushup: 50,  pullup: 10, plank: 180,  run2km: null,  run5km: 1560,  extra: null },
  { index: 6,  name: 'จ่าสิบโท',            tier: 'nco',         pushup: 55,  pullup: 12, plank: 200,  run2km: null,  run5km: 1440,  extra: null },
  { index: 7,  name: 'จ่าสิบเอก',           tier: 'nco',         pushup: 60,  pullup: 15, plank: 240,  run2km: null,  run5km: 1380,  extra: null },
  { index: 8,  name: 'จ่าสิบเอกพิเศษ',      tier: 'nco',         pushup: 65,  pullup: 18, plank: 260,  run2km: null,  run5km: 1320,  extra: null },
  { index: 9,  name: 'จ่าสิบเอกพิเศษ (อาวุโส)', tier: 'nco',    pushup: 70,  pullup: 20, plank: 300,  run2km: null,  run5km: 1260,  extra: 'ฝึกครบ 180 วัน' },
  { index: 10, name: 'ร้อยตรี',             tier: 'officer',     pushup: 75,  pullup: 22, plank: 320,  run2km: null,  run5km: 1200,  extra: 'ผ่าน Tactical Test' },
  { index: 11, name: 'ร้อยโท',             tier: 'officer',     pushup: 80,  pullup: 25, plank: 350,  run2km: null,  run5km: 1140,  extra: null },
  { index: 12, name: 'ร้อยเอก',            tier: 'officer',     pushup: 85,  pullup: 28, plank: 400,  run2km: null,  run5km: 1080,  extra: null },
  { index: 13, name: 'พันตรี',             tier: 'officer',     pushup: 90,  pullup: 30, plank: 420,  run2km: null,  run5km: 1020,  extra: null },
  { index: 14, name: 'พันโท',             tier: 'officer',     pushup: 95,  pullup: 32, plank: 450,  run2km: null,  run5km: 960,   extra: null },
  { index: 15, name: 'พันเอก',            tier: 'officer',     pushup: 100, pullup: 35, plank: 480,  run2km: null,  run5km: 900,   extra: null },
  { index: 16, name: 'พันเอกพิเศษ',       tier: 'officer',     pushup: 110, pullup: 38, plank: 500,  run2km: null,  run5km: 840,   extra: null },
  { index: 17, name: 'พลตรี',            tier: 'general',     pushup: 120, pullup: 40, plank: 520,  run2km: null,  run5km: 780,   extra: 'Consistency 300 วัน' },
  { index: 18, name: 'พลโท',            tier: 'general',     pushup: 130, pullup: 42, plank: 550,  run2km: null,  run5km: 720,   extra: null },
  { index: 19, name: 'พลเอก',           tier: 'general',     pushup: 140, pullup: 45, plank: 600,  run2km: null,  run5km: 660,   extra: 'Elite Test' },
  { index: 20, name: 'พลเอกพิเศษ',      tier: 'general',     pushup: 150, pullup: 50, plank: 720,  run2km: null,  run5km: 600,   extra: 'Master Evaluation' },
];

/* ─────────────────────────────────────────
   DEFAULT EXERCISE LIBRARY
───────────────────────────────────────── */
const EXERCISE_LIBRARY = {
  upper: [
    { name: 'Push-up',         type: 'repetition', sets: 4, reps: 15, rest: 60,  muscleGroup: 'upper' },
    { name: 'Pike Push-up',    type: 'repetition', sets: 3, reps: 12, rest: 60,  muscleGroup: 'upper' },
    { name: 'Diamond Push-up', type: 'repetition', sets: 3, reps: 10, rest: 60,  muscleGroup: 'upper' },
    { name: 'Dip',             type: 'repetition', sets: 3, reps: 10, rest: 90,  muscleGroup: 'upper' },
  ],
  pull: [
    { name: 'Pull-up',         type: 'repetition', sets: 4, reps: 8,  rest: 90,  muscleGroup: 'upper' },
    { name: 'Chin-up',         type: 'repetition', sets: 3, reps: 8,  rest: 90,  muscleGroup: 'upper' },
    { name: 'Inverted Row',    type: 'repetition', sets: 3, reps: 12, rest: 60,  muscleGroup: 'upper' },
  ],
  core: [
    { name: 'Plank',           type: 'timed',      sets: 3, duration: 60,  rest: 60,  muscleGroup: 'core' },
    { name: 'Sit-up',          type: 'repetition', sets: 3, reps: 20, rest: 45,  muscleGroup: 'core' },
    { name: 'Leg Raise',       type: 'repetition', sets: 3, reps: 15, rest: 45,  muscleGroup: 'core' },
    { name: 'Mountain Climber',type: 'timed',      sets: 3, duration: 30,  rest: 30,  muscleGroup: 'core' },
  ],
  lower: [
    { name: 'Squat',           type: 'repetition', sets: 4, reps: 15, rest: 60,  muscleGroup: 'lower' },
    { name: 'Lunge',           type: 'repetition', sets: 3, reps: 12, rest: 60,  muscleGroup: 'lower' },
    { name: 'Step-up',         type: 'repetition', sets: 3, reps: 12, rest: 45,  muscleGroup: 'lower' },
    { name: 'Calf Raise',      type: 'repetition', sets: 3, reps: 20, rest: 30,  muscleGroup: 'lower' },
  ],
  cardio: [
    { name: 'วิ่ง 2km',         type: 'distance',   sets: 1, distance: 2000, rest: 0, muscleGroup: 'cardio' },
    { name: 'วิ่ง 3km',         type: 'distance',   sets: 1, distance: 3000, rest: 0, muscleGroup: 'cardio' },
    { name: 'วิ่ง 5km',         type: 'distance',   sets: 1, distance: 5000, rest: 0, muscleGroup: 'cardio' },
    { name: 'Burpee',           type: 'repetition', sets: 3, reps: 10, rest: 60,  muscleGroup: 'cardio' },
  ],
};

/* ─────────────────────────────────────────
   DEFAULT MISSIONS
───────────────────────────────────────── */
const DEFAULT_MISSIONS = [
  {
    id: 'iron_discipline_30',
    name: '30-Day Iron Discipline',
    description: 'ฝึกต่อเนื่อง 30 วัน ขาดได้ไม่เกิน 2 วัน',
    type: 'streak', icon: '⚔', target: 30, rewardMedal: 'iron_discipline',
  },
  {
    id: 'endurance_5km',
    name: '5KM Endurance Push',
    description: 'วิ่ง 5km ให้ได้ภายใต้ 22 นาที',
    type: 'performance', icon: '🏃', target: 1320, rewardMedal: 'medal_of_endurance',
  },
  {
    id: 'iron_core',
    name: 'Iron Core',
    description: 'ค้าง Plank ได้นานกว่า 5 นาที',
    type: 'performance', icon: '🧱', target: 300, rewardMedal: 'iron_core_badge',
  },
];

/* ─────────────────────────────────────────
   DEFAULT MEDALS
───────────────────────────────────────── */
const DEFAULT_MEDALS = [
  { id: 'iron_discipline',    name: 'Iron Discipline',          icon: '🎖', description: 'ฝึกครบ 30 วัน' },
  { id: 'medal_of_endurance', name: 'Medal of Endurance',       icon: '🏅', description: 'วิ่ง 5km < 22 นาที' },
  { id: 'iron_core_badge',    name: 'Iron Core Badge',          icon: '🛡', description: 'Plank > 5 นาที' },
  { id: 'ribbon_365',         name: '365 Days Discipline Ribbon', icon: '🎀', description: 'ฝึกครบ 365 วัน' },
  { id: 'tactical_star',      name: 'Tactical Excellence Star', icon: '⭐', description: 'ผ่าน Tactical Test ระดับพันตรี' },
];

// Export
if (typeof module !== 'undefined') {
  module.exports = { Schema, RANKS, EXERCISE_LIBRARY, DEFAULT_MISSIONS, DEFAULT_MEDALS };
}
