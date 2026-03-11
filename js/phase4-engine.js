/**
 * TACTICAL FITNESS — PHASE 4 ENGINE  (FINAL CHAPTER)
 * ════════════════════════════════════════════════════════
 * System A: Live Coach AI  — real-time feedback during training
 * System B: Session 2.0    — superset, AMRAP, EMOM, Tabata timers
 * System C: Report Export  — canvas-based PNG card + printable HTML
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════
   SYSTEM A — LIVE COACH AI
   Real-time contextual feedback คล้าย personal trainer
══════════════════════════════════════════════════ */

const LiveCoach = (() => {

  /* ── Fatigue detection heuristics ── */
  const FATIGUE_THRESHOLD  = 0.75; // rep drop ratio triggers fatigue warning
  const MOMENTUM_THRESHOLD = 1.15; // rep increase ratio = momentum
  const RPE_HIGH           = 8;

  /**
   * วิเคราะห์ set ที่เพิ่งทำเสร็จ → คืน advice object
   * @param {object} ex          - exercise ปัจจุบัน { name, actualReps, setDone, targetReps, sets }
   * @param {number} setIdx      - index of set just completed
   * @param {number} rpe         - self-rated RPE (1-10), optional
   * @param {object} pr          - PR record
   * @param {object} phaseCtx    - { phaseName } from PeriodizationEngine (optional)
   * @returns {object} { type, message, action, priority }
   */
  function analyzeSet(ex, setIdx, rpe = null, pr = null, phaseCtx = null) {
    const reps      = ex.actualReps || [];
    const current   = reps[setIdx] || 0;
    const prev      = setIdx > 0 ? (reps[setIdx - 1] || current) : current;
    const target    = ex.targetReps || ex.reps || 0;
    const totalSets = ex.sets || 3;
    const setsLeft  = totalSets - setIdx - 1;
    const isLast    = setsLeft === 0;

    // Drop ratio
    const dropRatio = prev > 0 ? current / prev : 1;

    // PR proximity
    const prVal = _getPR(ex.name, pr);
    const nearPR = prVal > 0 && current >= prVal * 0.9;
    const isPR   = prVal > 0 && current > prVal;

    let type, message, action, priority = 'normal';

    if (isPR) {
      type    = 'pr';
      message = `🏆 PR ใหม่! ${current} reps — สถิติเดิม ${prVal}`;
      action  = 'celebrate';
      priority = 'high';
    } else if (nearPR && !isLast) {
      type    = 'momentum';
      message = `เกือบถึง PR แล้ว (${prVal} reps) — อีกแค่ ${prVal - current} reps!`;
      action  = 'push';
      priority = 'high';
    } else if (dropRatio <= FATIGUE_THRESHOLD && setIdx >= 2) {
      type    = 'fatigue';
      message = `Rep ลดลง ${Math.round((1-dropRatio)*100)}% — พักให้ครบก่อน set ต่อไป`;
      action  = 'extend_rest';
      priority = 'warn';
    } else if (dropRatio >= MOMENTUM_THRESHOLD) {
      type    = 'momentum';
      message = `Momentum ดี! +${Math.round((dropRatio-1)*100)}% จาก set ก่อน`;
      action  = 'keep_going';
      priority = 'good';
    } else if (rpe !== null && rpe >= RPE_HIGH && !isLast) {
      type    = 'rpe_high';
      message = `RPE ${rpe} — เพิ่มเวลาพักหรือลด reps set ถัดไป`;
      action  = 'adjust';
      priority = 'warn';
    } else if (current >= target && !isLast) {
      type    = 'on_target';
      message = `Target ครบ (${current}/${target}) — รักษา form ต่อไป`;
      action  = 'maintain';
      priority = 'good';
    } else if (current < target * 0.7 && setIdx === 0) {
      type    = 'low_start';
      message = `เริ่มต้น ${current} reps ต่ำกว่า target ${target} — ตรวจสอบ warm-up`;
      action  = 'check';
      priority = 'warn';
    } else {
      type    = 'neutral';
      message = `Set ${setIdx+1} done — ${setsLeft > 0 ? `อีก ${setsLeft} sets` : 'last set!'}`;
      action  = 'continue';
    }

    return { type, message, action, priority, current, prev, target, setsLeft, isLast };
  }

  /**
   * วิเคราะห์ภาพรวมของ exercise ที่เพิ่งเสร็จ
   */
  function analyzeExercise(ex, pr = null) {
    const reps    = (ex.actualReps || []).filter((_,i) => ex.setDone?.[i] !== false);
    if (!reps.length) return null;
    const total   = reps.reduce((s,r) => s+r, 0);
    const avg     = Math.round(total / reps.length);
    const max     = Math.max(...reps);
    const prVal   = _getPR(ex.name, pr);
    const isPR    = prVal > 0 && max > prVal;
    const trend   = reps.length > 1 ? (reps[reps.length-1] - reps[0]) / reps.length : 0;
    const trendDir = trend > 0.5 ? 'up' : trend < -0.5 ? 'down' : 'flat';

    // Volume score
    const volumeScore = Math.min(100, Math.round((total / (ex.sets * ex.reps || 30)) * 100));

    let summary;
    if (isPR)             summary = `🏆 PR ใหม่ที่ ${max} reps`;
    else if (trendDir === 'down' && reps.length >= 3) summary = `Rep ลดลงต่อเนื่อง — อาจเป็นสัญญาณ overtraining`;
    else if (volumeScore >= 90) summary = `Volume ดีเยี่ยม ${total} reps total`;
    else                  summary = `${total} reps / ${reps.length} sets (avg ${avg})`;

    return { avg, max, total, trend: trendDir, volumeScore, isPR, summary };
  }

  /**
   * สร้าง mid-session pep talk (เรียกทุก 10 นาที)
   */
  function pepTalk(elapsedMin, completedSets, totalSets, fatigueLevel) {
    const pct = totalSets > 0 ? completedSets / totalSets : 0;
    if (fatigueLevel > 0.7) return { text: 'ร่างกายเริ่มล้า — ควบคุมลมหายใจ ช้าลงได้', tone: 'caution' };
    if (pct >= 0.9)          return { text: 'เกือบถึงแล้ว! อีกนิดเดียว ออกแรงสุดท้าย!', tone: 'push' };
    if (pct >= 0.5)          return { text: 'ครึ่งทางแล้ว — ยังดีอยู่ ทำต่อ!', tone: 'encourage' };
    if (elapsedMin >= 30)    return { text: `${elapsedMin} นาทีแล้ว — แกร่งมาก! จบให้ดี`, tone: 'encourage' };
    return { text: 'Focus! ทุก rep มีค่า', tone: 'neutral' };
  }

  function _getPR(name, pr) {
    if (!pr) return 0;
    const m = { 'Push-up': pr.pushup?.value, 'Pull-up': pr.pullup?.value, 'Sit-up': pr.situp?.value, 'Plank': pr.plank?.value };
    return m[name] || 0;
  }

  return { analyzeSet, analyzeExercise, pepTalk };
})();

