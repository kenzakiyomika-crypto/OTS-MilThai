/**
 * TACTICAL FITNESS — RANK ENGINE v1.0
 * ประเมินยศ + ตรวจสอบเงื่อนไขเลื่อนขั้น
 */

'use strict';

const RankEngine = (() => {

  /* ─────────────────────────────────────────
     CHECK RANK REQUIREMENTS
  ───────────────────────────────────────── */

  /**
   * ตรวจสอบว่า PR ผ่านเงื่อนไขของยศนั้นหรือไม่
   * @param {object} pr   - PRRecord
   * @param {object} rank - RANKS[n]
   * @returns {object}  { passed, details: [{exercise, required, current, met}] }
   */
  function checkRequirements(pr, rank) {
    if (!pr || !rank) return { passed: false, details: [] };

    const checks = [];

    const req = [
      { key: 'pushup', label: 'Push-up', value: pr.pushup?.value || 0 },
      { key: 'pullup', label: 'Pull-up', value: pr.pullup?.value || 0 },
      { key: 'plank',  label: 'Plank (วิ)',  value: pr.plank?.value  || 0 },
    ];

    for (const { key, label, value } of req) {
      const required = rank[key] || 0;
      if (required === 0) continue;
      checks.push({ exercise: label, required, current: value, met: value >= required });
    }

    // Run tests (lower = better)
    if (rank.run2km) {
      const val = pr.run2km?.value;
      checks.push({
        exercise: 'วิ่ง 2km (วิ)',
        required: rank.run2km,
        current:  val || null,
        met:      val !== null && val <= rank.run2km,
      });
    }
    if (rank.run5km) {
      const val = pr.run5km?.value;
      checks.push({
        exercise: 'วิ่ง 5km (วิ)',
        required: rank.run5km,
        current:  val || null,
        met:      val !== null && val <= rank.run5km,
      });
    }

    const passed = checks.every(c => c.met);
    return { passed, details: checks };
  }

  /* ─────────────────────────────────────────
     EVALUATE CURRENT RANK FROM PR
  ───────────────────────────────────────── */

  /**
   * คำนวณยศที่ควรได้จาก PR ปัจจุบัน
   * @returns {number} rankIndex ที่สูงสุดที่ผ่านทุกเงื่อนไข
   */
  function evaluateRankFromPR(pr) {
    if (!pr) return 0;

    let highestPassed = 0;
    for (let i = 0; i < RANKS.length; i++) {
      const { passed } = checkRequirements(pr, RANKS[i]);
      if (passed) highestPassed = i;
      else if (i > 0) break; // หยุดเมื่อไม่ผ่านครั้งแรก
    }
    return highestPassed;
  }

  /* ─────────────────────────────────────────
     CHECK PROMOTION
  ───────────────────────────────────────── */

  /**
   * ตรวจสอบว่าควรเลื่อนยศหรือไม่
   * @param {object} profile - UserProfile
   * @param {object} pr      - PRRecord
   * @param {object} logs    - all WorkoutLogs
   * @returns {object} { shouldPromote, newRankIndex, reason }
   */
  function checkPromotion(profile, pr, logs = []) {
    const currentIndex = profile?.rankIndex || 0;
    const nextIndex    = currentIndex + 1;

    if (nextIndex >= RANKS.length) {
      return { shouldPromote: false, reason: 'ถึงยศสูงสุดแล้ว' };
    }

    const nextRank = RANKS[nextIndex];
    const { passed, details } = checkRequirements(pr, nextRank);

    // Check extra conditions
    if (nextRank.extra) {
      const extraPassed = checkExtraCondition(nextRank.extra, profile, logs);
      if (!extraPassed) {
        return {
          shouldPromote: false,
          reason:        `ต้องผ่าน: ${nextRank.extra}`,
          details,
        };
      }
    }

    if (!passed) {
      const failed = details.filter(d => !d.met);
      return {
        shouldPromote: false,
        reason:        `ยังไม่ผ่านเงื่อนไข: ${failed.map(f => f.exercise).join(', ')}`,
        details,
      };
    }

    return {
      shouldPromote:  true,
      newRankIndex:   nextIndex,
      newRank:        nextRank,
      reason:         `ผ่านเงื่อนไขทั้งหมดของ ${nextRank.name}`,
      details,
    };
  }

  /* ─────────────────────────────────────────
     EXTRA CONDITIONS
  ───────────────────────────────────────── */

  function checkExtraCondition(extra, profile, logs) {
    if (!extra) return true;

    // "ฝึกครบ N วัน"
    const daysMatch = extra.match(/ฝึกครบ\s*(\d+)\s*วัน/);
    if (daysMatch) {
      const required = parseInt(daysMatch[1]);
      return (profile?.totalDaysActive || 0) >= required;
    }

    // "Consistency N วัน"
    const consistencyMatch = extra.match(/Consistency\s*(\d+)\s*วัน/);
    if (consistencyMatch) {
      const required = parseInt(consistencyMatch[1]);
      return (profile?.totalDaysActive || 0) >= required;
    }

    // "ผ่าน Tactical Test" — ต้องมี session type tactical
    if (extra.includes('Tactical Test')) {
      return logs.some(l => l.sessionType === 'tactical' || l.notes?.includes('tactical test'));
    }

    // "Elite Test"
    if (extra.includes('Elite Test')) {
      return logs.some(l => l.notes?.toLowerCase().includes('elite test'));
    }

    // "Master Evaluation"
    if (extra.includes('Master Evaluation')) {
      return logs.some(l => l.notes?.toLowerCase().includes('master evaluation'));
    }

    return true; // unknown extra condition → pass
  }

  /* ─────────────────────────────────────────
     PROMOTE
  ───────────────────────────────────────── */

  /**
   * เลื่อนยศและบันทึก
   * @returns {object} updated profile
   */
  async function promote(profile, newRankIndex) {
    const newRank = RANKS[newRankIndex];
    if (!newRank) throw new Error('Invalid rank index');

    const updated = await Storage.User.update({
      rankIndex:   newRankIndex,
      currentRank: newRank.name,
    });

    return updated;
  }

  /* ─────────────────────────────────────────
     PRESTIGE — reset at max rank
  ───────────────────────────────────────── */

  async function prestige(profile) {
    if ((profile?.rankIndex || 0) < RANKS.length - 1) {
      throw new Error('ต้องถึงยศสูงสุดก่อน prestige');
    }

    const stars = (profile.prestigeStars || 0) + 1;
    return Storage.User.update({
      rankIndex:     0,
      currentRank:   RANKS[0].name,
      prestigeStars: stars,
    });
  }

  /* ─────────────────────────────────────────
     PROGRESS TO NEXT RANK (%)
  ───────────────────────────────────────── */

  /**
   * คำนวณเปอร์เซ็นต์ความคืบหน้าไปยังยศถัดไป
   */
  function progressToNextRank(pr, currentIndex) {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= RANKS.length) return 100;

    const nextRank = RANKS[nextIndex];
    const { details } = checkRequirements(pr, nextRank);

    if (!details.length) return 100;

    // คำนวณ % เฉลี่ยของทุกเงื่อนไข
    let totalPct = 0;
    let count    = 0;

    for (const d of details) {
      if (!d.required) continue;
      count++;

      if (d.exercise.includes('วิ่ง') || d.exercise.includes('run')) {
        // สำหรับวิ่ง: ต่ำกว่า = ดีกว่า
        if (!d.current) { totalPct += 0; continue; }
        const pct = Math.min(100, Math.round((d.required / d.current) * 100));
        totalPct += pct;
      } else {
        const pct = Math.min(100, Math.round((d.current / d.required) * 100));
        totalPct += pct;
      }
    }

    return count ? Math.round(totalPct / count) : 0;
  }

  /* ─────────────────────────────────────────
     CAPABILITY SCORES
  ───────────────────────────────────────── */

  /**
   * แปลง PR เป็น capability score bars
   */
  function getCapabilityScores(pr) {
    if (!pr) return { strength: 0, endurance: 0, core: 0, total: 0 };
    return {
      strength:  pr.strengthScore  || 0,
      endurance: pr.enduranceScore || 0,
      core:      pr.coreScore      || 0,
      total:     pr.totalScore     || 0,
    };
  }

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  return {
    checkRequirements,
    evaluateRankFromPR,
    checkPromotion,
    promote,
    prestige,
    progressToNextRank,
    getCapabilityScores,
  };

})();
