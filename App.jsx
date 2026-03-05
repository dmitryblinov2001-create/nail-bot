import { useState, useEffect, useCallback, useRef } from "react";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:3001";

async function api(method, path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Request failed", status: res.status, ...data };
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

// ─── TELEGRAM SDK HELPERS ─────────────────────────────────────────────────────
const tg = typeof window !== "undefined" && window.Telegram?.WebApp;

function getTgUser() {
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    return {
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Пользователь",
      tg:   u.username ? `@${u.username}` : `tg_${u.id}`,
    };
  }
  return { name: "Иван Иванов", tg: "@username" }; // dev fallback
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&family=Playfair+Display:ital@1&display=swap');

  :root {
    --green: #22c55e;
    --green-dim: #16a34a;
    --green-bg: #f0fdf4;
    --green-border: #bbf7d0;
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: #f2f2f2; }

  .grain::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-size: 180px 180px; opacity: 0.055; mix-blend-mode: overlay; z-index: 1;
  }
  .grain > * { position: relative; z-index: 2; }

  .dot-grid {
    background-image: radial-gradient(circle, #d4d4d4 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .badge-green {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--green-bg); border: 1px solid var(--green-border);
    color: var(--green-dim); border-radius: 20px;
    padding: 3px 10px; font-size: 11px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .pressable { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s ease, background 0.15s ease, border-color 0.15s ease; user-select: none; -webkit-user-select: none; }
  .tile-cta { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
  .tile-cta:hover { background: #22c55e !important; box-shadow: 0 6px 28px rgba(34,197,94,0.5) !important; }
  .tile-cta:hover .cta-icon { stroke: #fff !important; }
  .tile-cta:hover .cta-arrow-box { background: #fff !important; }
  .tile-cta:hover .cta-arrow-svg { stroke: #22c55e !important; }
  .tile-cta:hover .cta-label { color: #fff !important; }
  .tile-cta:active { transform: scale(0.97) !important; background: #16a34a !important; box-shadow: none !important; }

  .tile-light { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
  .tile-light:hover { background: #f7f7f7 !important; border-color: #d0d0d0 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.07) !important; }
  .tile-light:active { transform: scale(0.96) !important; background: #efefef !important; }

  .btn-primary { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
  .btn-primary:not(:disabled):hover { background: #222 !important; box-shadow: 0 4px 18px rgba(0,0,0,0.22) !important; }
  .btn-primary:not(:disabled):active { transform: scale(0.97) !important; background: #000 !important; box-shadow: none !important; }
  .btn-primary:disabled { opacity: 0.35; cursor: not-allowed !important; }

  .btn-secondary { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1), background 0.15s ease, border-color 0.15s ease; }
  .btn-secondary:hover { background: #f5f5f5 !important; border-color: #ccc !important; }
  .btn-secondary:active { transform: scale(0.97) !important; }

  .service-row { transition: background 0.12s ease; cursor: pointer; }
  .service-row:hover { background: #fafafa !important; }
  .service-row:active { background: #f2f2f2 !important; }
  .service-row-selected:hover { background: #111 !important; }
  .service-row-selected:active { background: #000 !important; }

  .master-card { transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
  .master-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.09) !important; transform: translateY(-1px); }
  .master-card:active { transform: scale(0.98) translateY(0) !important; }

  .time-slot { transition: background 0.1s ease, border-color 0.1s ease, transform 0.1s cubic-bezier(0.34,1.56,0.64,1), color 0.1s ease; }
  .time-slot.avail:hover { background: #f0fdf4 !important; border-color: #bbf7d0 !important; color: #16a34a !important; }
  .time-slot.avail:active { transform: scale(0.93) !important; }

  .filter-pill { transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease; cursor: pointer; }
  .filter-pill:active { transform: scale(0.93); }

  .back-btn { transition: background 0.12s ease, transform 0.1s ease; border-radius: 50%; }
  .back-btn:hover { background: #f0f0f0 !important; }
  .back-btn:active { transform: scale(0.88) !important; }

  .nav-tab { transition: transform 0.1s ease; }
  .nav-tab:active { transform: scale(0.88) !important; }

  .portfolio-img { transition: transform 0.2s ease, filter 0.2s ease; cursor: zoom-in; }
  .portfolio-img:hover { transform: scale(1.02); filter: brightness(0.94); }
  .portfolio-img:active { transform: scale(0.99); }

  .cancel-btn { transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.1s ease; }
  .cancel-btn:hover { background: #fff3f3 !important; border-color: #ffaaaa !important; color: #c00 !important; }
  .cancel-btn:active { transform: scale(0.95) !important; }

  .page-enter { animation: pageEnter 0.22s cubic-bezier(0.22,1,0.36,1) forwards; }
  @keyframes pageEnter { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

  .reveal { opacity:0; transform:translateY(18px); transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1); }
  .reveal.visible { opacity:1; transform:translateY(0); }

  .hub-cta-glow { animation: ctaGlow 3s ease-in-out infinite; }
  @keyframes ctaGlow { 0%,100% { box-shadow:0 2px 12px rgba(0,0,0,0.18); } 50% { box-shadow:0 6px 32px rgba(34,197,94,0.25), 0 2px 12px rgba(0,0,0,0.14); } }

  .particle { position:absolute; border-radius:50%; pointer-events:none; }
  .particle-1 { width:3px; height:3px; background:rgba(34,197,94,0.6); top:18%; left:15%; animation: floatA 6s ease-in-out infinite; }
  .particle-2 { width:2px; height:2px; background:rgba(255,255,255,0.4); top:55%; left:75%; animation: floatB 8s ease-in-out infinite; }
  .particle-3 { width:4px; height:4px; background:rgba(34,197,94,0.35); top:70%; left:30%; animation: floatA 7s ease-in-out infinite 1s; }
  .particle-4 { width:2px; height:2px; background:rgba(255,255,255,0.3); top:35%; right:20%; animation: floatB 5s ease-in-out infinite 0.5s; }
  .particle-5 { width:3px; height:3px; background:rgba(34,197,94,0.45); top:82%; right:25%; animation: floatA 9s ease-in-out infinite 2s; }
  @keyframes floatA { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(-10px) translateX(4px)} 66%{transform:translateY(5px) translateX(-3px)} }
  @keyframes floatB { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-14px) translateX(6px)} }

  .slot-ticker { animation: tickerPulse 2.5s ease-in-out infinite; }
  @keyframes tickerPulse { 0%,100%{opacity:1} 50%{opacity:0.7} }

  .checkmark-pop { animation: checkPop 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  @keyframes checkPop { from { transform:scale(0) rotate(-20deg); opacity:0; } to { transform:scale(1) rotate(0); opacity:1; } }

  .online-dot { animation: onlinePulse 2.4s ease-in-out infinite; }
  @keyframes onlinePulse { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.55); } 60% { box-shadow:0 0 0 5px rgba(34,197,94,0); } }

  .marquee-track { display:flex; gap:32px; animation: marquee 18s linear infinite; white-space:nowrap; }
  @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

  ::-webkit-scrollbar { display: none; }
  scrollbar-width: none;

  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .spinner { animation: spin 0.8s linear infinite; }
`;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  brand: { name: "Nail Studio", tagline: "Красота в деталях", phone: "+7 900 000-00-00", address: "ул. Примерная, 1", instagram: "@nail_studio", since: "2019" },
  services: [
    { id: "1", category: "Маникюр", name: "Классический маникюр", duration: 60, price: 1500, description: "Обработка кутикулы, придание формы, покрытие" },
    { id: "2", category: "Маникюр", name: "Аппаратный маникюр", duration: 75, price: 2000, description: "Аппаратная обработка + покрытие гель-лак" },
    { id: "3", category: "Педикюр", name: "Классический педикюр", duration: 90, price: 2500, description: "Полная обработка стоп и ногтей" },
    { id: "4", category: "Педикюр", name: "СПА-педикюр", duration: 120, price: 3500, description: "Педикюр + маска + массаж стоп" },
    { id: "5", category: "Дизайн", name: "Nail Art (1 ноготь)", duration: 30, price: 300, description: "Художественный дизайн на 1 ноготь" },
    { id: "6", category: "Дизайн", name: "Nail Art (все ногти)", duration: 90, price: 2000, description: "Полный дизайн всех ногтей" },
  ],
  masters: [
    { id: "1", name: "Анна", role: "Мастер маникюра", photo: "https://i.pravatar.cc/200?img=47", experience: "5 лет опыта", serviceIds: ["1","2","5","6"] },
    { id: "2", name: "Мария", role: "Маникюр и педикюр", photo: "https://i.pravatar.cc/200?img=44", experience: "3 года опыта", serviceIds: ["1","2","3","4","5","6"] },
    { id: "3", name: "Ольга", role: "Мастер педикюра", photo: "https://i.pravatar.cc/200?img=49", experience: "7 лет опыта", serviceIds: ["3","4"] },
  ],
  portfolio: [
    { id:"1", photo:"https://picsum.photos/400/500?random=1", category:"Маникюр" },
    { id:"2", photo:"https://picsum.photos/400/350?random=2", category:"Педикюр" },
    { id:"3", photo:"https://picsum.photos/400/450?random=3", category:"Дизайн" },
    { id:"4", photo:"https://picsum.photos/400/400?random=4", category:"Маникюр" },
    { id:"5", photo:"https://picsum.photos/400/550?random=5", category:"Дизайн" },
    { id:"6", photo:"https://picsum.photos/400/380?random=6", category:"Маникюр" },
    { id:"7", photo:"https://picsum.photos/400/460?random=7", category:"Педикюр" },
    { id:"8", photo:"https://picsum.photos/400/420?random=8", category:"Дизайн" },
  ],
  schedule: { workDays:[1,2,3,4,5,6], workHours:{ start:10, end:20 }, slotDuration:30, bookingHorizon:30 },
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (p) => new Intl.NumberFormat("ru-RU").format(p) + " ₽";
const getDates = (n=30) => Array.from({length:n},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()+i); return d; });
const getSlots = (s,e,step) => { const r=[]; for(let h=s;h<e;h++) for(let m=0;m<60;m+=step) r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); return r; };
const DAY = ["вс","пн","вт","ср","чт","пт","сб"];
const MON = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const toDateStr = (d) => d instanceof Date ? d.toISOString().slice(0,10) : d;

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useReveal();
  return <div ref={ref} className="reveal" style={{ transitionDelay:`${delay}ms`, ...style }}>{children}</div>;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Page({ children }) { return <div className="page-enter" style={{ minHeight:"100%" }}>{children}</div>; }

function PageHeader({ title, onBack }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 16px 12px", borderBottom:"1px solid #f0f0f0", gap:4 }}>
      {onBack && (
        <button className="back-btn" onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:6, display:"flex", alignItems:"center", color:"#111", marginLeft:-6, marginRight:2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:600, color:"#111" }}>{title}</span>
    </div>
  );
}

function Spinner() {
  return <div className="spinner" style={{ width:20,height:20,border:"2px solid #e8e8e8",borderTopColor:"#111",borderRadius:"50%" }}/>;
}

function BottomNav({ active, onNavigate, onMasterPanel }) {
  const tabs = [
    { id:"hub", label:"Главная", icon:(on)=><svg width="22" height="22" viewBox="0 0 24 24" fill={on?"#111":"none"} stroke={on?"#111":"#bbb"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:"services", label:"Услуги", icon:(on)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#111":"#bbb"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { id:"portfolio", label:"Работы", icon:(on)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#111":"#bbb"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { id:"my-bookings", label:"Записи", icon:(on)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#111":"#bbb"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)", borderTop:"1px solid #efefef", display:"flex", flexDirection:"column", paddingBottom:"env(safe-area-inset-bottom,6px)", zIndex:100 }}>
      <div style={{ display:"flex" }}>
        {tabs.map(t=>(
          <button key={t.id} className="nav-tab" onClick={()=>onNavigate(t.id)}
            style={{ flex:1, border:"none", background:"none", cursor:"pointer", padding:"10px 4px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            {t.icon(active===t.id)}
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:active===t.id?600:400, color:active===t.id?"#111":"#bbb" }}>{t.label}</span>
            {active===t.id && <div style={{ width:4, height:4, borderRadius:"50%", background:"#22c55e" }}/>}
          </button>
        ))}
      </div>
      <button onClick={onMasterPanel} style={{ margin:"0 16px 8px", padding:"8px 0", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#ccc", letterSpacing:0.3 }}>для мастеров</span>
      </button>
    </div>
  );
}

function BookingProgress({ step }) {
  const labels = ["Услуга","Мастер","Время","Итог"];
  return (
    <div style={{ padding:"12px 16px 14px", borderBottom:"1px solid #f0f0f0" }}>
      <div style={{ display:"flex", gap:5, marginBottom:8 }}>
        {[1,2,3,4].map(s=>(
          <div key={s} style={{ flex:1, height:3, borderRadius:4, background: s<step?"#22c55e":s===step?"#111":"#e8e8e8", transition:"background 0.4s ease" }}/>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {labels.map((l,i)=>(
          <span key={l} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:i+1<step?"#22c55e":i+1===step?"#111":"#ddd", fontWeight:i+1===step?600:400, transition:"color 0.3s" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function StickyButton({ label, onClick, disabled, loading }) {
  return (
    <div style={{ position:"fixed", bottom:"env(safe-area-inset-bottom,0px)", left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, padding:"10px 16px 12px", background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)", borderTop:"1px solid #f0f0f0", zIndex:50 }}>
      <button className="btn-primary" disabled={disabled||loading} onClick={onClick}
        style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background:"#111", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, cursor:(disabled||loading)?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {loading ? <><Spinner/> Загрузка…</> : label}
      </button>
    </div>
  );
}

// ─── HUB PAGE ─────────────────────────────────────────────────────────────────
function HubPage({ onNavigate, onShowBlocked }) {
  const now = new Date();
  const nextHour = now.getHours() >= 19 ? "10:00 завтра" : `${String(now.getHours() + 1).padStart(2,"0")}:00 сегодня`;
  return (
    <Page>
      <div className="grain" style={{ position:"relative", overflow:"hidden", background:"#111", padding:"44px 24px 36px" }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.035)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-80, left:-40, width:260, height:260, borderRadius:"50%", background:"rgba(255,255,255,0.025)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:"20%", right:"-5%", width:140, height:140, borderRadius:"50%", background:"rgba(34,197,94,0.12)", filter:"blur(32px)", pointerEvents:"none" }}/>
        <div className="particle particle-1"/><div className="particle particle-2"/>
        <div className="particle particle-3"/><div className="particle particle-4"/>
        <div className="particle particle-5"/>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <div style={{ width:40, height:40, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8 2 5 5 5 9c0 2.5 1.2 4.7 3 6.1V18h8v-2.9c1.8-1.4 3-3.6 3-6.1 0-4-3-7-7-7z"/>
              <path d="M9 18v2a1 1 0 001 1h4a1 1 0 001-1v-2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#fff" }}>{CONFIG.brand.name}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:0.5 }}>с {CONFIG.brand.since} года</div>
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:34, fontStyle:"italic", color:"#fff", lineHeight:1.15, marginBottom:8 }}>{CONFIG.brand.tagline}</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>{CONFIG.masters.length} мастера · {CONFIG.services.length} услуг · онлайн-запись</div>
        </div>
        <div className="slot-ticker" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"8px 12px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0 }}/>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.7)" }}>Ближайший слот —</span>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700, color:"#4ade80" }}>{nextHour}</span>
        </div>
        <button className="tile-cta hub-cta-glow pressable" onClick={()=>onNavigate("booking")}
          style={{ width:"100%", background:"#fff", border:"none", borderRadius:16, padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <svg className="cta-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/></svg>
            <span className="cta-label" style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#111" }}>Записаться онлайн</span>
          </div>
          <div className="cta-arrow-box" style={{ width:30, height:30, background:"#f5f5f5", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg className="cta-arrow-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </button>
      </div>

      <Reveal delay={60}>
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <button className="tile-light" onClick={()=>onNavigate("services")} style={{ background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:"16px 14px", cursor:"pointer", textAlign:"left", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", flexDirection:"column" }}>
              <div style={{ width:36, height:36, background:"#f5f5f5", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#111" }}>Услуги</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#aaa", marginTop:2 }}>{CONFIG.services.length} позиции</div>
            </button>
            <button className="tile-light" onClick={()=>onNavigate("portfolio")} style={{ background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:"16px 14px", cursor:"pointer", textAlign:"left", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", flexDirection:"column" }}>
              <div style={{ width:36, height:36, background:"#f5f5f5", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#111" }}>Портфолио</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#aaa", marginTop:2 }}>{CONFIG.portfolio.length} работ</div>
            </button>
            <button className="tile-light" onClick={()=>onNavigate("my-bookings")} style={{ gridColumn:"1 / -1", background:"#fff", border:"1px solid #ebebeb", borderRadius:16, padding:"14px 16px", cursor:"pointer", textAlign:"left", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:"#111" }}>Мои записи</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#aaa", marginTop:1 }}>История и статус</div>
              </div>
              <svg style={{ marginLeft:"auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="dot-grid" style={{ padding:"20px 16px 0", background:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#bbb", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>Наши мастера</div>
            <span className="badge-green"><span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block" }}/>онлайн</span>
          </div>
          <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:16 }}>
            {CONFIG.masters.map(m=>(
              <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                <div style={{ position:"relative" }}>
                  <img src={m.photo} alt={m.name} style={{ width:58, height:58, borderRadius:"50%", objectFit:"cover", border:"2px solid #f0f0f0" }}/>
                  <div className="online-dot" style={{ position:"absolute", bottom:1, right:1, width:14, height:14, background:"#22c55e", borderRadius:"50%", border:"2.5px solid #fff" }}/>
                </div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color:"#333", textAlign:"center" }}>{m.name}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:"#bbb", textAlign:"center", maxWidth:64, lineHeight:1.3 }}>{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={160} style={{ background:"#fff" }}>
        <div style={{ overflow:"hidden", margin:"20px 0 0", borderTop:"1px solid #f5f5f5", borderBottom:"1px solid #f5f5f5", padding:"10px 0", background:"#fafafa" }}>
          <div className="marquee-track">
            {[...Array(2)].map((_,r)=>(
              <div key={r} style={{ display:"flex", gap:32, flexShrink:0 }}>
                {["Маникюр","Педикюр","Nail Art","Гель-лак","СПА","Дизайн","Покрытие","Уход"].map(w=>(
                  <span key={w} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#bbb", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:4,height:4,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0 }}/>{w}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={200} style={{ background:"#fff" }}>
        <div style={{ padding:"16px 16px 120px" }}>
          <div style={{ background:"#fafafa", border:"1px solid #f0f0f0", borderRadius:14, padding:"14px 16px", display:"flex", flexDirection:"column", gap:9 }}>
            {[
              { t:CONFIG.brand.address, icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
              { t:CONFIG.brand.phone,   icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.9 1.17 2 2 0 012.88 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> },
              { t:CONFIG.brand.instagram, icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
            ].map(({t,icon})=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{icon}</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#555" }}>{t}</span>
              </div>
            ))}
          </div>
          {onShowBlocked && (
            <button onClick={onShowBlocked} style={{ marginTop:12,width:"100%",padding:"10px",borderRadius:12,border:"1px dashed #fecaca",background:"#fff8f8",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#ef4444",cursor:"pointer",fontWeight:600 }}>
              🚫 Demo: показать экран блокировки клиента
            </button>
          )}
        </div>
      </Reveal>
    </Page>
  );
}

// ─── SERVICES PAGE ────────────────────────────────────────────────────────────
function ServicesPage({ onBack, onNavigate }) {
  const [expandedId, setExpandedId] = useState(null);
  const categories = [...new Set(CONFIG.services.map(s=>s.category))];
  return (
    <Page>
      <PageHeader title="Услуги и цены" onBack={onBack}/>
      <div style={{ padding:"4px 0 100px" }}>
        {categories.map(cat=>(
          <div key={cat}>
            <div style={{ padding:"14px 16px 6px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:"#22c55e", letterSpacing:1, textTransform:"uppercase" }}>{cat}</span>
              <div style={{ flex:1, height:1, background:"linear-gradient(to right, #bbf7d0, #f0f0f0)" }}/>
            </div>
            {CONFIG.services.filter(s=>s.category===cat).map(s=>(
              <div key={s.id} className="service-row" onClick={()=>setExpandedId(expandedId===s.id?null:s.id)}
                style={{ padding:"13px 16px", borderBottom:"1px solid #f8f8f8", background:expandedId===s.id?"#fafafa":"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ flex:1, paddingRight:12 }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:"#111" }}>{s.name}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#bbb", marginTop:2 }}>{s.duration} мин</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#111" }}>от {fmt(s.price)}</span>
                    <svg style={{ transform:expandedId===s.id?"rotate(180deg)":"none", transition:"transform 0.2s ease", color:"#bbb" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                {expandedId===s.id&&(
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f0f0f0" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#666", marginBottom:12, lineHeight:1.5 }}>{s.description}</div>
                    <button className="btn-primary" onClick={e=>{e.stopPropagation();onNavigate("booking",{preselectedService:s});}}
                      style={{ background:"#111", color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Записаться →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Page>
  );
}

// ─── PORTFOLIO PAGE ───────────────────────────────────────────────────────────
function PortfolioPage({ onBack }) {
  const [fsIdx, setFsIdx] = useState(null);
  const [filter, setFilter] = useState("Все");
  const categories = ["Все",...new Set(CONFIG.portfolio.map(p=>p.category))];
  const filtered = filter==="Все"?CONFIG.portfolio:CONFIG.portfolio.filter(p=>p.category===filter);
  const left = filtered.filter((_,i)=>i%2===0);
  const right = filtered.filter((_,i)=>i%2===1);
  useEffect(()=>{
    if(fsIdx===null) return;
    const h=(e)=>{ if(e.key==="ArrowRight") setFsIdx(i=>Math.min(i+1,filtered.length-1)); if(e.key==="ArrowLeft") setFsIdx(i=>Math.max(i-1,0)); if(e.key==="Escape") setFsIdx(null); };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[fsIdx,filtered.length]);
  return (
    <Page>
      <PageHeader title="Работы" onBack={onBack}/>
      <div style={{ display:"flex", gap:8, padding:"12px 16px", overflowX:"auto" }}>
        {categories.map(c=>(
          <button key={c} className="filter-pill" onClick={()=>setFilter(c)}
            style={{ background:filter===c?"#111":"#f5f5f5", color:filter===c?"#fff":"#666", border:"none", borderRadius:20, padding:"7px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, whiteSpace:"nowrap" }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, padding:"0 10px 100px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {left.map(p=><img key={p.id} src={p.photo} alt="" className="portfolio-img" onClick={()=>setFsIdx(filtered.findIndex(x=>x.id===p.id))} style={{ width:"100%", borderRadius:10, display:"block" }}/>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:24 }}>
          {right.map(p=><img key={p.id} src={p.photo} alt="" className="portfolio-img" onClick={()=>setFsIdx(filtered.findIndex(x=>x.id===p.id))} style={{ width:"100%", borderRadius:10, display:"block" }}/>)}
        </div>
      </div>
      {fsIdx!==null&&(
        <div onClick={()=>setFsIdx(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.94)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <img src={filtered[fsIdx]?.photo} alt="" style={{ maxWidth:"95%", maxHeight:"80dvh", borderRadius:12, objectFit:"contain" }} onClick={e=>e.stopPropagation()}/>
          <div style={{ display:"flex", gap:20, marginTop:20 }} onClick={e=>e.stopPropagation()}>
            <button className="btn-secondary" onClick={()=>setFsIdx(i=>Math.max(i-1,0))} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", borderRadius:10, padding:"10px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer", opacity:fsIdx===0?0.3:1 }}>← Назад</button>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.5)", alignSelf:"center" }}>{fsIdx+1} / {filtered.length}</span>
            <button className="btn-secondary" onClick={()=>setFsIdx(i=>Math.min(i+1,filtered.length-1))} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", borderRadius:10, padding:"10px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer", opacity:fsIdx===filtered.length-1?0.3:1 }}>Далее →</button>
          </div>
        </div>
      )}
    </Page>
  );
}

// ─── BOOKING STEP 1 ───────────────────────────────────────────────────────────
function BookingPage({ onBack, onNext, initial }) {
  const [selected, setSelected] = useState(initial?.preselectedService||null);
  const categories = [...new Set(CONFIG.services.map(s=>s.category))];
  return (
    <Page>
      <PageHeader title="Запись" onBack={onBack}/>
      <BookingProgress step={1}/>
      <div style={{ padding:"4px 0 100px" }}>
        {categories.map(cat=>(
          <div key={cat}>
            <div style={{ padding:"14px 16px 6px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:600, color:"#bbb", letterSpacing:1, textTransform:"uppercase" }}>{cat}</span>
              <div style={{ flex:1, height:1, background:"#f0f0f0" }}/>
            </div>
            {CONFIG.services.filter(s=>s.category===cat).map(s=>{
              const on=selected?.id===s.id;
              return (
                <div key={s.id} className={`service-row${on?" service-row-selected":""}`} onClick={()=>setSelected(s)}
                  style={{ padding:"13px 16px", borderBottom:"1px solid #f8f8f8", background:on?"#111":"#fff", transition:"background 0.15s ease" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:on?"#fff":"#111" }}>{s.name}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:on?"rgba(255,255,255,0.45)":"#bbb", marginTop:2 }}>{s.duration} мин</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:on?"#fff":"#111" }}>от {fmt(s.price)}</span>
                      {on&&<div style={{ width:22,height:22,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <StickyButton label="Далее →" disabled={!selected} onClick={()=>selected&&onNext(selected)}/>
    </Page>
  );
}

// ─── BOOKING STEP 2 ───────────────────────────────────────────────────────────
function MasterPage({ service, onBack, onNext }) {
  const [selected, setSelected] = useState(null);
  const masters = CONFIG.masters.filter(m=>m.serviceIds.includes(service.id));
  return (
    <Page>
      <PageHeader title="Выбор мастера" onBack={onBack}/>
      <BookingProgress step={2}/>
      <div style={{ padding:"16px 16px 100px" }}>
        <div style={{ background:"#f7f7f7", borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#888" }}>Услуга:</span>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, color:"#111" }}>{service.name}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {masters.map(m=>{
            const on=selected?.id===m.id;
            return (
              <div key={m.id} className="master-card" onClick={()=>setSelected(m)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px", border:on?"2px solid #111":"1px solid #e8e8e8", borderRadius:16, background:"#fff" }}>
                <div style={{ position:"relative", flexShrink:0 }}>
                  <img src={m.photo} alt={m.name} style={{ width:58,height:58,borderRadius:"50%",objectFit:"cover" }}/>
                  <div className="online-dot" style={{ position:"absolute", bottom:1, right:1, width:14,height:14,background:"#22c55e",borderRadius:"50%",border:"2.5px solid #fff" }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, color:"#111" }}>{m.name}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#888", marginTop:1 }}>{m.role}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"#bbb", marginTop:2 }}>{m.experience}</div>
                </div>
                <div style={{ width:26,height:26,borderRadius:"50%",background:on?"#111":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s ease",flexShrink:0 }}>
                  {on&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <StickyButton label="Далее →" disabled={!selected} onClick={()=>selected&&onNext(selected)}/>
    </Page>
  );
}

// ─── BOOKING STEP 3 — FIXED: loads real slots from API ────────────────────────
function DateTimePage({ service, master, onBack, onNext, closedDays=new Set() }) {
  const dates = getDates(CONFIG.schedule.bookingHorizon);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slotsData, setSlotsData] = useState({ allSlots:[], bookedSlots:[] });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const dateKey = d => d.toISOString().slice(0,10);
  const isWorkDay = d => CONFIG.schedule.workDays.includes(d.getDay()) && !closedDays.has(dateKey(d));

  useEffect(()=>{ const f=dates.find(isWorkDay); if(f) setSelectedDate(f); },[]);

  // Load real slots from API when date or master changes
  useEffect(()=>{
    if(!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    api("GET", `/api/bookings/slots?masterId=${master.id}&dateStr=${dateKey(selectedDate)}`)
      .then(data => {
        if(data.allSlots) setSlotsData(data);
        else setSlotsData({ allSlots: getSlots(CONFIG.schedule.workHours.start, CONFIG.schedule.workHours.end, CONFIG.schedule.slotDuration), bookedSlots: [] });
      })
      .finally(()=>setLoadingSlots(false));
  },[selectedDate, master.id]);

  const isClosed = selectedDate && closedDays.has(dateKey(selectedDate));
  const bookedSet = new Set(slotsData.bookedSlots);

  return (
    <Page>
      <PageHeader title="Дата и время" onBack={onBack}/>
      <BookingProgress step={3}/>
      <div style={{ display:"flex", gap:8, padding:"12px 14px", overflowX:"auto", borderBottom:"1px solid #f0f0f0" }}>
        {dates.map(d=>{
          const isWork=isWorkDay(d);
          const isSel=selectedDate?.toDateString()===d.toDateString();
          return (
            <div key={d.toISOString()} className={isWork?"pressable":""} onClick={()=>isWork&&(setSelectedDate(d))}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"9px 10px",borderRadius:12,cursor:isWork?"pointer":"default",minWidth:46,background:isSel?"#111":isWork?"#f7f7f7":"transparent",opacity:isWork?1:0.28,flexShrink:0,border:isSel?"none":"1px solid transparent" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,color:isSel?"rgba(255,255,255,0.5)":"#bbb" }}>{DAY[d.getDay()]}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:17,fontWeight:700,color:isSel?"#fff":"#111",margin:"2px 0" }}>{d.getDate()}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,color:isSel?"rgba(255,255,255,0.5)":"#bbb" }}>{MON[d.getMonth()]}</span>
            </div>
          );
        })}
      </div>
      {selectedDate&&(
        <div style={{ padding:"16px 16px 100px" }}>
          {isClosed ? (
            <div style={{ textAlign:"center", padding:"40px 16px", background:"#fff1f0", border:"1px solid #fecaca", borderRadius:14 }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🔒</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#ef4444", marginBottom:6 }}>День закрыт</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#aaa" }}>Запись на этот день недоступна.</div>
            </div>
          ) : loadingSlots ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}><Spinner/></div>
          ) : (
            <>
              <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,color:"#888",marginBottom:12 }}>
                {DAY[selectedDate.getDay()]}, {selectedDate.getDate()} {MON[selectedDate.getMonth()]} · {slotsData.allSlots.length - slotsData.bookedSlots.length} свободных
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
                {slotsData.allSlots.map(slot=>{
                  const booked=bookedSet.has(slot);
                  const sel=selectedTime===slot;
                  return (
                    <div key={slot} className={`time-slot${booked?"":" avail"}`} onClick={()=>!booked&&setSelectedTime(slot)}
                      style={{ padding:"11px 6px",borderRadius:10,textAlign:"center",
                        background:sel?"#22c55e":booked?"#f7f7f7":"#fff",
                        border:sel?"2px solid #22c55e":booked?"1px solid #f0f0f0":"1px solid #e8e8e8",
                        cursor:booked?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
                        color:sel?"#fff":booked?"#d0d0d0":"#111" }}>
                      {slot}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      <StickyButton label="Далее →" disabled={!selectedTime || isClosed} onClick={()=>selectedTime&&!isClosed&&onNext({date:selectedDate,time:selectedTime})}/>
    </Page>
  );
}

// ─── BOOKING STEP 4 — FIXED: sends phone+comment, uses real TG user ──────────
function ConfirmPage({ booking, onBack, onConfirm }) {
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { service, master, date, time } = booking;
  const tgUser = getTgUser();

  const handleConfirm = async () => {
    setLoading(true); setError("");
    const result = await api("POST", "/api/bookings", {
      clientName:  tgUser.name,
      clientTg:    tgUser.tg,
      clientPhone: phone,
      comment,
      serviceId:   service.id,
      masterId:    master.id,
      dateStr:     toDateStr(date),
      timeStr:     time,
    });
    setLoading(false);
    if(result.error) {
      if(result.blocked) { setError("Ваш аккаунт заблокирован. Обратитесь в поддержку."); return; }
      if(result.status === 409) { setError("Этот слот уже занят. Выберите другое время."); return; }
      setError(result.error || "Ошибка. Попробуйте ещё раз.");
      return;
    }
    onConfirm({ bookingId: result.id, phone, comment });
  };

  return (
    <Page>
      <PageHeader title="Подтверждение" onBack={onBack}/>
      <BookingProgress step={4}/>
      <div style={{ padding:"16px 16px 120px" }}>
        <div style={{ background:"#111", borderRadius:18, padding:20, marginBottom:16, color:"#fff" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,letterSpacing:0.8,textTransform:"uppercase",marginBottom:14 }}>Ваша запись</div>
          {[{l:"Услуга",v:service.name},{l:"Мастер",v:master.name},{l:"Дата",v:`${DAY[date.getDay()]}, ${date.getDate()} ${MON[date.getMonth()]}`},{l:"Время",v:time},{l:"Стоимость",v:`от ${fmt(service.price)}`,g:true}].map(({l,v,g})=>(
            <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,0.45)" }}>{l}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:g?"#4ade80":"#fff" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#888",fontWeight:500,marginBottom:6 }}>Имя</div>
          <div style={{ padding:"12px 14px",background:"#f7f7f7",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#555" }}>{tgUser.name} · {tgUser.tg}</div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#888",fontWeight:500,marginBottom:6 }}>Телефон <span style={{ color:"#ccc",fontWeight:400 }}>· необязательно</span></div>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 900 000-00-00"
            style={{ width:"100%",padding:"12px 14px",border:"1px solid #e5e5e5",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#111",outline:"none",background:"#fff",transition:"border-color 0.15s",boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#888",fontWeight:500,marginBottom:6 }}>Комментарий <span style={{ color:"#ccc",fontWeight:400 }}>· необязательно</span></div>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Пожелания к мастеру..."
            style={{ width:"100%",padding:"12px 14px",border:"1px solid #e5e5e5",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#111",outline:"none",resize:"none",height:76,background:"#fff",transition:"border-color 0.15s",boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
        </div>
        {error && <div style={{ padding:"12px 14px",background:"#fff1f0",border:"1px solid #fecaca",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"#ef4444",marginBottom:12 }}>{error}</div>}
      </div>
      <StickyButton label="Подтвердить запись" onClick={handleConfirm} loading={loading}/>
    </Page>
  );
}

// ─── SUCCESS PAGE ─────────────────────────────────────────────────────────────
function SuccessPage({ booking, onNavigate }) {
  const [phase, setPhase] = useState(0);
  const { service, master, date, time } = booking;
  useEffect(()=>{ const t1=setTimeout(()=>setPhase(1),80); const t2=setTimeout(()=>setPhase(2),400); return()=>{clearTimeout(t1);clearTimeout(t2);}; },[]);
  return (
    <Page>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"70px 24px 100px",textAlign:"center" }}>
        <div className={phase>=1?"checkmark-pop":""} style={{ opacity:phase>=1?1:0,width:80,height:80,background:"#22c55e",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,boxShadow:"0 8px 32px rgba(34,197,94,0.35)" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" style={{ strokeDasharray:30,strokeDashoffset:phase>=1?0:30,transition:"stroke-dashoffset 0.45s ease 0.25s" }}/>
          </svg>
        </div>
        <div style={{ opacity:phase>=2?1:0,transform:phase>=2?"none":"translateY(8px)",transition:"all 0.35s ease" }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:26,fontStyle:"italic",color:"#111",marginBottom:6 }}>Запись подтверждена!</div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:20,padding:"4px 12px",marginBottom:20 }}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block" }}/>
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#16a34a",fontWeight:600 }}>Запись активна</span>
          </div>
          <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#888",marginBottom:28 }}>Ждём вас в нашем салоне</div>
        </div>
        <div style={{ background:"#f9f9f9",border:"1px solid #f0f0f0",borderRadius:16,padding:18,width:"100%",marginBottom:24,opacity:phase>=2?1:0,transition:"opacity 0.35s ease 0.1s",textAlign:"left" }}>
          {[{l:"Услуга",t:service.name},{l:"Мастер",t:master.name},{l:"Дата",t:`${DAY[date.getDay()]}, ${date.getDate()} ${MON[date.getMonth()]}`},{l:"Время",t:time}].map(({l,t})=>(
            <div key={l} style={{ display:"flex",alignItems:"center",gap:12,padding:"7px 0",borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#aaa",width:52 }}>{l}</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:"#111" }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10,width:"100%",opacity:phase>=2?1:0,transition:"opacity 0.35s ease 0.2s" }}>
          <button className="btn-secondary" onClick={()=>onNavigate("my-bookings")} style={{ padding:"14px",borderRadius:14,border:"1px solid #e5e5e5",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:"#111",cursor:"pointer" }}>Мои записи</button>
          <button className="btn-primary" onClick={()=>onNavigate("hub")} style={{ padding:"14px",borderRadius:14,border:"none",background:"#111",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer" }}>На главную</button>
        </div>
      </div>
    </Page>
  );
}

// ─── MY BOOKINGS — FIXED: loads from API ─────────────────────────────────────
function MyBookingsPage({ onBack, onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const tgUser = getTgUser();

  const statusCfg = {
    active:           { label:"Предстоит",      color:"#16a34a", dot:"#22c55e" },
    cancelled:        { label:"Отменена",        color:"#999",    dot:"#ccc" },
    cancelled_client: { label:"Отменена",        color:"#999",    dot:"#ccc" },
    cancelled_master: { label:"Отмена мастером", color:"#ef4444", dot:"#fca5a5" },
    done:             { label:"Завершена",        color:"#888",    dot:"#bbb" },
    noshow:           { label:"Не пришли",        color:"#f59e0b", dot:"#fcd34d" },
  };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api("GET", `/api/bookings/my?tg=${encodeURIComponent(tgUser.tg)}`);
    if(Array.isArray(data)) setBookings(data);
    setLoading(false);
  }, [tgUser.tg]);

  useEffect(()=>{ load(); },[load]);

  const cancelBooking = async (id) => {
    await api("PATCH", `/api/bookings/${id}/cancel`, { tg: tgUser.tg });
    load();
  };

  return (
    <Page>
      <PageHeader title="Мои записи" onBack={onBack}/>
      <div style={{ padding:"12px 16px 100px" }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}><Spinner/></div>
        ) : bookings.length===0 ? (
          <div style={{ textAlign:"center",padding:"70px 24px" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:18,fontWeight:700,color:"#111",marginBottom:6 }}>Записей пока нет</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#888",marginBottom:24 }}>Запишитесь к мастеру прямо сейчас</div>
            <button className="btn-primary" onClick={()=>onNavigate("booking")} style={{ padding:"13px 28px",background:"#111",color:"#fff",border:"none",borderRadius:12,fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer" }}>Записаться</button>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {bookings.map(b=>{
              const s=statusCfg[b.visitStatus]||statusCfg.active;
              const dateLabel = b.dateStr ? b.dateStr.split("-").reverse().slice(0,2).join(".") : "";
              return (
                <div key={b.id} style={{ border:"1px solid #efefef", borderLeft:b.visitStatus==="active"?"3px solid #22c55e":"1px solid #efefef", borderRadius:16,overflow:"hidden",background:"#fff" }}>
                  <div style={{ background:b.visitStatus==="active"?"#111":"#f7f7f7",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:b.visitStatus==="active"?"#fff":"#111" }}>{b.service?.name||"Услуга"}</div>
                    <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                      <div style={{ width:6,height:6,borderRadius:"50%",background:s.dot }}/>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,color:b.visitStatus==="active"?"rgba(255,255,255,0.6)":s.color,fontWeight:500 }}>{s.label}</span>
                    </div>
                  </div>
                  <div style={{ padding:"12px 14px",display:"flex",gap:12,alignItems:"center" }}>
                    <img src={CONFIG.masters.find(m=>m.id===b.masterId)?.photo||""} alt="" style={{ width:44,height:44,borderRadius:"50%",objectFit:"cover",flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:"#222" }}>{CONFIG.masters.find(m=>m.id===b.masterId)?.name||""}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#aaa",marginTop:2 }}>{dateLabel} · {b.timeStr}</div>
                    </div>
                    {b.visitStatus==="active"&&(
                      <button className="cancel-btn" onClick={()=>cancelBooking(b.id)}
                        style={{ background:"#f8f8f8",border:"1px solid #e8e8e8",borderRadius:8,padding:"7px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#999",cursor:"pointer" }}>
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}

// ─── ADMIN HELPERS ─────────────────────────────────────────────────────────────
const S = { fontFamily:"'DM Sans',sans-serif" };
const sameDay = (a,b) => { const x=new Date(a instanceof Date?a:a+"T00:00:00"); x.setHours(0,0,0,0); const y=new Date(b instanceof Date?b:b+"T00:00:00"); y.setHours(0,0,0,0); return x.getTime()===y.getTime(); };

function DangerDialog({ title, body, confirmLabel="Подтвердить", onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px" }}>
      <div className="page-enter" style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:380,padding:"28px 24px 24px",boxShadow:"0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ width:44,height:44,background:"#fff1f0",border:"1.5px solid #fecaca",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style={{ ...S,fontSize:16,fontWeight:700,color:"#111",marginBottom:8 }}>{title}</div>
        <div style={{ ...S,fontSize:13,color:"#888",lineHeight:1.6,marginBottom:22 }}>{body}</div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"13px",borderRadius:12,border:"1.5px solid #e5e5e5",background:"#fff",...S,fontSize:14,fontWeight:600,color:"#555",cursor:"pointer" }}>Отмена</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"13px",borderRadius:12,border:"none",background:"#ef4444",...S,fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Sheet({ children, onClose, zIndex=300 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(5px)",zIndex,display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="page-enter" style={{ background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:430,padding:"20px 20px 40px",maxHeight:"90dvh",overflowY:"auto" }}>
        <div style={{ width:36,height:4,background:"#e8e8e8",borderRadius:4,margin:"0 auto 20px" }}/>
        {children}
      </div>
    </div>
  );
}

// ─── ADMIN PASSWORD MODAL — FIXED: validates against server ──────────────────
function AdminPasswordModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState(""); const [shake, setShake] = useState(false); const [error, setError] = useState(false); const [loading, setLoading] = useState(false);
  const attempt = async () => {
    setLoading(true);
    const res = await api("POST", "/api/admin/login", { password: pw });
    setLoading(false);
    if(res.ok) { onSuccess(res.token); }
    else { setError(true); setShake(true); setPw(""); setTimeout(()=>setShake(false),500); }
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="page-enter" style={{ background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:430,padding:"28px 24px 40px" }}>
        <div style={{ width:36,height:4,background:"#e8e8e8",borderRadius:4,margin:"0 auto 24px" }}/>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6 }}>
          <div style={{ width:40,height:40,background:"#111",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div><div style={{ ...S,fontSize:17,fontWeight:700,color:"#111" }}>Вход для мастеров</div><div style={{ ...S,fontSize:12,color:"#aaa",marginTop:1 }}>Введите пароль</div></div>
        </div>
        <div style={{ marginTop:20,marginBottom:8 }}>
          <input type="password" placeholder="Пароль" value={pw} onChange={e=>{setPw(e.target.value);setError(false);}} onKeyDown={e=>e.key==="Enter"&&attempt()}
            style={{ width:"100%",padding:"14px 16px",borderRadius:14,border:error?"1.5px solid #ef4444":"1.5px solid #e5e5e5",...S,fontSize:16,color:"#111",outline:"none",background:error?"#fff8f8":"#fafafa",boxSizing:"border-box",animation:shake?"shakeX 0.4s ease":"none",transition:"border-color 0.2s,background 0.2s" }} autoFocus/>
          {error && <div style={{ ...S,fontSize:12,color:"#ef4444",marginTop:6,paddingLeft:4 }}>Неверный пароль</div>}
        </div>
        <button className="btn-primary" onClick={attempt} disabled={loading} style={{ width:"100%",marginTop:8,padding:"15px",borderRadius:14,border:"none",background:"#111",color:"#fff",...S,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {loading?<><Spinner/>Проверка…</>:"Войти"}
        </button>
      </div>
      <style>{`@keyframes shakeX{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

// ─── ADMIN PANEL — FIXED: loads data from API, saves to API ──────────────────
function AdminPanel({ onClose, onNavigate, adminToken }) {
  const [bookings, setBookings] = useState([]);
  const [clientFlags, setClientFlagsState] = useState({});
  const [closedDays, setClosedDays] = useState(new Set());
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showGlobal, setShowGlobal] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dateTabs = Array.from({length:7},(_,i)=>{ const d=new Date(today);d.setDate(today.getDate()+i);return d; });

  // Load all data from API
  useEffect(()=>{
    Promise.all([
      api("GET","/api/bookings"),
      api("GET","/api/flags"),
      api("GET","/api/closed-days"),
    ]).then(([bk,fl,cd])=>{
      if(Array.isArray(bk)) setBookings(bk);
      if(fl && !fl.error) setClientFlagsState(fl);
      if(Array.isArray(cd)) setClosedDays(new Set(cd));
      setLoading(false);
    });
  },[]);

  const updateVisitStatus = async (id, status) => {
    await api("PATCH", `/api/bookings/${id}/status`, { status });
    setBookings(prev=>prev.map(b=>b.id!==id?b:{...b,visitStatus:status}));
    // Re-fetch flags in case noshow triggered auto-flag
    if(status==="noshow") {
      const fl = await api("GET","/api/flags");
      if(fl && !fl.error) setClientFlagsState(fl);
    }
  };

  const updateFlag = async (tg, flag) => {
    await api("PUT", `/api/flags/${encodeURIComponent(tg)}`, flag);
    setClientFlagsState(prev=>({...prev,[tg]:flag}));
  };

  const toggleDay = async (key) => {
    if(closedDays.has(key)) {
      await api("DELETE", `/api/closed-days/${key}`);
      setClosedDays(s=>{ const n=new Set(s); n.delete(key); return n; });
    } else {
      await api("POST","/api/closed-days",{dateKey:key});
      setClosedDays(s=>new Set([...s,key]));
    }
  };

  const selectedMaster = CONFIG.masters.find(m=>m.id===selectedMasterId);

  if(loading) return <div style={{ display:"flex",justifyContent:"center",alignItems:"center",height:"100%",background:"#fff" }}><Spinner/></div>;

  if(!selectedMasterId) {
    return (
      <div className="page-enter" style={{ minHeight:"100%",background:"#fff" }}>
        <div style={{ display:"flex",alignItems:"center",padding:"14px 16px 12px",borderBottom:"1px solid #f0f0f0",gap:4 }}>
          <button className="back-btn" onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",padding:6,display:"flex",alignItems:"center",color:"#111",marginLeft:-6,marginRight:2 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ ...S,fontSize:17,fontWeight:700,color:"#111" }}>Панель мастера</div>
          <div style={{ marginLeft:"auto",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"4px 10px" }}>
            <span style={{ ...S,fontSize:11,color:"#16a34a",fontWeight:600 }}>Мастер</span>
          </div>
        </div>
        <div style={{ padding:"16px 16px 0" }}>
          <button onClick={()=>setShowGlobal(true)}
            style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:16,background:"#111",border:"none",borderRadius:16,cursor:"pointer",textAlign:"left" }}>
            <div style={{ width:36,height:36,background:"rgba(255,255,255,0.12)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ ...S,fontSize:14,fontWeight:700,color:"#fff" }}>Глобальные действия</div>
              <div style={{ ...S,fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:1 }}>Закрытие дня · отмена записей</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div style={{ ...S,fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:1,textTransform:"uppercase",marginBottom:12 }}>Выберите себя</div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {CONFIG.masters.map(m=>{
              const todayCnt=bookings.filter(b=>b.masterId===m.id&&sameDay(b.dateStr,today)).length;
              const flaggedCnt=bookings.filter(b=>b.masterId===m.id&&sameDay(b.dateStr,today)&&(clientFlags[b.clientTg]?.flagged||clientFlags[b.clientTg]?.blocked)).length;
              return (
                <button key={m.id} className="master-card" onClick={()=>setSelectedMasterId(m.id)}
                  style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#fff",border:"1.5px solid #efefef",borderRadius:16,cursor:"pointer",textAlign:"left",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ position:"relative",flexShrink:0 }}>
                    <img src={m.photo} alt={m.name} style={{ width:52,height:52,borderRadius:"50%",objectFit:"cover",border:"2px solid #f0f0f0" }}/>
                    <div className="online-dot" style={{ position:"absolute",bottom:1,right:1,width:13,height:13,background:"#22c55e",borderRadius:"50%",border:"2px solid #fff" }}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ ...S,fontSize:15,fontWeight:700,color:"#111" }}>{m.name}</div>
                    <div style={{ ...S,fontSize:12,color:"#aaa",marginTop:2 }}>{m.role}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...S,fontSize:20,fontWeight:800,color:todayCnt>0?"#111":"#ddd" }}>{todayCnt}</div>
                    <div style={{ ...S,fontSize:10,color:"#bbb" }}>сегодня</div>
                  </div>
                  {flaggedCnt>0&&<span style={{ fontSize:14 }}>⚠️</span>}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              );
            })}
          </div>
        </div>
        {showGlobal && <GlobalActionsSheet onClose={()=>setShowGlobal(false)} bookings={bookings} closedDays={closedDays} onUpdateBooking={updateVisitStatus} onToggleDay={toggleDay}/>}
      </div>
    );
  }

  const activeTabDate = dateTabs[activeTab==="today"?0:parseInt(activeTab.split("-")[1])];
  const dayBookings = bookings.filter(b=>b.masterId===selectedMasterId&&sameDay(b.dateStr,activeTabDate)).sort((a,b)=>a.timeStr.localeCompare(b.timeStr));

  return (
    <div style={{ minHeight:"100%",background:"#fff" }}>
      <div style={{ display:"flex",alignItems:"center",padding:"14px 16px 12px",borderBottom:"1px solid #f0f0f0",gap:4 }}>
        <button className="back-btn" onClick={()=>setSelectedMasterId(null)} style={{ background:"none",border:"none",cursor:"pointer",padding:6,display:"flex",alignItems:"center",color:"#111",marginLeft:-6,marginRight:2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <img src={selectedMaster.photo} alt="" style={{ width:30,height:30,borderRadius:"50%",objectFit:"cover",flexShrink:0 }}/>
        <div style={{ ...S,fontSize:16,fontWeight:700,color:"#111",marginLeft:4 }}>{selectedMaster.name}</div>
        <button onClick={onClose} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",padding:6,display:"flex",alignItems:"center",color:"#aaa" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ display:"flex",gap:6,padding:"12px 16px",overflowX:"auto",borderBottom:"1px solid #f5f5f5" }}>
        {dateTabs.map((d,i)=>{
          const key=i===0?"today":`day-${i}`;
          const isT=activeTab===key;
          const label=i===0?"Сегодня":i===1?"Завтра":`${DAY[d.getDay()]} ${d.getDate()}`;
          const cnt=bookings.filter(b=>b.masterId===selectedMasterId&&sameDay(b.dateStr,d)).length;
          return (
            <button key={key} className="filter-pill" onClick={()=>setActiveTab(key)}
              style={{ flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${isT?"#111":"#e8e8e8"}`,background:isT?"#111":"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ ...S,fontSize:13,fontWeight:isT?700:400,color:isT?"#fff":"#888" }}>{label}</span>
              {cnt>0&&<span style={{ background:isT?"rgba(255,255,255,0.25)":"#f0fdf4",color:isT?"#fff":"#22c55e",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        {dayBookings.length===0 ? (
          <div style={{ textAlign:"center",padding:"40px 0",color:"#ccc",...S,fontSize:14 }}>Записей нет</div>
        ) : (
          <div className="page-enter" style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {dayBookings.map(b=>(
              <BookingCard key={b.id} b={b} clientFlags={clientFlags} onSelect={setSelectedBooking} onQuickStatus={updateVisitStatus}/>
            ))}
          </div>
        )}
      </div>
      <AdminEarningsStats masterId={selectedMasterId} bookings={bookings}/>
      {selectedBooking && (
        <ClientDetailSheet booking={selectedBooking} clientFlags={clientFlags}
          onUpdateFlag={updateFlag}
          onUpdateVisitStatus={(id,s)=>{ updateVisitStatus(id,s); setSelectedBooking(prev=>({...prev,visitStatus:s})); }}
          onClose={()=>setSelectedBooking(null)}/>
      )}
    </div>
  );
}

// ─── ADMIN: Booking Card ──────────────────────────────────────────────────────
function BookingCard({ b, clientFlags, onSelect, onQuickStatus }) {
  const flag = clientFlags[b.clientTg] || {};
  const statusClr = {
    active:           ["#22c55e","#f0fdf4","#bbf7d0"],
    done:             ["#16a34a","#f0fdf4","#dcfce7"],
    noshow:           ["#f59e0b","#fffbeb","#fde68a"],
    cancelled_client: ["#999",  "#f5f5f5","#e5e5e5"],
    cancelled_master: ["#ef4444","#fff1f0","#fecaca"],
  }[b.visitStatus] || ["#22c55e","#f0fdf4","#bbf7d0"];
  const isDone = b.visitStatus !== "active";
  return (
    <div style={{ border:`1px solid ${isDone?"#f0f0f0":"#e0e0e0"}`,borderLeft:`3px solid ${statusClr[0]}`,borderRadius:14,background:isDone?"#fafafa":"#fff",overflow:"hidden",transition:"box-shadow 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.07)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 13px",cursor:"pointer" }} onClick={()=>onSelect(b)}>
        <div style={{ minWidth:42,textAlign:"center" }}>
          <div style={{ ...S,fontSize:15,fontWeight:800,color:isDone?"#bbb":"#111",letterSpacing:-0.3 }}>{b.timeStr}</div>
        </div>
        <div style={{ width:1,height:32,background:"#f0f0f0",flexShrink:0 }}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ ...S,fontSize:13,fontWeight:700,color:isDone?"#aaa":"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{b.clientName}</span>
            {flag.flagged && <span style={{ fontSize:11,flexShrink:0 }}>⚠️</span>}
            {flag.blocked && <span style={{ fontSize:11,flexShrink:0 }}>🚫</span>}
          </div>
          <div style={{ ...S,fontSize:11,color:"#bbb",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{b.service?.name}</div>
        </div>
        <div style={{ flexShrink:0,padding:"3px 9px",borderRadius:20,background:statusClr[1],border:`1px solid ${statusClr[2]}` }}>
          <span style={{ ...S,fontSize:10,fontWeight:700,color:statusClr[0] }}>{{active:"●",done:"✓",noshow:"✗",cancelled_client:"↩",cancelled_master:"⊘"}[b.visitStatus]}</span>
        </div>
      </div>
      {b.visitStatus==="active" && (
        <div style={{ display:"flex",borderTop:"1px solid #f5f5f5",background:"#fafafa" }}>
          {[["done","Выполнено","#16a34a"],["noshow","Не пришёл","#f59e0b"],["cancelled_master","Отменить","#ef4444"]].map(([k,lbl,clr])=>(
            <button key={k} onClick={e=>{e.stopPropagation();onQuickStatus(b.id,k);}}
              style={{ flex:1,padding:"8px 4px",border:"none",borderRight:"1px solid #f0f0f0",background:"transparent",cursor:"pointer",...S,fontSize:11,fontWeight:600,color:clr }}>
              {lbl}
            </button>
          ))}
        </div>
      )}
      {b.visitStatus!=="active" && (
        <div style={{ borderTop:"1px solid #f5f5f5",background:"#fafafa" }}>
          <button onClick={e=>{e.stopPropagation();onQuickStatus(b.id,"active");}}
            style={{ width:"100%",padding:"8px",border:"none",background:"transparent",cursor:"pointer",...S,fontSize:11,fontWeight:600,color:"#22c55e" }}>
            ↻ Вернуть в активные
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: Global Actions ────────────────────────────────────────────────────
function GlobalActionsSheet({ onClose, bookings, closedDays, onUpdateBooking, onToggleDay }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dateTabs = Array.from({length:7},(_,i)=>{ const d=new Date(today);d.setDate(today.getDate()+i);return d; });
  const [selDate, setSelDate] = useState(today);
  const [dialog, setDialog] = useState(null);
  const dateKey = d => d.toISOString().slice(0,10);
  const isClosed = closedDays.has(dateKey(selDate));
  const dayBookings = bookings.filter(b=>sameDay(b.dateStr,selDate)&&b.visitStatus==="active");
  return (
    <Sheet onClose={onClose} zIndex={340}>
      <div style={{ ...S,fontSize:16,fontWeight:700,color:"#111",marginBottom:4 }}>Глобальные действия</div>
      <div style={{ ...S,fontSize:13,color:"#aaa",marginBottom:16 }}>Применяются ко всему сервису</div>
      <div style={{ display:"flex",gap:7,overflowX:"auto",marginBottom:18,paddingBottom:4 }}>
        {dateTabs.map((d,i)=>{
          const isS=sameDay(d,selDate);
          const lbl=i===0?"Сег":i===1?"Завт":`${DAY[d.getDay()]}${d.getDate()}`;
          return (
            <button key={i} onClick={()=>setSelDate(d)}
              style={{ flexShrink:0,padding:"7px 12px",borderRadius:20,border:`1.5px solid ${isS?"#111":"#e8e8e8"}`,background:isS?"#111":"#fff",...S,fontSize:12,fontWeight:isS?700:400,color:isS?"#fff":"#888",cursor:"pointer" }}>
              {lbl}
            </button>
          );
        })}
      </div>
      <div style={{ background:"#f9f9f9",border:"1px solid #efefef",borderRadius:12,padding:"12px 14px",marginBottom:16 }}>
        <div style={{ ...S,fontSize:13,color:"#333",fontWeight:600 }}>
          {DAY[selDate.getDay()].toUpperCase()}, {selDate.getDate()} {MON[selDate.getMonth()]}
          {isClosed && <span style={{ marginLeft:8,background:"#fff1f0",border:"1px solid #fecaca",borderRadius:8,padding:"2px 8px",...S,fontSize:10,color:"#ef4444",fontWeight:700 }}>ЗАКРЫТО</span>}
        </div>
        <div style={{ ...S,fontSize:12,color:"#aaa",marginTop:4 }}>{dayBookings.length} активных записей</div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        <button onClick={()=>setDialog("cancel_day")} disabled={dayBookings.length===0}
          style={{ padding:"14px",borderRadius:13,border:"1.5px solid #fecaca",background:"#fff1f0",...S,fontSize:14,fontWeight:700,color:"#ef4444",cursor:dayBookings.length===0?"not-allowed":"pointer",opacity:dayBookings.length===0?0.5:1 }}>
          🗑 Отменить все записи на этот день
        </button>
        <button onClick={()=>setDialog("close_day")}
          style={{ padding:"14px",borderRadius:13,border:`1.5px solid ${isClosed?"#bbf7d0":"#fecaca"}`,background:isClosed?"#f0fdf4":"#fff1f0",...S,fontSize:14,fontWeight:700,color:isClosed?"#16a34a":"#ef4444",cursor:"pointer" }}>
          {isClosed?"✓ Открыть этот день":"🔒 Закрыть день"}
        </button>
      </div>
      {dialog==="cancel_day" && (
        <DangerDialog title="Отменить все записи?"
          body={`${dayBookings.length} записей будут отменены.`}
          confirmLabel="Отменить все" onCancel={()=>setDialog(null)}
          onConfirm={()=>{ dayBookings.forEach(b=>onUpdateBooking(b.id,"cancelled_master")); setDialog(null); }}/>
      )}
      {dialog==="close_day" && !isClosed && (
        <DangerDialog title="Закрыть день?" body="Новые записи будут недоступны."
          confirmLabel="Закрыть" onCancel={()=>setDialog(null)}
          onConfirm={()=>{ onToggleDay(dateKey(selDate)); setDialog(null); }}/>
      )}
    </Sheet>
  );
}

// ─── ADMIN: Client Detail ─────────────────────────────────────────────────────
function ClientDetailSheet({ booking, clientFlags, onUpdateFlag, onUpdateVisitStatus, onClose }) {
  const tg = booking.clientTg;
  const flag = clientFlags[tg] || { noShowCount:0, flagged:false, blocked:false };
  const [dialog, setDialog] = useState(null);
  const statusCfg = {
    active:           { label:"Активна",          color:"#22c55e", bg:"#f0fdf4", border:"#bbf7d0" },
    done:             { label:"Выполнено ✓",      color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0" },
    noshow:           { label:"Не пришёл",        color:"#f59e0b", bg:"#fffbeb", border:"#fde68a" },
    cancelled_client: { label:"Отмена клиентом",  color:"#888",   bg:"#f5f5f5", border:"#e5e5e5" },
    cancelled_master: { label:"Отмена мастером",  color:"#ef4444", bg:"#fff1f0", border:"#fecaca" },
  };
  const curStatus = statusCfg[booking.visitStatus] || statusCfg.active;
  const statusBtns = [
    { key:"done",             label:"Выполнено",       icon:"✓", clr:"#16a34a", bg:"#f0fdf4", brd:"#bbf7d0" },
    { key:"noshow",           label:"Не пришёл",       icon:"✗", clr:"#f59e0b", bg:"#fffbeb", brd:"#fde68a" },
    { key:"cancelled_client", label:"Отмена клиента",  icon:"↩", clr:"#888",   bg:"#f5f5f5", brd:"#e5e5e5" },
    { key:"cancelled_master", label:"Отмена мастера",  icon:"⊘", clr:"#ef4444", bg:"#fff1f0", brd:"#fecaca" },
    { key:"active",           label:"Вернуть",         icon:"↻", clr:"#22c55e", bg:"#f0fdf4", brd:"#bbf7d0" },
  ].filter(b=>b.key!==booking.visitStatus);

  return (
    <Sheet onClose={onClose} zIndex={320}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
        <div style={{ width:48,height:48,background:"#f5f5f5",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>
          {booking.clientName[0]}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ ...S,fontSize:17,fontWeight:700,color:"#111" }}>{booking.clientName}</div>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:3 }}>
            <span style={{ ...S,fontSize:12,color:"#888" }}>{booking.timeStr} · {booking.service?.name}</span>
            {flag.flagged && <span style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"1px 7px",...S,fontSize:10,fontWeight:700,color:"#d97706" }}>⚠ Предоплата</span>}
            {flag.blocked && <span style={{ background:"#fff1f0",border:"1px solid #fecaca",borderRadius:8,padding:"1px 7px",...S,fontSize:10,fontWeight:700,color:"#ef4444" }}>🚫 Заблокирован</span>}
          </div>
        </div>
      </div>
      <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",background:curStatus.bg,border:`1px solid ${curStatus.border}`,borderRadius:20,marginBottom:16 }}>
        <span style={{ ...S,fontSize:12,fontWeight:600,color:curStatus.color }}>{curStatus.label}</span>
      </div>
      <div style={{ ...S,fontSize:11,color:"#bbb",fontWeight:600,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10 }}>Статус визита</div>
      <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:18 }}>
        {statusBtns.map(b=>(
          <button key={b.key} onClick={()=>onUpdateVisitStatus(booking.id,b.key)}
            style={{ padding:"7px 12px",borderRadius:10,border:`1.5px solid ${b.brd}`,background:b.bg,cursor:"pointer",...S,fontSize:12,fontWeight:600,color:b.clr }}>
            {b.icon} {b.label}
          </button>
        ))}
      </div>
      <div style={{ ...S,fontSize:11,color:"#bbb",fontWeight:600,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10 }}>Контакты</div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:18 }}>
        {booking.clientPhone&&<div style={{ display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"#f9f9f9",borderRadius:10 }}>
          <span style={{ ...S,fontSize:13,color:"#888" }}>Телефон</span>
          <a href={`tel:${booking.clientPhone}`} style={{ ...S,fontSize:13,fontWeight:600,color:"#111",textDecoration:"none" }}>{booking.clientPhone}</a>
        </div>}
        <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"#f9f9f9",borderRadius:10 }}>
          <span style={{ ...S,fontSize:13,color:"#888" }}>Telegram</span>
          <a href={`https://t.me/${booking.clientTg.replace("@","")}`} target="_blank" rel="noreferrer" style={{ ...S,fontSize:13,fontWeight:600,color:"#111",textDecoration:"none" }}>{booking.clientTg}</a>
        </div>
        {booking.comment&&<div style={{ padding:"10px 12px",background:"#fffbeb",borderRadius:10,border:"1px solid #fde68a" }}>
          <div style={{ ...S,fontSize:11,color:"#d97706",fontWeight:600,marginBottom:4 }}>Комментарий</div>
          <div style={{ ...S,fontSize:13,color:"#111" }}>{booking.comment}</div>
        </div>}
      </div>
      <div style={{ ...S,fontSize:11,color:"#bbb",fontWeight:600,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10 }}>Клиент · история</div>
      <div style={{ display:"flex",gap:8,marginBottom:20 }}>
        <div style={{ flex:1,padding:"12px",background:"#f9f9f9",borderRadius:12,textAlign:"center" }}>
          <div style={{ ...S,fontSize:20,fontWeight:800,color:flag.noShowCount>0?"#f59e0b":"#111" }}>{flag.noShowCount||0}</div>
          <div style={{ ...S,fontSize:11,color:"#bbb",marginTop:2 }}>Не пришёл</div>
        </div>
        <button onClick={()=>onUpdateFlag(tg,{...flag,flagged:!flag.flagged})}
          style={{ flex:1,padding:"12px",background:flag.flagged?"#fffbeb":"#f9f9f9",border:`1px solid ${flag.flagged?"#fde68a":"#f0f0f0"}`,borderRadius:12,cursor:"pointer",textAlign:"center" }}>
          <div style={{ ...S,fontSize:14,fontWeight:700,color:flag.flagged?"#d97706":"#bbb" }}>⚠</div>
          <div style={{ ...S,fontSize:11,color:flag.flagged?"#d97706":"#bbb",marginTop:2 }}>{flag.flagged?"Предоплата":"Отметить"}</div>
        </button>
        <button onClick={()=>setDialog(flag.blocked?"unblock":"block")}
          style={{ flex:1,padding:"12px",background:flag.blocked?"#fff1f0":"#f9f9f9",border:`1px solid ${flag.blocked?"#fecaca":"#f0f0f0"}`,borderRadius:12,cursor:"pointer",textAlign:"center" }}>
          <div style={{ ...S,fontSize:14,fontWeight:700,color:flag.blocked?"#ef4444":"#bbb" }}>🚫</div>
          <div style={{ ...S,fontSize:11,color:flag.blocked?"#ef4444":"#bbb",marginTop:2 }}>{flag.blocked?"Разблок.":"Блок."}</div>
        </button>
      </div>
      {dialog==="block" && <DangerDialog title="Заблокировать клиента?" body={`${booking.clientName} не сможет записываться.`} confirmLabel="Заблокировать" onCancel={()=>setDialog(null)} onConfirm={()=>{ onUpdateFlag(tg,{...flag,blocked:true}); setDialog(null); }}/>}
      {dialog==="unblock" && <DangerDialog title="Разблокировать?" body={`${booking.clientName} снова сможет записываться.`} confirmLabel="Разблокировать" onCancel={()=>setDialog(null)} onConfirm={()=>{ onUpdateFlag(tg,{...flag,blocked:false}); setDialog(null); }}/>}
    </Sheet>
  );
}

// ─── ADMIN: Earnings — FIXED: only counts "done" as paid ─────────────────────
function AdminEarningsStats({ masterId, bookings }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate()-today.getDay()+(today.getDay()===0?-6:1));
  const startOfMonth = new Date(today.getFullYear(),today.getMonth(),1);
  // FIXED: only count "done" as actual earnings, not "active"
  const paid = b => b.visitStatus === "done";
  const all = bookings.filter(b=>b.masterId===masterId);
  const sum = arr => arr.reduce((a,b)=>a+(b.service?.price||0),0);
  const todayB  = all.filter(b=>{ const d=new Date(b.dateStr+"T00:00:00");d.setHours(0,0,0,0);return d.getTime()===today.getTime()&&paid(b); });
  const weekB   = all.filter(b=>{ const d=new Date(b.dateStr+"T00:00:00");d.setHours(0,0,0,0);return d>=startOfWeek&&d<=today&&paid(b); });
  const monthB  = all.filter(b=>{ const d=new Date(b.dateStr+"T00:00:00");d.setHours(0,0,0,0);return d>=startOfMonth&&d<=today&&paid(b); });
  const breakdown = Object.values(all.filter(b=>{ const d=new Date(b.dateStr+"T00:00:00");d.setHours(0,0,0,0);return d>=startOfMonth&&d<=today&&paid(b); })
    .reduce((acc,b)=>{ const k=b.service?.id; if(!k) return acc; if(!acc[k]) acc[k]={name:b.service.name,count:0,total:0}; acc[k].count++;acc[k].total+=b.service.price;return acc;},{}))
    .sort((a,b)=>b.total-a.total);
  const maxT = breakdown[0]?.total||1;
  return (
    <div style={{ padding:"20px 16px 100px" }}>
      <div style={{ height:1,background:"linear-gradient(to right,#f0f0f0,#e5e5e5,#f0f0f0)",marginBottom:20 }}/>
      <div style={{ ...S,fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:14 }}>Заработок (факт)</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
        {[{label:"Сегодня",v:todayB},{label:"Неделя",v:weekB},{label:"Месяц",v:monthB}].map(({label,v})=>(
          <div key={label} style={{ background:"#f8f8f8",border:"1px solid #eeeeee",borderRadius:16,padding:"14px 12px",display:"flex",flexDirection:"column",gap:3 }}>
            <div style={{ ...S,fontSize:10,color:"#bbb",fontWeight:700,letterSpacing:0.5,textTransform:"uppercase" }}>{label}</div>
            <div style={{ ...S,fontSize:17,fontWeight:800,color:sum(v)>0?"#111":"#ddd",letterSpacing:-0.5,lineHeight:1.1 }}>
              {new Intl.NumberFormat("ru-RU").format(sum(v))}<span style={{ fontSize:11,fontWeight:500 }}>₽</span>
            </div>
            <div style={{ ...S,fontSize:11,color:"#bbb" }}>{v.length} зап.</div>
          </div>
        ))}
      </div>
      {breakdown.length>0 && (
        <div style={{ background:"#f8f8f8",border:"1px solid #eeeeee",borderRadius:16,padding:"16px 14px" }}>
          <div style={{ ...S,fontSize:11,color:"#bbb",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:14 }}>По услугам · месяц</div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {breakdown.map(({name,count,total})=>(
              <div key={name}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                  <span style={{ ...S,fontSize:13,color:"#333",fontWeight:500,flex:1,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginRight:8 }}>{name}</span>
                  <span style={{ ...S,fontSize:11,color:"#bbb",flexShrink:0,marginRight:10 }}>{count}×</span>
                  <span style={{ ...S,fontSize:13,fontWeight:700,color:"#111",flexShrink:0 }}>{new Intl.NumberFormat("ru-RU").format(total)}₽</span>
                </div>
                <div style={{ height:4,background:"#e8e8e8",borderRadius:4,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${Math.round(total/maxT*100)}%`,background:"linear-gradient(to right,#22c55e,#4ade80)",borderRadius:4,transition:"width 0.7s" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("hub");
  const [pageProps, setPageProps] = useState({});
  const [bookingState, setBookingState] = useState({});
  const [adminStep, setAdminStep] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [showBlockedWarning, setShowBlockedWarning] = useState(false);
  // FIX: closedDays must be shared between client booking and admin panel
  const [sharedClosedDays, setSharedClosedDays] = useState(new Set());

  // Load closed days on mount so DateTimePage knows which days to block
  useEffect(()=>{
    api("GET","/api/closed-days").then(data=>{
      if(Array.isArray(data)) setSharedClosedDays(new Set(data));
    });
  },[]);

  // Init Telegram Web App
  useEffect(()=>{ if(tg) { tg.ready(); tg.expand(); } },[]);

  const navigate = useCallback((target, props={}) => { setPage(target); setPageProps(props); }, []);
  const isBottomNavPage = ["hub","services","portfolio","my-bookings"].includes(page);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100dvh", background:"#fff", position:"relative", overflow:"hidden" }}>
        <div style={{ height:"100dvh", overflowY:"auto" }}>
          {adminStep==="panel" ? (
            <AdminPanel onClose={()=>setAdminStep(null)} onNavigate={navigate} adminToken={adminToken}/>
          ) : (
            <>
              {page==="hub"             && <HubPage onNavigate={navigate} onShowBlocked={()=>setShowBlockedWarning(true)}/>}
              {page==="services"        && <ServicesPage onBack={()=>navigate("hub")} onNavigate={navigate}/>}
              {page==="portfolio"       && <PortfolioPage onBack={()=>navigate("hub")}/>}
              {page==="my-bookings"     && <MyBookingsPage onBack={()=>navigate("hub")} onNavigate={navigate}/>}
              {page==="booking"         && <BookingPage initial={pageProps} onBack={()=>navigate("hub")} onNext={s=>{setBookingState({service:s});navigate("booking-master");}}/>}
              {page==="booking-master"  && <MasterPage service={bookingState.service} onBack={()=>navigate("booking")} onNext={m=>{setBookingState(s=>({...s,master:m}));navigate("booking-datetime");}}/>}
              {page==="booking-datetime"&& <DateTimePage service={bookingState.service} master={bookingState.master} onBack={()=>navigate("booking-master")} onNext={({date,time})=>{setBookingState(s=>({...s,date,time}));navigate("booking-confirm");}} closedDays={sharedClosedDays}/>}
              {page==="booking-confirm" && <ConfirmPage booking={bookingState} onBack={()=>navigate("booking-datetime")} onConfirm={(extra)=>{setBookingState(s=>({...s,...extra}));navigate("booking-success");}}/>}
              {page==="booking-success" && <SuccessPage booking={bookingState} onNavigate={navigate}/>}
            </>
          )}
        </div>
        {isBottomNavPage && adminStep!=="panel" && (
          <BottomNav active={page} onNavigate={navigate} onMasterPanel={()=>setAdminStep("password")}/>
        )}
        {adminStep==="password" && (
          <AdminPasswordModal onSuccess={(token)=>{ setAdminToken(token); setAdminStep("panel"); }} onClose={()=>setAdminStep(null)}/>
        )}
        {showBlockedWarning && (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px" }}>
            <div className="page-enter" style={{ background:"#fff",borderRadius:22,width:"100%",maxWidth:380,padding:"28px 24px 24px",boxShadow:"0 28px 70px rgba(0,0,0,0.3)",textAlign:"center" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>🚫</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:18,fontWeight:800,color:"#111",marginBottom:8 }}>Запись недоступна</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#666",lineHeight:1.6,marginBottom:20 }}>Ваш аккаунт заблокирован администратором студии.</div>
              <a href="https://t.me/nail_studio_admin" target="_blank" rel="noreferrer"
                style={{ display:"block",padding:"14px",borderRadius:13,background:"#111",color:"#fff",textDecoration:"none",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,marginBottom:10 }}>
                ✉ Написать в поддержку
              </a>
              <button onClick={()=>setShowBlockedWarning(false)}
                style={{ width:"100%",padding:"13px",borderRadius:13,border:"1.5px solid #e5e5e5",background:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:"#888",cursor:"pointer" }}>
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