/* ══════════════════════════════════════════════════
   SYSTEM B — SESSION 2.0
   Advanced training modes: Superset / AMRAP / EMOM / Tabata
══════════════════════════════════════════════════ */

const Session2 = (() => {

  /* ── MODE DEFINITIONS ── */
  const MODES = {
    standard: { id: 'standard', name: 'Standard',  icon: '▶',  desc: 'Sets × Reps ปกติ' },
    superset: { id: 'superset', name: 'Superset',  icon: '⚡',  desc: '2 exercises สลับกันไม่มีพัก' },
    amrap:    { id: 'amrap',    name: 'AMRAP',      icon: '∞',  desc: 'As Many Reps As Possible ใน X นาที' },
    emom:     { id: 'emom',     name: 'EMOM',       icon: '⏱',  desc: 'Every Minute On the Minute' },
    tabata:   { id: 'tabata',   name: 'Tabata',     icon: '🔥',  desc: '20s ON / 10s OFF × 8 rounds' },
    cluster:  { id: 'cluster',  name: 'Cluster',    icon: '◼◼', desc: 'Mini sets within rest period' },
  };

  /* ── Timer engine ── */
  class IntervalTimer {
    constructor(onTick, onPhaseChange, onComplete) {
      this.onTick        = onTick;
      this.onPhaseChange = onPhaseChange;
      this.onComplete    = onComplete;
      this._interval     = null;
      this._startAt      = 0;
      this._elapsed      = 0;
      this.running       = false;
    }
    start(totalSeconds) {
      this.totalSeconds = totalSeconds;
      this._elapsed     = 0;
      this._startAt     = Date.now();
      this.running      = true;
      this._tick();
      this._interval = setInterval(() => this._tick(), 250);
    }
    _tick() {
      const now      = Date.now();
      this._elapsed  = Math.floor((now - this._startAt) / 1000);
      const remaining = this.totalSeconds - this._elapsed;
      if (this.onTick) this.onTick(remaining, this._elapsed);
      if (remaining <= 0) { this.stop(); if (this.onComplete) this.onComplete(); }
    }
    stop()  { clearInterval(this._interval); this.running = false; }
    pause() { clearInterval(this._interval); this.running = false; }
    resume(remainingSec) { if (!this.running) { this.start(remainingSec); } }
  }

  /* ── AMRAP config ── */
  function amrapConfig(minutes = 10) {
    return { mode: 'amrap', durationSec: minutes * 60, minutes };
  }

  /* ── EMOM config ── */
  function emomConfig(rounds = 10, exercisePerRound = []) {
    return { mode: 'emom', rounds, exercisePerRound, intervalSec: 60 };
  }

  /* ── Tabata config ── */
  function tabataConfig(rounds = 8, workSec = 20, restSec = 10) {
    return {
      mode:    'tabata',
      rounds,
      workSec,
      restSec,
      totalSec: rounds * (workSec + restSec),
      phases:  _buildTabataPhases(rounds, workSec, restSec),
    };
  }

  function _buildTabataPhases(rounds, work, rest) {
    const phases = [];
    for (let i = 0; i < rounds; i++) {
      phases.push({ type: 'work', round: i+1, duration: work, label: `WORK — Round ${i+1}/${rounds}` });
      if (i < rounds - 1) {
        phases.push({ type: 'rest', round: i+1, duration: rest, label: 'REST' });
      }
    }
    return phases;
  }

  /* ── Superset ── */
  function supersetConfig(exA, exB) {
    return { mode: 'superset', exA, exB, restBetweenPairs: 60 };
  }

  /* ── Cluster set ── */
  function clusterConfig(totalReps, miniSetSize = 3, intraRestSec = 15) {
    const miniSets = Math.ceil(totalReps / miniSetSize);
    return { mode: 'cluster', totalReps, miniSetSize, miniSets, intraRestSec };
  }

  /* ── Tabata state machine ── */
  class TabataRunner {
    constructor(config, onPhase, onTick, onComplete) {
      this.config     = config;
      this.onPhase    = onPhase;
      this.onTick     = onTick;
      this.onComplete = onComplete;
      this.phaseIdx   = 0;
      this.repsLog    = [];
      this._timer     = null;
    }
    start() { this._runPhase(0); }
    _runPhase(idx) {
      if (idx >= this.config.phases.length) {
        if (this.onComplete) this.onComplete(this.repsLog);
        return;
      }
      this.phaseIdx = idx;
      const phase   = this.config.phases[idx];
      if (this.onPhase) this.onPhase(phase, idx);
      let remaining = phase.duration;
      this._timer   = setInterval(() => {
        remaining--;
        if (this.onTick) this.onTick(remaining, phase);
        if (remaining <= 0) {
          clearInterval(this._timer);
          this._runPhase(idx + 1);
        }
      }, 1000);
    }
    logReps(reps) { this.repsLog.push(reps); }
    stop() { clearInterval(this._timer); }
  }

  /* ── Scoring helpers ── */
  function scoreAMRAP(totalReps, durationMin) {
    return { rph: Math.round((totalReps / durationMin) * 60), totalReps, durationMin };
  }

  function scoreTabata(repsLog) {
    const total = repsLog.reduce((s,r) => s+r, 0);
    const avg   = repsLog.length ? Math.round(total / repsLog.length) : 0;
    const peak  = Math.max(...repsLog, 0);
    const min_  = Math.min(...repsLog, Infinity);
    const drop  = peak > 0 ? Math.round((1 - min_ / peak) * 100) : 0;
    return { total, avg, peak, min: min_, dropPct: drop };
  }

  return {
    MODES, IntervalTimer, TabataRunner,
    amrapConfig, emomConfig, tabataConfig, supersetConfig, clusterConfig,
    scoreAMRAP, scoreTabata,
  };
})();

