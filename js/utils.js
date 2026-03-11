/**
 * TACTICAL FITNESS — SHARED UTILS v1.0
 * Helper functions ที่ใช้ร่วมกันทุกหน้า
 */

'use strict';

/* ─────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────── */

const DateUtils = {

  /** วันนี้ YYYY-MM-DD */
  today() {
    return new Date().toISOString().split('T')[0];
  },

  /** แปลง seconds → MM:SS */
  secToMMSS(sec) {
    if (!sec && sec !== 0) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  /** แปลง seconds → M นาที SS วินาที */
  secToThai(sec) {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (!m) return `${s} วิ`;
    if (!s) return `${m} นาที`;
    return `${m} นาที ${s} วิ`;
  },

  /** แปลง timestamp → วันที่ไทย DD/MM/YYYY */
  tsThai(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`;
  },

  /** แปลง YYYY-MM-DD → วันที่ไทย */
  dateThai(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-').map(Number);
    const MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${d} ${MONTHS[m]} ${y + 543}`;
  },

  /** ชื่อวัน */
  dayName(dow) {
    return ['อา','จ','อ','พ','พฤ','ศ','ส'][dow] || '';
  },

  /** วันพรุ่งนี้ YYYY-MM-DD */
  tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  /** N วันที่แล้ว */
  daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  },
};

/* ─────────────────────────────────────────
   NUMBER HELPERS
───────────────────────────────────────── */

const NumUtils = {

  /** clamp value between min and max */
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  /** แปลง meters → km string */
  metersToKm(m) {
    if (!m) return '0 km';
    return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`;
  },

  /** ปัดเลขเป็น k */
  formatNum(n) {
    if (n >= 1000) return `${(n/1000).toFixed(1)}k`;
    return String(Math.round(n));
  },
};

/* ─────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────── */

const DOM = {

  /** getElementById shortcut */
  id(id) { return document.getElementById(id); },

  /** querySelector shortcut */
  q(sel, root = document) { return root.querySelector(sel); },

  /** querySelectorAll shortcut */
  qa(sel, root = document) { return [...root.querySelectorAll(sel)]; },

  /** set textContent safely */
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? '—';
  },

  /** set innerHTML safely */
  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  /** show / hide element */
  show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; },
  hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; },

  /** Toast notification */
  toast(msg, type = 'success', duration = 2500) {
    let el = document.getElementById('tf-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tf-toast';
      el.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);
        background:var(--bg2,#111);border-radius:4px;padding:10px 22px;
        font-family:var(--mono,'Share Tech Mono',monospace);font-size:11px;
        letter-spacing:1px;z-index:9999;opacity:0;transition:all .3s ease;
        white-space:nowrap;pointer-events:none;
      `;
      document.body.appendChild(el);
    }
    const colors = { success: 'var(--green,#00ff88)', error: 'var(--red,#ff2d2d)', warn: 'var(--amber,#ffaa00)' };
    el.style.color       = colors[type] || colors.success;
    el.style.borderColor = colors[type] || colors.success;
    el.style.border      = `1px solid ${colors[type] || colors.success}`;
    el.textContent = msg;
    el.style.opacity   = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(-50%) translateY(16px)';
    }, duration);
  },
};

/* ─────────────────────────────────────────
   CANVAS CHART HELPERS
───────────────────────────────────────── */

const Charts = {

  /** วาด sparkline บน canvas */
  sparkline(canvas, values, color = '#00ff88') {
    if (!canvas || !values?.length) return;
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();

    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // glow
    ctx.shadowBlur  = 6;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  },

  /** วาด bar chart แนวตั้ง */
  barChart(canvas, data, options = {}) {
    if (!canvas || !data?.length) return;
    const {
      barColor   = '#00ff88',
      labelColor = '#666',
      maxVal     = null,
    } = options;

    const ctx  = canvas.getContext('2d');
    const w    = canvas.width;
    const h    = canvas.height;
    const max  = maxVal || Math.max(...data.map(d => d.value || d), 1);
    const pad  = 4;
    const bw   = (w - pad * (data.length + 1)) / data.length;

    ctx.clearRect(0, 0, w, h);

    data.forEach((item, i) => {
      const val    = item.value ?? item;
      const label  = item.label ?? '';
      const barH   = Math.max(2, ((val / max) * (h - 16)));
      const x      = pad + i * (bw + pad);
      const y      = h - 12 - barH;

      // bar
      ctx.fillStyle = item.highlight ? '#ffaa00' : barColor;
      ctx.fillRect(x, y, bw, barH);

      // label
      if (label) {
        ctx.fillStyle  = labelColor;
        ctx.font       = `9px monospace`;
        ctx.textAlign  = 'center';
        ctx.fillText(label.slice(0, 3), x + bw / 2, h - 2);
      }
    });
  },

  /** วาด progress ring */
  ring(canvas, pct, color = '#00ff88', bgColor = '#1a1a1a') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx  = canvas.width  / 2;
    const cy  = canvas.height / 2;
    const r   = Math.min(cx, cy) - 6;
    const start = -Math.PI / 2;
    const end   = start + (Math.PI * 2 * (pct / 100));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // bg ring
    ctx.strokeStyle = bgColor;
    ctx.lineWidth   = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // progress
    ctx.strokeStyle = color;
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
    ctx.shadowBlur  = 0;
  },
};

/* ─────────────────────────────────────────
   SIDEBAR / NAV HELPERS
───────────────────────────────────────── */

const Nav = {

  /** toggle mobile sidebar */
  toggle() {
    const sb  = document.getElementById('sidebar');
    const ov  = document.getElementById('overlay');
    if (sb) sb.classList.toggle('open');
    if (ov) ov.classList.toggle('show');
  },

  close() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
  },

  /** อัพเดต sidebar footer จาก profile */
  updateFooter(profile) {
    if (!profile) return;
    const rank    = (typeof RANKS !== 'undefined') ? RANKS[profile.rankIndex || 0] : null;
    const rankEl  = document.getElementById('sb-rank');
    const callEl  = document.getElementById('sb-callsign');
    if (rankEl) rankEl.textContent  = rank?.name || profile.currentRank || '—';
    if (callEl) callEl.textContent  = profile.callsign || 'OPERATOR';
  },
};

/* ─────────────────────────────────────────
   HAPTIC
───────────────────────────────────────── */

function haptic(type = 'light') {
  const prefs = JSON.parse(localStorage.getItem('tf_prefs') || '{}');
  if (!prefs.haptic) return;
  if (!navigator.vibrate) return;
  const patterns = { light: [10], medium: [20], heavy: [40, 10, 40] };
  navigator.vibrate(patterns[type] || patterns.light);
}

/* ─────────────────────────────────────────
   GUARD — redirect if no profile
───────────────────────────────────────── */

async function requireProfile(redirectTo = '../index.html') {
  try {
    await Storage.init();
    const profile = await Storage.User.get();
    if (!profile?.onboardingComplete) {
      window.location.href = redirectTo;
      return null;
    }
    return profile;
  } catch (err) {
    console.error('[Guard] Storage error:', err);
    window.location.href = redirectTo;
    return null;
  }
}
