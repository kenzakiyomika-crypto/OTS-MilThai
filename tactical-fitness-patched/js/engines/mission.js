/**
 * TACTICAL FITNESS — MISSION ENGINE v1.0
 * ตรวจสอบความคืบหน้าภารกิจ + มอบเหรียญ
 */

'use strict';

const MissionEngine = (() => {

  /* ─────────────────────────────────────────
     UPDATE MISSION PROGRESS
  ───────────────────────────────────────── */

  /**
   * อัพเดต progress ของ mission จากข้อมูลล่าสุด
   * @param {object} mission
   * @param {object} context  { profile, pr, logs, medals }
   * @returns {object} updated mission
   */
  function updateProgress(mission, context) {
    if (!mission || mission.isCompleted) return mission;

    const { profile, pr, logs = [] } = context;
    let current = mission.current || 0;

    switch (mission.type) {

      case 'streak':
        // target = จำนวนวันที่ต้องฝึกต่อเนื่อง
        current = profile?.currentStreak || 0;
        break;

      case 'performance':
        // target = ค่า performance ที่ต้องถึง
        current = _getPerformanceValue(mission, pr);
        break;

      case 'volume':
        // target = total sessions / volume load
        current = logs.length;
        break;

      case 'consistency':
        // target = total days active
        current = profile?.totalDaysActive || 0;
        break;

      case 'rank':
        // target = rankIndex ที่ต้องถึง
        current = profile?.rankIndex || 0;
        break;

      default:
        current = mission.current || 0;
    }

    return { ...mission, current };
  }

  /* ─────────────────────────────────────────
     GET PERFORMANCE VALUE FOR MISSION
  ───────────────────────────────────────── */

  function _getPerformanceValue(mission, pr) {
    if (!pr) return 0;

    const id = mission.id || '';

    if (id.includes('pushup') || mission.name?.toLowerCase().includes('push'))
      return pr.pushup?.value || 0;
    if (id.includes('pullup') || mission.name?.toLowerCase().includes('pull'))
      return pr.pullup?.value || 0;
    if (id.includes('plank') || mission.name?.toLowerCase().includes('plank'))
      return pr.plank?.value  || 0;
    if (id.includes('situp') || mission.name?.toLowerCase().includes('sit'))
      return pr.situp?.value  || 0;
    if (id.includes('5km') || mission.name?.toLowerCase().includes('5km')) {
      // สำหรับวิ่ง target คือ เวลาที่ต้องต่ำกว่า → ถ้า current <= target = ผ่าน
      // แต่ progress แสดงเป็น % → ใช้ inverted
      return pr.run5km?.value || 9999;
    }
    if (id.includes('2km') || mission.name?.toLowerCase().includes('2km'))
      return pr.run2km?.value || 9999;

    return 0;
  }

  /* ─────────────────────────────────────────
     CHECK COMPLETION
  ───────────────────────────────────────── */

  /**
   * ตรวจสอบว่า mission สำเร็จหรือไม่
   */
  function checkCompletion(mission) {
    if (mission.isCompleted) return true;

    const { type, current, target } = mission;

    if (type === 'performance' && (mission.id?.includes('km') || mission.name?.toLowerCase().includes('km'))) {
      // วิ่ง: current (วิ) ต้องน้อยกว่าหรือเท่ากับ target
      return current !== null && current !== 9999 && current <= target;
    }

    return (current || 0) >= (target || 1);
  }

  /* ─────────────────────────────────────────
     CALCULATE PROGRESS PERCENT
  ───────────────────────────────────────── */

  function calcProgressPct(mission) {
    const { type, current, target } = mission;
    if (!target) return 0;

    if (type === 'performance' && (mission.id?.includes('km') || mission.name?.toLowerCase().includes('km'))) {
      if (!current || current === 9999) return 0;
      // inverted: target/current * 100
      return Math.min(100, Math.round((target / current) * 100));
    }

    return Math.min(100, Math.round(((current || 0) / target) * 100));
  }

  /* ─────────────────────────────────────────
     COMPLETE MISSION + AWARD MEDAL
  ───────────────────────────────────────── */

  /**
   * mark mission completed + award medal
   * @returns {{ mission, medal }} updated objects
   */
  async function completeMission(mission) {
    const today     = new Date().toISOString().split('T')[0];
    const completed = {
      ...mission,
      isCompleted:   true,
      isActive:      false,
      completedDate: today,
    };

    await Storage.Missions.save(completed);

    let awardedMedal = null;
    if (mission.rewardMedal) {
      try {
        const existing = await Storage.Medals.get(mission.rewardMedal);
        if (existing && !existing.isEarned) {
          awardedMedal = {
            ...existing,
            isEarned:   true,
            earnedDate: today,
          };
          await Storage.Medals.save(awardedMedal);
        }
      } catch (err) {
        console.warn('[MissionEngine] Medal award failed:', err);
      }
    }

    return { mission: completed, medal: awardedMedal };
  }

  /* ─────────────────────────────────────────
     INIT DEFAULT MISSIONS & MEDALS
  ───────────────────────────────────────── */

  /**
   * ตรวจสอบและสร้าง default missions/medals ถ้ายังไม่มี
   */
  async function initDefaults() {
    try {
      const existing = await Storage.Missions.getAll();
      const existingIds = new Set(existing.map(m => m.id));

      // Add missing default missions
      for (const template of DEFAULT_MISSIONS) {
        if (!existingIds.has(template.id)) {
          await Storage.Missions.save({
            ...Schema.createMission(template),
            isActive: false, // ไม่ start อัตโนมัติ
          });
        }
      }

      // Add missing medals
      const existingMedals   = await Storage.Medals.getAll();
      const existingMedalIds = new Set(existingMedals.map(m => m.id));

      for (const template of DEFAULT_MEDALS) {
        if (!existingMedalIds.has(template.id)) {
          await Storage.Medals.save({
            ...Schema.createMedal(template),
            id: template.id,
          });
        }
      }
    } catch (err) {
      console.warn('[MissionEngine] initDefaults failed:', err);
    }
  }

  /* ─────────────────────────────────────────
     RUN ALL ACTIVE MISSIONS
  ───────────────────────────────────────── */

  /**
   * ตรวจสอบและอัพเดต missions ทั้งหมดที่ active
   * @returns {Array} newly completed missions
   */
  async function runChecks(context) {
    const activeMissions = await Storage.Missions.getActive();
    const newlyCompleted = [];

    for (const mission of activeMissions) {
      const updated = updateProgress(mission, context);
      const done    = checkCompletion(updated);

      if (done) {
        const { mission: completed, medal } = await completeMission(updated);
        newlyCompleted.push({ mission: completed, medal });
      } else if (updated.current !== mission.current) {
        await Storage.Missions.save(updated);
      }
    }

    return newlyCompleted;
  }

  /* ─────────────────────────────────────────
     START MISSION
  ───────────────────────────────────────── */

  async function startMission(missionId) {
    const mission = await Storage.Missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);
    if (mission.isActive)    throw new Error('Mission already active');
    if (mission.isCompleted) throw new Error('Mission already completed');

    const started = {
      ...mission,
      isActive:  true,
      startDate: new Date().toISOString().split('T')[0],
      current:   0,
    };
    await Storage.Missions.save(started);
    return started;
  }

  /* ─────────────────────────────────────────
     ABANDON MISSION
  ───────────────────────────────────────── */

  async function abandonMission(missionId) {
    const mission = await Storage.Missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    const abandoned = { ...mission, isActive: false, current: 0 };
    await Storage.Missions.save(abandoned);
    return abandoned;
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  return {
    updateProgress,
    checkCompletion,
    calcProgressPct,
    completeMission,
    initDefaults,
    runChecks,
    startMission,
    abandonMission,
  };

})();