/* ══════════════════════════════════════════════════
   SYSTEM C — REPORT EXPORTER
   PNG Operator Card + Printable HTML weekly report
══════════════════════════════════════════════════ */

const ReportExporter = (() => {

  /* ── Operator Card (PNG via Canvas) ── */
  function drawOperatorCard(canvas, profile, pr, logs, options = {}) {
    const W   = options.width  || 800;
    const H   = options.height || 440;
    const DPR = options.dpr    || (window.devicePixelRatio || 1);

    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // ── Background ──
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0,   '#0a0a0a');
    grad.addColorStop(0.5, '#0d1a12');
    grad.addColorStop(1,   '#080808');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Hex grid pattern ──
    ctx.strokeStyle = 'rgba(0,255,136,0.04)';
    ctx.lineWidth   = 1;
    const hexSize = 28;
    for (let x = -hexSize; x < W + hexSize; x += hexSize * 1.73) {
      for (let y = -hexSize; y < H + hexSize; y += hexSize) {
        _hexPath(ctx, x, y, hexSize);
        ctx.stroke();
      }
    }

    // ── Left accent bar ──
    const barGrad = ctx.createLinearGradient(0, 0, 0, H);
    barGrad.addColorStop(0,   '#00ff88');
    barGrad.addColorStop(0.5, '#00d4ff');
    barGrad.addColorStop(1,   '#00ff88');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, 6, H);

    // ── CLASSIFIED watermark ──
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle   = '#00ff88';
    ctx.font        = 'bold 120px monospace';
    ctx.textAlign   = 'center';
    ctx.translate(W/2, H/2 + 40);
    ctx.rotate(-0.2);
    ctx.fillText('CLASSIFIED', 0, 0);
    ctx.restore();

    // ── Top label ──
    ctx.fillStyle = 'rgba(0,255,136,0.7)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '4px';
    ctx.fillText('// TACTICAL FITNESS — OPERATOR DOSSIER', 28, 32);

    // ── Callsign ──
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 56px "Bebas Neue", monospace';
    ctx.fillText(profile?.callsign || 'OPERATOR', 28, 96);

    // ── Rank ──
    const rankName = RANKS?.[profile?.rankIndex || 0]?.name || '—';
    ctx.fillStyle = '#00ff88';
    ctx.font      = '16px monospace';
    ctx.fillText(rankName.toUpperCase(), 28, 120);

    // ── Horizontal rule ──
    ctx.strokeStyle = 'rgba(0,255,136,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(28, 132); ctx.lineTo(W - 28, 132); ctx.stroke();

    // ── Stats grid ──
    const stats = [
      { label: 'PUSH-UP PR',   val: pr?.pushup?.value  || '—', unit: 'reps' },
      { label: 'PULL-UP PR',   val: pr?.pullup?.value  || '—', unit: 'reps' },
      { label: 'PLANK',        val: pr?.plank?.value   ? _fmtSec(pr.plank.value) : '—', unit: '' },
      { label: 'RUN 2KM',      val: pr?.run2km?.value  ? _fmtTime(pr.run2km.value) : '—', unit: '' },
      { label: 'TOTAL DAYS',   val: profile?.totalDaysActive || 0, unit: 'days' },
      { label: 'STREAK',       val: profile?.currentStreak || 0,   unit: '🔥' },
    ];

    const colW = (W - 56) / 3;
    const rowH = 90;

    stats.forEach((s, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x   = 28 + col * colW;
      const y   = 155 + row * rowH;

      // Cell bg
      ctx.fillStyle = 'rgba(0,255,136,0.04)';
      _roundRect(ctx, x, y, colW - 8, 78, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,255,136,0.1)';
      ctx.lineWidth   = 1;
      _roundRect(ctx, x, y, colW - 8, 78, 6);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font      = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, x + 10, y + 20);

      // Value
      ctx.fillStyle = '#ffffff';
      ctx.font      = 'bold 30px "Bebas Neue", monospace';
      ctx.fillText(s.val.toString(), x + 10, y + 52);

      // Unit
      ctx.fillStyle = '#00ff88';
      ctx.font      = '10px monospace';
      ctx.fillText(s.unit, x + 10, y + 68);
    });

    // ── Score ring ──
    const score  = pr?.totalScore || 0;
    const cx     = W - 110;
    const cy     = 280;
    const radius = 80;

    // Ring background
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 10;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

    // Ring fill
    const angle   = (score / 1000) * Math.PI * 2;
    const ringGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    ringGrad.addColorStop(0, '#00ff88');
    ringGrad.addColorStop(1, '#00d4ff');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.stroke();

    // Score text
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 36px "Bebas Neue", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), cx, cy + 10);
    ctx.fillStyle = 'rgba(0,255,136,0.7)';
    ctx.font      = '9px monospace';
    ctx.fillText('SCORE', cx, cy + 26);

    // ── Week activity bar ──
    const today   = new Date();
    const weekLogs = [];
    for (let d = 6; d >= 0; d--) {
      const dd = new Date(today); dd.setDate(today.getDate() - d);
      const ds = dd.toISOString().split('T')[0];
      weekLogs.push({ date: ds, trained: (logs || []).some(l => l.date === ds) });
    }

    const barY = H - 60;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font      = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('THIS WEEK', 28, barY - 10);

    weekLogs.forEach((wl, i) => {
      const bx  = 28 + i * 44;
      const bh  = wl.trained ? 28 : 12;
      const by  = barY + 28 - bh;
      ctx.fillStyle = wl.trained ? '#00ff88' : 'rgba(255,255,255,0.1)';
      _roundRect(ctx, bx, by, 36, bh, 3);
      ctx.fill();
      const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      ctx.fillStyle = wl.trained ? '#00ff88' : 'rgba(255,255,255,0.2)';
      ctx.font      = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dayNames[i], bx + 18, barY + 38);
    });

    // ── Timestamp ──
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font      = '9px monospace';
    ctx.textAlign = 'right';
    const ts = new Date().toISOString().split('T')[0];
    ctx.fillText(`UPDATED: ${ts}`, W - 28, H - 16);

    return canvas;
  }

  function _hexPath(ctx, x, y, size) {
    ctx.beginPath();
    for (let a = 0; a < 6; a++) {
      const angle = (Math.PI / 3) * a - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function _fmtSec(s) { return s >= 60 ? `${Math.floor(s/60)}m${s%60}s` : `${s}s`; }
  function _fmtTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

  /* ── Download PNG ── */
  function downloadCard(canvas, filename = 'operator-card.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href     = canvas.toDataURL('image/png');
    link.click();
  }

  /* ── Weekly Report HTML ── */
  function buildWeeklyReport(aar, profile, pr) {
    const grade = aar.grade;
    const gradeColor = { S:'#00ff88', A:'#ffaa00', B:'#00b4ff', C:'#888', D:'#ff2d2d' }[grade] || '#888';
    const rankName = RANKS?.[profile?.rankIndex||0]?.name || '—';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tactical Fitness — Weekly Report ${aar.weekLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #f5f5f5; color: #111; padding: 32px; }
  .page { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #111; padding: 40px; }
  .header { border-bottom: 3px solid #111; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; justify-content: space-between; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: 6px; }
  .brand span { color: #00aa55; }
  .date  { font-size: 11px; color: #666; margin-top: 4px; letter-spacing: 2px; }
  h2 { font-size: 12px; letter-spacing: 4px; border-left: 4px solid #111; padding-left: 10px; margin: 20px 0 10px; }
  .grade-block { text-align: right; }
  .grade-big { font-size: 80px; font-weight: 900; color: ${gradeColor}; line-height: 1; }
  .grade-score { font-size: 12px; letter-spacing: 3px; color: #666; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .metric { border: 1px solid #ddd; padding: 12px; text-align: center; }
  .metric-val { font-size: 28px; font-weight: 900; }
  .metric-lbl { font-size: 9px; letter-spacing: 2px; color: #666; margin-top: 3px; }
  .metric-trend { font-size: 9px; margin-top: 2px; }
  .col-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  ul { list-style: none; }
  ul li { padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px; }
  ul li::before { content: '→ '; color: #00aa55; }
  .footer { border-top: 2px solid #111; margin-top: 24px; padding-top: 12px; font-size: 10px; color: #999; letter-spacing: 2px; }
  .pr-chip { display: inline-block; background: #00aa5515; border: 1px solid #00aa5544; color: #00aa55; padding: 2px 8px; border-radius: 3px; font-size: 10px; margin: 2px; }
  .callsign { font-size: 20px; font-weight: 900; letter-spacing: 4px; }
  @media print { body { padding: 0; background: #fff; } .page { border: none; box-shadow: none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">TACTICAL <span>FITNESS</span></div>
      <div class="date">WEEKLY AFTER ACTION REVIEW — ${aar.weekLabel}</div>
      <div style="margin-top:12px">
        <div class="callsign">${profile?.callsign || 'OPERATOR'}</div>
        <div style="font-size:11px;color:#666;letter-spacing:2px;margin-top:3px">${rankName}</div>
      </div>
    </div>
    <div class="grade-block">
      <div class="grade-big">${grade}</div>
      <div class="grade-score">SCORE: ${aar.score} / 100</div>
      <div class="grade-score">ACWR: ${aar.acwr}</div>
    </div>
  </div>

  <h2>// PERFORMANCE METRICS</h2>
  <div class="metrics">
    <div class="metric"><div class="metric-val">${aar.sessionCount}</div><div class="metric-lbl">SESSIONS</div></div>
    <div class="metric"><div class="metric-val">${aar.avgCompletion}%</div><div class="metric-lbl">COMPLETION</div></div>
    <div class="metric"><div class="metric-val">${aar.totalDuration}</div><div class="metric-lbl">TOTAL MIN</div></div>
    <div class="metric"><div class="metric-val">${aar.avgDuration}</div><div class="metric-lbl">AVG MIN</div></div>
  </div>

  ${aar.newPRs.length ? `<div style="margin-bottom:16px"><h2>// NEW PERSONAL RECORDS</h2><div>${aar.newPRs.map(p=>`<span class="pr-chip">🏆 ${p}</span>`).join('')}</div></div>` : ''}

  <div class="col-2">
    <div>
      <h2>// STRONG</h2>
      <ul>${aar.strong.map(s=>`<li>${s}</li>`).join('')}</ul>
    </div>
    <div>
      <h2>// WEAK</h2>
      <ul>${aar.weak.map(w=>`<li>${w}</li>`).join('')}</ul>
    </div>
  </div>

  <div style="margin-top:20px">
    <h2>// NEXT WEEK ACTIONS</h2>
    <ul>${aar.action.map(a=>`<li>${a}</li>`).join('')}</ul>
  </div>

  <div class="footer">
    TACTICAL FITNESS v4.0  •  GENERATED ${new Date().toISOString().split('T')[0]}  •  CONFIDENTIAL
  </div>
</div>
</body>
</html>`;
  }

  function downloadReport(html, filename = 'weekly-report.html') {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href     = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function printReport(html) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return { drawOperatorCard, downloadCard, buildWeeklyReport, downloadReport, printReport };
})();

/* ── Exports ── */
window.LiveCoach       = LiveCoach;
window.Session2        = Session2;
window.ReportExporter  = ReportExporter;
