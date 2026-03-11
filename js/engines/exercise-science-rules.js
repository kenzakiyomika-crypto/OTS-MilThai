/**
 * EXERCISE SCIENCE RULE ENGINE v2.0
 * ═══════════════════════════════════════════════════════════════════
 * ความรู้จาก:
 *   • Exercise Science Vol.1 — หลักการ · สูตรคำนวณ · โภชนาการ · การพักฟื้น
 *   • Exercise Science Vol.2 — โปรแกรมตามสาย · ท่าออกกำลังกายครบทุกกลุ่ม
 * อ้างอิง: NSCA · ACSM · ISSN · Army FM 7-22 · Israetel · Verkhoshansky
 *          Borg (RPE) · Kiviniemi (HRV) · Gabbett (ACWR) · Poliquin
 *
 * ทำงาน Offline 100% — ไม่ใช้ AI · ไม่ใช้ Network · Pure Rule-Based
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const ExerciseScienceRules = (() => {

  /* ── EXPLAIN CHAIN ───────────────────────────────────────── */
  class ExplainChain {
    constructor(title) { this.title=title; this.steps=[]; }
    input(k,v,u='') { this.steps.push({type:'input',k,v,u}); return this; }
    rule(formula,result,source) { this.steps.push({type:'formula',formula,result,source}); return this; }
    decide(cond,outcome,why) { this.steps.push({type:'decision',cond,outcome,why}); return this; }
    warn(msg) { this.steps.push({type:'warning',msg}); return this; }
    conclude(text) { this.steps.push({type:'conclusion',text}); return this; }
    toHTML() {
      const rows = this.steps.map(s => {
        if (s.type==='input')    return `<div class="ec-formula"><span class="ec-eq">INPUT ${s.k}</span><span class="ec-res">= ${s.v} ${s.u}</span></div>`;
        if (s.type==='formula')  return `<div class="ec-formula"><span class="ec-eq">${s.formula}</span><span class="ec-res">= ${s.result}</span><span class="ec-src">${s.source||''}</span></div>`;
        if (s.type==='decision') return `<div class="ec-decision"><span class="ec-if">IF</span> ${s.cond} → <strong>${s.outcome}</strong><span class="ec-why">${s.why||''}</span></div>`;
        if (s.type==='warning')  return `<div class="ec-warn">⚠ ${s.msg}</div>`;
        if (s.type==='conclusion') return `<div class="ec-conclusion">∴ ${s.text}</div>`;
        return '';
      }).join('');
      return `<div class="explain-chain visible"><div class="ec-title">${this.title}</div>${rows}</div>`;
    }
  }

  /* ── FORMULAS (Vol.1 §2) ─────────────────────────────────── */
  const Formulas = {
    calc1RM(w,r)          { return r<=1?w:w*(1+r/30); },
    repsFrom1RMPercent(p) { return p>=1?1:Math.max(1,Math.round(30*(1/p-1))); },
    pctFrom1RMReps(r)     { return r<=1?1.0:1/(1+r/30); },
    maxHR(age)            { return Math.round(208-0.7*age); },
    targetHR(age,rhr,i)   { return Math.round((Formulas.maxHR(age)-rhr)*i+rhr); },
    hrZones(age,rhr=60) {
      const t=p=>Formulas.targetHR(age,rhr,p);
      return {
        zone1:{name:'Recovery',     lo:t(0.30),hi:t(0.40),purpose:'ฟื้นตัว'},
        zone2:{name:'Aerobic Base', lo:t(0.40),hi:t(0.60),purpose:'Fat Burn / Base'},
        zone3:{name:'Tempo',        lo:t(0.60),hi:t(0.70),purpose:'Threshold'},
        zone4:{name:'Threshold',    lo:t(0.70),hi:t(0.85),purpose:'Race Pace'},
        zone5:{name:'VO2Max',       lo:t(0.85),hi:t(1.00),purpose:'Anaerobic'},
      };
    },
    bmr(wKg,hCm,age,g)  { const b=(10*wKg)+(6.25*hCm)-(5*age); return Math.round(g==='male'?b+5:b-161); },
    tdee(bmr,act)       { return Math.round(bmr*({sedentary:1.2,light:1.375,moderate:1.55,active:1.725,veryActive:1.9}[act]||1.55)); },
    fatigueIndex(wl,rh) { return rh>0?wl/rh:999; },
    tacticalScore(pu,su,pl,plk,run) {
      let b=0; if(run<630)b=50; else if(run<720)b=30; else if(run<810)b=15;
      return pu+su+pl*3+plk*0.1+b;
    },
  };

  /* ── RPE (Borg CR10 + 6-20) ─────────────────────────────── */
  const RPE = {
    CR10: { 0:{label:'ไม่รู้สึก',rirEst:10},1:{label:'เบามาก',rirEst:8},2:{label:'เบา',rirEst:7},3:{label:'ปานกลาง',rirEst:5},4:{label:'ค่อนหนัก',rirEst:4},5:{label:'หนัก',rirEst:3},6:{label:'หนักขึ้น',rirEst:2},7:{label:'หนักมาก',rirEst:1},8:{label:'หนักมากๆ',rirEst:0},9:{label:'เกือบหมดแรง',rirEst:0},10:{label:'หมดแรง',rirEst:0} },
    targetRPE(goal,phase) {
      return ({military:{Foundation:14,Build:15,Peak:16,Taper:13},hypertrophy:{Foundation:14,Build:15,Peak:17,Taper:12},athlete:{Foundation:13,Build:15,Peak:17,Taper:12},general:{Foundation:12,Build:14,Peak:15,Taper:11}}[goal]||{Foundation:13,Build:14,Peak:15,Taper:12})[phase]||14;
    },
    rpeToLoadPct(rpe) { const m={10:1.0,9:0.97,8:0.94,7:0.91,6:0.87,5:0.83,4:0.79,3:0.74,2:0.68,1:0.60}; return m[Math.round(rpe)]||0.75; },
    loadAdjustment(target,actual) {
      const d=actual-target;
      if(d>2)return 0.90; if(d>1)return 0.95; if(d<-2)return 1.10; if(d<-1)return 1.05; return 1.00;
    },
  };

  /* ── HRV READINESS (Kiviniemi) ──────────────────────────── */
  const HRV = {
    calcReadiness(today,baseline,cv=0.08) {
      if(!today||!baseline) return {score:70,level:'moderate',recommendation:'ไม่มีข้อมูล HRV'};
      const ratio=today/baseline;
      let score,level,recommendation;
      if(ratio>=1+cv)      { score=85+Math.min(15,(ratio-1-cv)*100); level='high';     recommendation='HRV สูงกว่า baseline → High Performance Day'; }
      else if(ratio>=1-cv) { score=65+(ratio-(1-cv))/(2*cv)*20;      level='moderate'; recommendation='HRV ปกติ → ฝึกตามแผน'; }
      else                 { score=Math.max(0,65*(ratio/(1-cv)));     level='low';      recommendation='HRV ต่ำ → ลด intensity 20–30%'; }
      return {score:Math.round(Math.min(100,Math.max(0,score))),level,ratio:Math.round(ratio*100)/100,recommendation};
    },
    autoRegulate(score) {
      const chain=new ExplainChain('HRV Auto-Regulation');
      chain.input('Readiness',score,'/100');
      let volMult,intMult,sessionType;
      if(score>=80)      { volMult=1.10;intMult=1.05;sessionType='high';     chain.decide(`Score≥80 (${score})`,'High Performance Day','เพิ่ม vol 10%, int 5%'); }
      else if(score>=60) { volMult=1.00;intMult=1.00;sessionType='normal';   chain.decide(`60≤Score<80 (${score})`,'Normal Training','ฝึกตามแผน'); }
      else if(score>=40) { volMult=0.85;intMult=0.90;sessionType='reduced';  chain.decide(`40≤Score<60 (${score})`,'Reduced Training','ลด vol 15%, int 10%'); }
      else               { volMult=0.60;intMult=0.80;sessionType='recovery'; chain.decide(`Score<40 (${score})`,'Recovery Day','Zone 1 / Active Rest เท่านั้น'); }
      chain.conclude(`Volume×${volMult} · Intensity×${intMult} · ${sessionType}`);
      return {volMult,intMult,sessionType,explain:chain};
    },
  };

  /* ── PLATEAU DETECTION ──────────────────────────────────── */
  const PlateauDetector = {
    detect(logs,exercise,minSessions=4) {
      const chain=new ExplainChain(`Plateau — ${exercise}`);
      const rel=logs.filter(l=>l.exercise===exercise&&l.weight>0&&l.reps>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
      chain.input('Sessions',rel.length);
      if(rel.length<minSessions) { chain.warn(`ต้องการ ${minSessions} sessions`); return {status:'insufficient',trend:0,changePct:0,recommendation:'ข้อมูลน้อยเกินไป',explain:chain}; }
      const e1rms=rel.map(l=>({date:l.date,e1rm:Formulas.calc1RM(l.weight,l.reps)}));
      const mid=Math.floor(e1rms.length/2);
      const ae=e1rms.slice(0,mid).reduce((s,x)=>s+x.e1rm,0)/mid;
      const ar=e1rms.slice(mid).reduce((s,x)=>s+x.e1rm,0)/(e1rms.length-mid);
      const changePct=(ar-ae)/ae;
      const allV=e1rms.map(x=>x.e1rm); const mean=allV.reduce((s,v)=>s+v,0)/allV.length;
      const cv=Math.sqrt(allV.reduce((s,v)=>s+(v-mean)**2,0)/allV.length)/mean;
      chain.rule(`avg(early)=${ae.toFixed(1)} | avg(recent)=${ar.toFixed(1)}`,`Δ=${(changePct*100).toFixed(1)}%`,'Vol.1 §1.2');
      let status,recommendation;
      if(changePct>0.05)      { status='improving'; recommendation=`พัฒนา +${(changePct*100).toFixed(1)}% — รักษา Progressive Overload`; chain.decide(`Δ>5%`,'Improving',''); }
      else if(changePct<-0.05){ status='declining'; recommendation='Performance ลด — ตรวจ recovery/sleep/nutrition หรือ deload'; chain.decide(`Δ<-5%`,'Declining',''); }
      else if(Math.abs(changePct)<=0.03&&cv<0.05) { status='plateau'; recommendation=PlateauDetector._break(exercise); chain.decide(`|Δ|≤3%+CV<5%`,'PLATEAU','ต้องเปลี่ยน stimulus'); }
      else { status='stagnant'; recommendation='พัฒนาช้า — เพิ่ม volume หรือเปลี่ยน rep range'; chain.decide(`-5%≤Δ≤5%`,'Stagnant',''); }
      chain.conclude(recommendation);
      return {status,trend:changePct,changePct,cv,e1rms,recommendation,explain:chain};
    },
    _break(exercise) {
      const m={'Push-up':'ลอง Archer Push-up, Weighted Vest หรือ Tempo 3-1-3','Pull-up':'Weighted Pull-up, Eccentric-Only (5s) หรือ L-sit Pull-up','Squat':'Pause Squat, Tempo Squat หรือ Single-leg variation','Plank':'RKC Plank, Plank+Reach หรือ เพิ่ม Weight บนหลัง','Sit-up':'Dragon Flag progression หรือ L-sit','วิ่ง':'เพิ่ม Intervals, Hill Sprint หรือ Tempo Run'};
      const k=Object.keys(m).find(k=>exercise.includes(k));
      return m[k]||'เปลี่ยน rep range, เพิ่ม TUT หรือลอง variation ใหม่';
    },
    scanAll(logs) {
      return [...new Set(logs.map(l=>l.exercise).filter(Boolean))].map(ex=>({exercise:ex,...PlateauDetector.detect(logs,ex)}));
    },
  };

  /* ── INJURY SUBSTITUTION ────────────────────────────────── */
  const InjurySubstitution = {
    DB: {
      shoulder: { avoid:['Push-up','Diamond Push-up','Pike Push-up','Dip','Pull-up','Chin-up'], sub_push:[{name:'Incline Push-up (low angle)',why:'ลด shoulder stress'},{name:'Floor Press',why:'ROM จำกัด ปลอดภัย'}], sub_pull:[{name:'Inverted Row (horizontal)',why:'ไม่มี overhead'},{name:'Band Face Pull',why:'external rotation'}], cardio:[{name:'วิ่ง/Walking',why:'ไม่ใช้ shoulder'}] },
      knee:     { avoid:['Squat','Lunge','Jump Squat','Box Jump','Step-up','วิ่ง'], sub_lower:[{name:'Straight Leg Raise',why:'เสริม quad ไม่งอเข่า'},{name:'Hip Bridge',why:'glute/hamstring'},{name:'Calf Raise',why:'ปลอดภัย'},{name:'Terminal Knee Extension',why:'rehab VMO'}], cardio:[{name:'Swimming',why:'non-weight-bearing'},{name:'Cycling (low resist)',why:'เข่างอน้อย'}] },
      lowerback:{ avoid:['Sit-up','Leg Raise','Running (long)'], sub_core:[{name:'Dead Bug',why:'core stability ไม่กด spine'},{name:'Bird Dog',why:'anti-rotation'},{name:'Forearm Plank',why:'isometric ปลอดภัย'},{name:'McGill Big 3',why:'evidence-based LBP rehab'}], cardio:[{name:'Walking',why:'low-impact recovery'}] },
      wrist:    { avoid:['Push-up','Plank (hands)','Dip'], alternatives:[{name:'Fist Push-up',why:'ลด wrist extension'},{name:'Push-up Handles',why:'neutral wrist'},{name:'Forearm Plank',why:'ไม่ใช้ wrist extension'}] },
      elbow:    { avoid:['Pull-up','Chin-up','Dip'], sub_pull:[{name:'Inverted Row',why:'ลด elbow flexion'},{name:'Band Row',why:'controllable'}] },
    },
    getSubs(parts) {
      const chain=new ExplainChain('Injury Substitution');
      const avoidSet=new Set(); const safe=[];
      for(const part of parts) {
        const db=InjurySubstitution.DB[part]; if(!db){chain.warn(`ไม่มีข้อมูล: ${part}`);continue;}
        chain.decide(`บาดเจ็บ: ${part}`,'apply substitution list','');
        (db.avoid||[]).forEach(ex=>avoidSet.add(ex));
        ['sub_push','sub_pull','sub_lower','sub_core','alternatives','cardio'].forEach(k=>{if(db[k])safe.push(...db[k].map(ex=>({...ex,cat:k,injuredPart:part})));});
      }
      const seen=new Set(); const dedup=safe.filter(ex=>{if(seen.has(ex.name))return false;seen.add(ex.name);return true;});
      chain.conclude(`หลีกเลี่ยง ${avoidSet.size} ท่า · แนะนำ ${dedup.length} ท่าทดแทน`);
      return {safeExercises:dedup,avoidList:[...avoidSet],explain:chain};
    },
    filterProgram(exercises,parts) {
      if(!parts?.length) return exercises;
      const {safeExercises,avoidList}=InjurySubstitution.getSubs(parts);
      return exercises.map(ex=>{
        if(avoidList.some(a=>ex.name?.includes(a))) {
          const sub=safeExercises[0];
          return sub?{...ex,name:sub.name,substituted:true,originalName:ex.name,subWhy:sub.why}:{...ex,substituted:true,skipped:true};
        }
        return ex;
      });
    },
  };

  /* ── VBT ZONES (Gonzalez-Badillo) ──────────────────────── */
  const VBT = {
    ZONES:[
      {name:'Absolute Strength', lo:0.00,hi:0.25,load:'90–100% 1RM',reps:'1–3',  goal:'max force'},
      {name:'Strength-Speed',    lo:0.25,hi:0.50,load:'80–90% 1RM', reps:'3–5',  goal:'strength+power'},
      {name:'Power Zone',        lo:0.50,hi:0.75,load:'60–80% 1RM', reps:'4–6',  goal:'peak power'},
      {name:'Speed-Strength',    lo:0.75,hi:1.00,load:'40–60% 1RM', reps:'6–10', goal:'velocity / hypertrophy'},
      {name:'Muscular Endurance',lo:1.00,hi:1.30,load:'30–40% 1RM', reps:'15–25',goal:'endurance'},
    ],
    getZone(pct) {
      let v=pct>=0.90?0.15:pct>=0.80?0.35:pct>=0.65?0.60:pct>=0.50?0.85:1.10;
      return VBT.ZONES.find(z=>v>=z.lo&&v<z.hi)||VBT.ZONES[VBT.ZONES.length-1];
    },
  };

  /* ── WAVE LOADING (Poliquin · Verkhoshansky) ───────────── */
  const WaveLoading = {
    DUP:{
      strength:    {load:0.85,reps:'4–6',  sets:4,rest:180,focus:'Neural Strength'},
      hypertrophy: {load:0.75,reps:'8–12', sets:4,rest:90, focus:'Muscle Size'},
      endurance:   {load:0.60,reps:'15–20',sets:3,rest:45, focus:'Muscular Endurance'},
      power:       {load:0.50,reps:'3–5',  sets:5,rest:180,focus:'Explosive Power'},
    },
    buildDUPWeek(goal,daysPerWeek) {
      const seqs={military:['strength','endurance','strength','endurance','power'],hypertrophy:['hypertrophy','strength','hypertrophy','endurance','hypertrophy','strength'],athlete:['strength','power','endurance','power','strength'],general:['hypertrophy','endurance','hypertrophy']};
      const seq=seqs[goal]||seqs.general;
      const days=['จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์','อาทิตย์'];
      return Array.from({length:daysPerWeek},(_,i)=>({day:days[i],type:seq[i%seq.length],...WaveLoading.DUP[seq[i%seq.length]]}));
    },
    threeWave(base1RM) {
      return [
        {reps:3,load:base1RM*0.90,note:'Wave 1 — Activate'},
        {reps:2,load:base1RM*0.93,note:'Wave 1 — Build'},
        {reps:1,load:base1RM*0.97,note:'Wave 1 — Peak'},
        {reps:3,load:base1RM*0.92,note:'Wave 2 — Post-Activation Potentiation'},
        {reps:2,load:base1RM*0.95,note:'Wave 2 — PAP Peak'},
        {reps:1,load:base1RM*1.00,note:'Wave 2 — New Max Attempt'},
      ];
    },
  };

  /* ── ASSESSMENT ─────────────────────────────────────────── */
  const Assessment = {
    classifyFatigue(idx) {
      if(idx<40)return{level:'Fresh',    color:'#00ff88',action:'เพิ่ม Volume/Intensity ได้'};
      if(idx<61)return{level:'Moderate', color:'#ffd700',action:'รักษาระดับ'};
      if(idx<76)return{level:'High',     color:'#ff8c00',action:'ลด Volume 15%'};
      if(idx<91)return{level:'Very High',color:'#ff4500',action:'Deload ลด 40%'};
      return{level:'Critical',color:'#ff0000',action:'Active Rest 3–5 วัน'};
    },
    classifyFitnessLevel(p) {
      let s=0;
      if(p.pushup>=80)s+=3;else if(p.pushup>=55)s+=2;else if(p.pushup>=35)s+=1;
      if(p.pullup>=18)s+=3;else if(p.pullup>=10)s+=2;else if(p.pullup>=6)s+=1;
      if(p.situp>=70)s+=2;else if(p.situp>=50)s+=1;
      if(p.run3200mSec<=630)s+=3;else if(p.run3200mSec<=780)s+=2;else if(p.run3200mSec<=870)s+=1;
      if(p.experienceMonths>=24)s+=2;else if(p.experienceMonths>=6)s+=1;
      return s>=10?'elite':s>=7?'advanced':s>=4?'intermediate':'beginner';
    },
    assessMilitaryStandard(p) {
      const stds=[
        {rank:'หน่วยพิเศษ',pushup:80,situp:85,pullup:25,runSec:630},
        {rank:'นายทหารสัญญาบัตร',pushup:65,situp:70,pullup:18,runSec:750},
        {rank:'นายทหารชั้นประทวน',pushup:60,situp:65,pullup:15,runSec:780},
        {rank:'จ่าสิบตรี–สิบเอก',pushup:55,situp:60,pullup:12,runSec:810},
        {rank:'สิบตรี–สิบเอก',pushup:45,situp:50,pullup:10,runSec:870},
        {rank:'พลทหาร',pushup:35,situp:40,pullup:6,runSec:960},
      ];
      const passed=stds.filter(s=>p.pushup>=s.pushup&&p.situp>=s.situp&&p.pullup>=s.pullup&&p.run3200mSec<=s.runSec);
      return{qualifiedRank:passed.length?passed[0].rank:'ยังไม่ผ่านพื้นฐาน',pass:passed.length>0,standards:stds};
    },
  };

  /* ── PERIODIZATION ──────────────────────────────────────── */
  const Periodization = {
    getVolumeMultiplier(w) { return({1:1.00,2:1.05,3:1.10,4:0.90})[((w-1)%4)+1]||1.00; },
    getPhase(w) {
      if(w<=4) return{phase:'Foundation',volumeAdj:1.00,focus:'สร้างฐาน / เริ่มระบบ'};
      if(w<=8) return{phase:'Build',     volumeAdj:1.20,focus:'เพิ่ม Volume 20%'};
      if(w<=11)return{phase:'Peak',      volumeAdj:1.35,focus:'Intensity สูงสุด / Test'};
      return{phase:'Taper',volumeAdj:0.65,focus:'ลด Volume 40% รักษา Quality'};
    },
    shouldDeload(hw,fi,pd=0) { return hw>=3||fi>76||pd>0.10; },
  };

  /* ── AUTO-REGULATION ────────────────────────────────────── */
  const AutoRegulation = {
    calcReadiness(s) {
      const chain=new ExplainChain('Readiness Calculation');
      const{sleepHours:sl=7,hrv=null,fatigueIndex:fi=40,rpe_yesterday:ry=5,soreness:so=3}=s;
      let score=70;
      const sa=(sl-7)*5; score+=sa; chain.rule(`Sleep (${sl}-7)×5`,`${sa>0?'+':''}${sa} pts`,'Vol.1 §4');
      if(hrv&&hrv.todayRMSSD&&hrv.baselineRMSSD){const r=HRV.calcReadiness(hrv.todayRMSSD,hrv.baselineRMSSD);const ha=(r.score-70)*0.3;score+=ha;chain.rule(`HRV ${r.score}/100×0.3`,`${ha>0?'+':''}${ha.toFixed(1)} pts`,'Kiviniemi');}
      const fa=-(fi-40)*0.3; score+=fa; chain.rule(`Fatigue -(${fi}-40)×0.3`,`${fa>0?'+':''}${fa.toFixed(1)} pts`,'Vol.1 §2.3');
      const ra=(5-ry)*2; score+=ra; chain.rule(`RPE (5-${ry})×2`,`${ra>0?'+':''}${ra} pts`,'Borg CR10');
      const oa=-(so-3)*2.5; score+=oa; chain.rule(`Soreness -(${so}-3)×2.5`,`${oa>0?'+':''}${oa.toFixed(1)} pts`,'DOMS scale');
      score=Math.round(Math.min(100,Math.max(0,score)));
      chain.conclude(`Readiness = ${score}/100`);
      const level=score>=80?'High':score>=60?'Moderate':score>=40?'Low':'Very Low';
      return{score,level,explain:chain};
    },
    adjustSession(session,readiness,opts={}) {
      const{volMult,intMult,sessionType}=HRV.autoRegulate(readiness);
      const{injuredParts=[]}=opts;
      let exercises=(session.exercises||[]).map(ex=>{
        const sc={...ex};
        if(ex.type==='repetition') sc.reps=Math.max(3,Math.round((ex.reps||10)*volMult));
        else if(ex.type==='timed') sc.duration=Math.max(10,Math.round((ex.duration||30)*volMult));
        else if(ex.type==='distance') sc.distance=Math.round((ex.distance||1000)*volMult/100)*100;
        sc.rest=Math.round((ex.rest||60)/intMult);
        return{...sc,autoRegulated:true};
      });
      if(injuredParts.length) exercises=InjurySubstitution.filterProgram(exercises,injuredParts);
      return{adjustedSession:{...session,exercises,sessionType,readinessScore:readiness}};
    },
  };

  /* ── NUTRITION ──────────────────────────────────────────── */
  const Nutrition = {
    proteinTarget(wKg,goal){ const r={military:{min:1.8,max:2.4},hypertrophy:{min:1.6,max:2.2},athlete:{min:1.8,max:2.4},general:{min:1.4,max:1.8}}[goal]||{min:1.6,max:2.0}; return{minG:Math.round(r.min*wKg),maxG:Math.round(r.max*wKg)}; },
    macroSplit(goal){ return{military:{carbs:0.50,protein:0.30,fat:0.20},hypertrophy:{carbs:0.45,protein:0.35,fat:0.20},athlete:{carbs:0.55,protein:0.25,fat:0.20},general:{carbs:0.45,protein:0.25,fat:0.30}}[goal]||{carbs:0.45,protein:0.30,fat:0.25}; },
    hydrationTarget(wKg,th){ return Math.round(((wKg*0.033)+(th*0.5))*10)/10; },
    periWorkoutTiming(goal){ return{pre:{timing:'60–90 min ก่อน',carbs:goal==='athlete'?'1–1.5g/kg':'0.5g/kg',protein:'0.3g/kg',note:'เติม glycogen ป้องกัน catabolism'},intra:{timing:'ระหว่างฝึก >60 min',carbs:'30–60g/hr',note:'electrolytes สำหรับ session ยาว'},post:{timing:'ภายใน 30–60 min',carbs:'0.5–1g/kg',protein:'0.4g/kg',note:'Anabolic window — MPS สูงสุด'}}; },
  };

  /* ── EXERCISE DATABASE ──────────────────────────────────── */
  const EXERCISE_DB={
    pushup:          {name:'Push-up',          group:'upper_push',type:'repetition',weightFactor:0.70,difficulty:1},
    diamond_pushup:  {name:'Diamond Push-up',   group:'upper_push',type:'repetition',weightFactor:0.70,difficulty:2},
    pike_pushup:     {name:'Pike Push-up',       group:'upper_push',type:'repetition',weightFactor:0.75,difficulty:2},
    archer_pushup:   {name:'Archer Push-up',     group:'upper_push',type:'repetition',weightFactor:0.80,difficulty:3},
    dip:             {name:'Dip',               group:'upper_push',type:'repetition',weightFactor:0.70,difficulty:2},
    pullup:          {name:'Pull-up',           group:'upper_pull',type:'repetition',weightFactor:1.00,difficulty:3},
    chinup:          {name:'Chin-up',           group:'upper_pull',type:'repetition',weightFactor:1.00,difficulty:2},
    inverted_row:    {name:'Inverted Row',       group:'upper_pull',type:'repetition',weightFactor:0.60,difficulty:1},
    plank:           {name:'Plank',             group:'core',      type:'timed',     weightFactor:0.50,difficulty:1},
    situp:           {name:'Sit-up',            group:'core',      type:'repetition',weightFactor:0.50,difficulty:1},
    leg_raise:       {name:'Leg Raise',         group:'core',      type:'repetition',weightFactor:0.50,difficulty:2},
    mountain_climber:{name:'Mountain Climber',  group:'core',      type:'timed',     weightFactor:0.50,difficulty:2},
    dead_bug:        {name:'Dead Bug',          group:'core',      type:'timed',     weightFactor:0.45,difficulty:1},
    hanging_knee:    {name:'Hanging Knee Raise',group:'core',      type:'repetition',weightFactor:0.60,difficulty:2},
    squat:           {name:'Squat',             group:'lower',     type:'repetition',weightFactor:0.80,difficulty:1},
    lunge:           {name:'Lunge',             group:'lower',     type:'repetition',weightFactor:0.80,difficulty:1},
    step_up:         {name:'Step-up',           group:'lower',     type:'repetition',weightFactor:0.75,difficulty:1},
    jump_squat:      {name:'Jump Squat',        group:'lower',     type:'repetition',weightFactor:0.80,difficulty:2},
    calf_raise:      {name:'Calf Raise',        group:'lower',     type:'repetition',weightFactor:0.70,difficulty:1},
    box_jump:        {name:'Box Jump',          group:'lower',     type:'repetition',weightFactor:0.85,difficulty:2},
    run:             {name:'วิ่ง',               group:'cardio',   type:'distance',  weightFactor:1.00,difficulty:1},
    burpee:          {name:'Burpee',            group:'cardio',    type:'repetition',weightFactor:0.80,difficulty:2},
    interval_400m:   {name:'400m Interval',     group:'cardio',    type:'interval',  weightFactor:1.00,difficulty:3},
  };

  const VOLUME_LANDMARKS={
    upper_push:{mev:6,mav:16,mrv:22},upper_pull:{mev:6,mav:14,mrv:20},
    lower:{mev:8,mav:18,mrv:26},core:{mev:6,mav:16,mrv:22},cardio:{mev:2,mav:4,mrv:7},
  };

  const PROGRAM_RULES={
    military:    {label:'ทหาร / Tactical Athlete',      repRange:{min:15,max:25},setRange:{min:3,max:5},restSec:{min:30,max:90}, rm1Pct:0.60,weeklyDays:{beginner:5,intermediate:6,advanced:6}},
    hypertrophy: {label:'นักกล้าม / Hypertrophy',        repRange:{min:6, max:15},setRange:{min:3,max:5},restSec:{min:60,max:180},rm1Pct:0.75,weeklyDays:{beginner:3,intermediate:4,advanced:6}},
    athlete:     {label:'นักกีฬา / Sport Performance',  repRange:{min:3, max:12},setRange:{min:3,max:5},restSec:{min:90,max:300},rm1Pct:0.85,weeklyDays:{beginner:4,intermediate:5,advanced:6}},
    general:     {label:'ผู้ฝึกทั่วไป / General Fitness',repRange:{min:10,max:20},setRange:{min:2,max:4},restSec:{min:45,max:120},rm1Pct:0.65,weeklyDays:{beginner:3,intermediate:4,advanced:5}},
  };

  /* ── PROGRAM GENERATOR ──────────────────────────────────── */
  function buildDayPlan(goal,split,level,week,opts={}) {
    const{readiness=70,injuredParts=[]}=opts;
    const rules=PROGRAM_RULES[goal]||PROGRAM_RULES.general;
    const vm=Periodization.getVolumeMultiplier(week);
    const ph=Periodization.getPhase(week);
    const ar=HRV.autoRegulate(readiness);
    const splitMap={
      push:['pushup','diamond_pushup','pike_pushup','archer_pushup','dip'],
      pull:['pullup','chinup','inverted_row','hanging_knee'],
      lower:['squat','lunge','step_up','jump_squat','calf_raise'],
      core:['plank','situp','leg_raise','mountain_climber','dead_bug'],
      cardio:['run','burpee','interval_400m'],
      fullbody:['pushup','pullup','squat','plank','run','burpee'],
    };
    const maxD=level==='beginner'?1:level==='intermediate'?2:3;
    const pool=(splitMap[split]||splitMap.fullbody).filter(k=>EXERCISE_DB[k]?.difficulty<=maxD);
    const baseReps=Math.round((rules.repRange.min+rules.repRange.max)/2);
    const scaledReps=Math.max(3,Math.round(baseReps*vm*ph.volumeAdj*ar.volMult));
    const sets=Math.min(rules.setRange.max,Math.round(rules.setRange.min*(level==='beginner'?1:level==='intermediate'?1.2:1.5)));
    const rest=Math.round(((rules.restSec.min+rules.restSec.max)/2)/ar.intMult);
    let exercises=pool.slice(0,5).map(k=>{
      const ex=EXERCISE_DB[k];
      if(ex.type==='timed')    return{...ex,sets,duration:Math.max(10,Math.round(30*vm*ar.volMult)),rest,phase:ph.phase};
      if(ex.type==='distance') return{...ex,sets:1,distance:Math.round((goal==='military'?3000:2000)*vm*ar.volMult/100)*100,rest:0,phase:ph.phase};
      return{...ex,sets,reps:scaledReps,rest,phase:ph.phase};
    });
    if(injuredParts.length) exercises=InjurySubstitution.filterProgram(exercises,injuredParts);
    return exercises;
  }

  function buildWeeklyPlan(cfg={}) {
    const{goal='military',level='beginner',week=1,readiness=70,injuredParts=[]}=cfg;
    const rules=PROGRAM_RULES[goal]||PROGRAM_RULES.general;
    const totalDays=cfg.days||rules.weeklyDays[level]||4;
    const ph=Periodization.getPhase(week);
    const vm=Periodization.getVolumeMultiplier(week);
    const schedules={
      military:   {3:['fullbody','cardio','fullbody'],5:['push','cardio','pull','lower','fullbody'],6:['push','cardio','pull','lower','core','cardio']},
      hypertrophy:{3:['push','pull','lower'],4:['push','pull','lower','fullbody'],6:['push','pull','lower','push','pull','lower']},
      athlete:    {4:['lower','push','cardio','fullbody'],5:['lower','push','cardio','pull','fullbody'],6:['lower','push','cardio','pull','lower','cardio']},
      general:    {3:['fullbody','cardio','fullbody'],4:['push','lower','pull','cardio'],5:['push','lower','pull','core','cardio']},
    };
    const gs=schedules[goal]||schedules.general;
    const cnt=Object.keys(gs).map(Number).sort((a,b)=>a-b).reduce((p,c)=>Math.abs(c-totalDays)<Math.abs(p-totalDays)?c:p);
    const ss=gs[cnt];
    const DN=['จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์','อาทิตย์'];
    const trainingDays=ss.map((split,i)=>({day:DN[i],focus:split.charAt(0).toUpperCase()+split.slice(1),split,isRest:false,phase:ph.phase,volMult:Math.round(vm*100)+'%',exercises:buildDayPlan(goal,split,level,week,{readiness,injuredParts})}));
    const restDays=Array.from({length:7-ss.length},(_,i)=>({day:DN[ss.length+i],focus:'REST',split:'rest',isRest:true,exercises:[]}));
    return{goal,level,week,phase:ph.phase,phaseNote:ph.focus,volumeMultiplier:Math.round(vm*100)+'%',totalTrainingDays:ss.length,readiness,days:[...trainingDays,...restDays]};
  }

  function buildFullProgram(cfg={}) {
    const{goal='military',level='beginner',readiness=70,injuredParts=[]}=cfg;
    const totalWeeks=goal==='general'?8:12;
    const weeks=Array.from({length:totalWeeks},(_,i)=>buildWeeklyPlan({...cfg,week:i+1}));
    return{goal,goalLabel:PROGRAM_RULES[goal]?.label||goal,level,totalWeeks,weeks,readiness,generatedAt:new Date().toISOString(),source:'Exercise Science Vol.1 & Vol.2 — Rule Engine v2.0 (Offline)'};
  }

  /* ── DAILY RECOMMENDATION ───────────────────────────────── */
  function getDailyRecommendation(state) {
    const{sleepHours:sl=7,fatigueIndex:fi=40,consecutiveHardWeeks:hw=0,goal='military',level='beginner',currentWeek:cw=1,hrv=null,rpe_yesterday:ry=5,soreness:so=2,injuredParts:ip=[]}=state;
    const readiness=AutoRegulation.calcReadiness({sleepHours:sl,hrv,fatigueIndex:fi,rpe_yesterday:ry,soreness:so});
    const fatigue=Assessment.classifyFatigue(fi);
    const deload=Periodization.shouldDeload(hw,fi,0);
    const phase=Periodization.getPhase(cw);
    const vm=Periodization.getVolumeMultiplier(cw);
    const warns=[];
    if(sl<7)   warns.push('⚠️ นอน <7h — MPS ลด 18–25%');
    if(fi>76)  warns.push('🔴 Fatigue สูง — Deload ทันที');
    if(hw>=3)  warns.push('⚠️ ฝึกหนัก 3+ สัปดาห์ — Overreaching Risk');
    if(ip.length) warns.push(`🩹 บาดเจ็บ: ${ip.join(', ')} — โปรแกรมถูกปรับแล้ว`);
    if(readiness.score<40) warns.push('🔴 Readiness ต่ำมาก — Active Recovery เท่านั้น');
    return{readiness,fatigue,shouldDeload:deload,phase:phase.phase,phaseNote:phase.focus,volumeMultiplier:Math.round(vm*100)+'%',warnings:warns,recommendation:deload?'Deload — ลด Volume 40%':fatigue.action,explain:readiness.explain};
  }

  /* ── PUBLIC API ─────────────────────────────────────────── */
  return{
    Formulas, RPE, HRV, PlateauDetector, InjurySubstitution, VBT, WaveLoading,
    Assessment, Periodization, Nutrition, AutoRegulation,
    EXERCISE_DB, VOLUME_LANDMARKS, PROGRAM_RULES,
    buildDayPlan, buildWeeklyPlan, buildFullProgram,
    getDailyRecommendation, ExplainChain,
  };
})();

if (typeof module !== 'undefined') module.exports = ExerciseScienceRules;
