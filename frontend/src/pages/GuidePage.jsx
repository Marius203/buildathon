import { useState, useEffect } from "react";

const TRAIN_SCHEDULE = {
  "Mie 16": ["17:55", "19:15"],
  "Joi 17": ["16:28", "17:55", "18:27", "19:15", "20:30"],
  "Vin 18": ["16:28", "17:55", "18:27", "19:15", "20:30"],
  "Sâm 19": ["14:56", "16:28", "17:55", "18:27", "19:15", "20:30"],
  "Dum 20": ["14:56", "16:28", "17:55", "19:15"],
};

const TRANSPORT_POINTS = [
  { id: "gara",   label: "Gara Mică",        type: "🚆 TREN", address: "Strada Căii Ferate, Cluj-Napoca", desc: "Trenuri EC directe spre Jucu — cea mai rapidă opțiune.", mapsUrl: "https://maps.google.com/?cid=6579540705562148365", hasTimetable: true },
  { id: "iulius", label: "Iulius Mall",       type: "🚌 BUS",  address: "Str. Alexandru Vaida Voevod 53B", desc: "Autobuze non-stop spre festival. Parcare dedicată.", mapsUrl: "https://maps.google.com/?cid=12114736691577323057", hasTimetable: false },
  { id: "expo",   label: "Expo Transilvania", type: "🚌 BUS",  address: "Strada Aurel Vlaicu, Cluj-Napoca", desc: "Al doilea punct de plecare pentru autobuze non-stop.", mapsUrl: "https://maps.google.com/?cid=9551510899803580432", hasTimetable: false },
];

const DAYS_RO = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
const CARD = { border: "2px solid var(--ec-black)", overflow: "hidden" };

const LABEL = ({ children, style = {} }) => (
  <div style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: 10, ...style }}>
    {children}
  </div>
);

const ACCOMMODATION = [
  { id: "camping", icon: "⛺", label: "Camping Standard", badge: "CEL MAI POPULAR", badgeColor: "#15803d", pros: ["Cel mai ieftin", "Comunitate mare", "Atmosferă autentică EC"], cons: ["Aduci propriul cort", "Duș la comun", "Zgomot noaptea"], tip: "Ajunge joi dimineață pentru loc bun lângă intrare.", price: "~100–150 RON / persoană", link: "https://electriccastle.ro" },
  { id: "glamping", icon: "🛖", label: "Glamping", badge: "SE TERMINĂ RAPID", badgeColor: "#dc2626", pros: ["Pat real + lenjerie", "Mult mai confortabil", "Fără cort propriu"], cons: ["Mult mai scump", "Se rezervă în ore de la lansare", "Disponibilitate limitată"], tip: "Rezervă în prima oră după lansarea biletelor.", price: "~600–1.200 RON / persoană", link: "https://electriccastle.ro" },
  { id: "hotel", icon: "🏨", label: "Hotel Cluj-Napoca", badge: "CONFORT MAXIM", badgeColor: "#1d4ed8", pros: ["Pat, duș, AC", "Orașul la îndemână", "Fără noroi garantat"], cons: ["30km distanță", "Naveta zilnică cu shuttle", "Pierzi atmosfera nopții"], tip: "Rezervă camera devreme — prețurile cresc cu 3x în zilele festivalului.", price: "~200–600 RON / noapte", link: "https://www.booking.com/city/ro/cluj-napoca.html" },
];

const PACKING_LIST = [
  { id: "cizme", label: "Cizme de cauciuc", cat: "must", icon: "🥾" },
  { id: "poncho", label: "Poncho impermeabil", cat: "must", icon: "🌧️" },
  { id: "powerbank", label: "Powerbank 20.000+ mAh", cat: "must", icon: "🔋" },
  { id: "buletin", label: "Act de identitate + bilet", cat: "must", icon: "🪪" },
  { id: "lanterna", label: "Lanternă frontală", cat: "rec", icon: "🔦" },
  { id: "crema", label: "Cremă de soare", cat: "rec", icon: "☀️" },
  { id: "insect", label: "Spray anti-insecte", cat: "rec", icon: "🦟" },
  { id: "dopuri", label: "Dopuri de urechi", cat: "rec", icon: "👂" },
  { id: "pelerina", label: "Pelerină de ploaie extra", cat: "rec", icon: "🧥" },
  { id: "husa", label: "Husă impermeabilă telefon", cat: "rec", icon: "📱" },
  { id: "sac", label: "Sac de dormit (camping)", cat: "opt", icon: "🛌" },
  { id: "steag", label: "Steag/semn de regăsire", cat: "opt", icon: "🚩" },
  { id: "polaroid", label: "Aparat foto instant", cat: "opt", icon: "📷" },
];

const FOOD_HIGHLIGHTS = [
  { name: "Fumuri", type: "🍟 Comfort Food", desc: "Loaded fries. F*ck yeah!", tag: "Lângă Hangar" },
  { name: "Wok'n Roll", type: "🍜 Asian", desc: "Noodle nirvana. Opțiuni vegane.", tag: "Food Court Central" },
  { name: "Crispyteria", type: "🥩 Șnițel", desc: "Crispy, tender, exact cum nu poți face acasă.", tag: "Royal Food Court" },
  { name: "TacoTrib", type: "🌮 Tex-Mex", desc: "…și dormi înfășurat ca un burrito.", tag: "Hillside" },
  { name: "PhoBar", type: "🍲 Vietnamese", desc: "Supă pho — perfect după o noapte lungă.", tag: "Castle Food Court" },
  { name: "Royal Breakfast by Lidl", type: "🍳 Breakfast", desc: "Mic dejun simplu și accesibil în camping.", tag: "Camping" },
  { name: "Stan și Bran", type: "🥟 Tradițional", desc: "Plăcinte aproape ca ale bunicii.", tag: "EC Village" },
  { name: "ThaiMe", type: "🌶️ Thai", desc: "Tom Yum, dumpling veggies, mango sticky rice.", tag: "Food Court" },
];

const CASHLESS_STEPS = [
  { step: "01", icon: "🎫", title: "Primești brățara", desc: "La intrare, la schimbul biletului. E cu cip RFID." },
  { step: "02", icon: "📱", title: "O activezi online", desc: "În contul tău EC, secțiunea cashless. Poți face asta înainte." },
  { step: "03", icon: "💳", title: "Încarci bani", desc: "Din aplicație sau de la Credit Point (doar la intrare în festival)." },
  { step: "04", icon: "🛒", title: "Plătești oriunde", desc: "Atingi brățara de orice terminal din festival." },
  { step: "05", icon: "💰", title: "Recuperezi restul", desc: "Rambursare online gratuită 30 zile după festival. On-site = 3% comision." },
];

const FORBIDDEN_ITEMS = [
  { category: "🍺 Băuturi & Recipiente", color: "#dc2626", items: ["Sticle de sticlă sau recipiente metalice cu margini ascuțite", "Băuturi alcoolice aduse din afară", "Recipiente > 0.5L (inclusiv termos metalic)"] },
  { category: "🔫 Obiecte periculoase", color: "#b45309", items: ["Arme de orice fel (inclusiv briceaguri, spray piper)", "Artificii, torțe, fumigene", "Lasere puternice", "Drone fără acreditare media"] },
  { category: "🐕 Animale & Altele", color: "#7c3aed", items: ["Animale de companie", "Generatoare personale", "Umbrele de orice tip", "Corturi cu structuri metalice > 3m înălțime"] },
  { category: "💊 Substanțe", color: "#0f766e", items: ["Droguri de orice fel", "Substanțe psihotrope"] },
];

const STAGES = [
  { id: "main", label: "Main Stage", sub: "Pop / Mainstream", color: "#dc2626", x: 160, y: 240, r: 22 },
  { id: "booha", label: "Booha", sub: "House / Techno", color: "#7c3aed", x: 290, y: 155, r: 16 },
  { id: "hangar", label: "Hangar", sub: "Alternativ / Rock", color: "#1d4ed8", x: 390, y: 195, r: 16 },
  { id: "hideout", label: "Hideout", sub: "Afro / Organic", color: "#15803d", x: 340, y: 145, r: 13 },
  { id: "beach", label: "The Beach", sub: "Funk / Soul", color: "#0891b2", x: 300, y: 240, r: 13 },
  { id: "stables", label: "Stables", sub: "Techno / Minimal", color: "#374151", x: 220, y: 140, r: 13 },
  { id: "backyard", label: "Backyard", sub: "World Music", color: "#b45309", x: 180, y: 110, r: 11 },
  { id: "pingpong", label: "Ping Pong", sub: "Oldies", color: "#be185d", x: 360, y: 270, r: 11 },
  { id: "camping", label: "Camping Stage", sub: "De la 12:00", color: "#4d7c0f", x: 110, y: 170, r: 10 },
];

const TIPS = [
  { icon: "⏰", tip: "Ajunge joi dimineață", desc: "Locurile bune de camping se iau rapid. Joi e prima zi cu muzică serioasă — ajunge cu o zi înainte." },
  { icon: "🔋", tip: "Powerbank > orice", desc: "Semnalul slab consumă bateria dublu. Fără powerbank ești izolat. 20.000 mAh ține 4 zile fără probleme." },
  { icon: "💧", tip: "Hidratare la sânge", desc: "Stații de apă gratuită la fiecare scenă. Sticle reutilizabile — umple constant. Nu aștepta să ți se facă sete." },
  { icon: "📱", tip: "Descarcă harta offline", desc: "Semnalul la ore de vârf e inexistent. Harta offline în aplicația EC îți salvează viața la 2 noaptea." },
  { icon: "👟", tip: "Schimbă cizmele pe la prânz", desc: "Picioarele obosesc în cizme de cauciuc. Adă și niște sneakers pentru zilele fără ploaie." },
  { icon: "🎯", tip: "Alege top 5 artiști și construiești în jurul lor", desc: "Imposibil să prinzi tot. Stabilește must-see-urile și lasă restul să vină natural." },
  { icon: "🌅", tip: "Nu rata răsăritul la Stables", desc: "Sunrise set la Stables e experiența EC per excelență. Merită să stai treaz o noapte întreagă." },
  { icon: "🏰", tip: "Castelul dimineața", desc: "Vizitează castelul în primele ore — e pustiu și poți face poze fără mulțime. Seara e plin." },
];

// ── Components ────────────────────────────────────────────────────────────────

function wmoToCondition(code) {
  if (code === 0) return { icon: "☀️", label: "Însorit", bg: "#fef9c3" };
  if ([1, 2].includes(code)) return { icon: "⛅", label: "Parțial noros", bg: "#f0f9ff" };
  if (code === 3) return { icon: "☁️", label: "Noros", bg: "#f1f5f9" };
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return { icon: "🌧️", label: "Ploaie", bg: "#eff6ff" };
  if ([95,96,99].includes(code)) return { icon: "⛈️", label: "Furtună", bg: "#eef2ff" };
  return { icon: "⛅", label: "Variabil", bg: "#f0f9ff" };
}

function WeatherBlock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=46.9103&longitude=23.8110&current=temperature_2m,weathercode&daily=temperature_2m_max,precipitation_probability_max,weathercode&timezone=Europe%2FBucharest&forecast_days=5")
      .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ ...CARD, padding: 24, textAlign: "center", color: "#888", fontSize: "0.85rem" }}>Se încarcă vremea pentru Bonțida...</div>;
  if (!data) return (
    <div style={{ ...CARD, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800 }}>🏰 Bonțida, Cluj</div><div style={{ fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Vreme tipică iulie</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: "2.2rem" }}>⛅</span><span style={{ fontFamily: "var(--ec-font-display)", fontSize: "1.8rem", fontWeight: 900 }}>25–30°C</span></div>
      </div>
      <div style={{ marginTop: 12, background: "#fff8e1", borderLeft: "3px solid #f59e0b", padding: "10px 14px", fontSize: "0.83rem", fontWeight: 600, color: "#92400e" }}>🌧️ Ploaia face parte din experiența EC. Iulie = cizme obligatorii.</div>
    </div>
  );
  const cur = data.current; const cond = wmoToCondition(cur.weathercode);
  const forecast = data.daily; const rainToday = forecast.precipitation_probability_max[0];
  return (
    <div style={CARD}>
      <div style={{ background: cond.bg, padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "1rem" }}>🏰 Bonțida, Cluj</div>
            <div style={{ fontSize: "0.72rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>Vreme la locația festivalului</div>
            <div style={{ fontSize: "0.88rem", color: "#444", marginTop: 8 }}>{cond.label}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{cond.icon}</span>
            <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "2.2rem", fontWeight: 900 }}>{Math.round(cur.temperature_2m)}°C</span>
          </div>
        </div>
        {rainToday > 40 && <div style={{ marginTop: 12, background: "#eff6ff", borderLeft: "3px solid #3b82f6", padding: "8px 12px", fontSize: "0.82rem", fontWeight: 600, color: "#1e40af" }}>🌧️ Șanse de ploaie {rainToday}% azi — ia cizmele și ponchourile!</div>}
      </div>
      <div style={{ display: "flex", background: "var(--ec-white)" }}>
        {forecast.time.map((dateStr, i) => {
          const c = wmoToCondition(forecast.weathercode[i]); const rain = forecast.precipitation_probability_max[i];
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 4px", gap: 3, borderRight: i < 4 ? "1px solid #f0f0f0" : "none" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{DAYS_RO[new Date(dateStr).getDay()]}</span>
              <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
              <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.88rem", fontWeight: 800 }}>{Math.round(forecast.temperature_2m_max[i])}°</span>
              {rain > 20 && <span style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: 700 }}>{rain}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransportBlock() {
  const [active, setActive] = useState("gara");
  const [activeDay, setActiveDay] = useState("Joi 17");
  const point = TRANSPORT_POINTS.find(p => p.id === active);
  return (
    <div style={CARD}>
      <div style={{ display: "flex", borderBottom: "2px solid var(--ec-black)" }}>
        {TRANSPORT_POINTS.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)} style={{ flex: 1, padding: "12px 6px", cursor: "pointer", border: "none", borderRight: "1px solid #e5e7eb", background: active === p.id ? "var(--ec-black)" : "var(--ec-white)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "background 0.15s" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: active === p.id ? "#aaa" : "#888" }}>{p.type}</span>
            <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.82rem", fontWeight: 800, color: active === p.id ? "var(--ec-white)" : "var(--ec-black)" }}>{p.label}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontSize: "1.05rem", fontWeight: 800, marginBottom: 4 }}>{point.label}</div>
        <div style={{ fontSize: "0.78rem", color: "#666", marginBottom: 4 }}>📍 {point.address}</div>
        <div style={{ fontSize: "0.85rem", color: "#444", marginBottom: 10 }}>{point.desc}</div>
        <a href={point.mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ec-black)", textDecoration: "underline", textUnderlineOffset: 3 }}>Deschide în Google Maps →</a>
      </div>
      {point.hasTimetable ? (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>Program trenuri EC — iulie 2025</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {Object.keys(TRAIN_SCHEDULE).map(day => (
              <button key={day} onClick={() => setActiveDay(day)} style={{ padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--ec-font-display)", letterSpacing: "0.04em", cursor: "pointer", background: activeDay === day ? "var(--ec-black)" : "none", border: `1.5px solid ${activeDay === day ? "var(--ec-black)" : "#e5e7eb"}`, color: activeDay === day ? "var(--ec-white)" : "#666", transition: "all 0.15s" }}>{day}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {TRAIN_SCHEDULE[activeDay].map(t => (<span key={t} style={{ background: "#f0f0f0", border: "1.5px solid var(--ec-black)", padding: "5px 14px", fontFamily: "var(--ec-font-display)", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.04em" }}>{t}</span>))}
          </div>
          <a href="https://entertix.ro/ec-transport" target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ec-black)", textDecoration: "underline", textUnderlineOffset: 3 }}>Cumpără bilete transport →</a>
        </div>
      ) : (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>Autobuze non-stop</div>
          <div style={{ fontSize: "0.85rem", color: "#444", marginBottom: 12, lineHeight: 1.6 }}>Pleacă continuu pe toată durata festivalului. Nu necesită rezervare.</div>
          <a href="https://entertix.ro/ec-transport" target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ec-black)", textDecoration: "underline", textUnderlineOffset: 3 }}>Info bilete transport →</a>
        </div>
      )}
    </div>
  );
}

function AccommodationBlock() {
  const [active, setActive] = useState("camping");
  const opt = ACCOMMODATION.find(a => a.id === active);
  return (
    <div style={{ ...CARD, height: "100%" }}>
      <div style={{ display: "flex", borderBottom: "2px solid var(--ec-black)" }}>
        {ACCOMMODATION.map(a => (
          <button key={a.id} onClick={() => setActive(a.id)} style={{ flex: 1, padding: "12px 4px", cursor: "pointer", border: "none", borderRight: "1px solid #e5e7eb", background: active === a.id ? "var(--ec-black)" : "var(--ec-white)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "background 0.15s" }}>
            <span style={{ fontSize: "1.2rem" }}>{a.icon}</span>
            <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.65rem", fontWeight: 800, color: active === a.id ? "var(--ec-white)" : "var(--ec-black)", textAlign: "center" }}>{a.label}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--ec-font-display)", fontSize: "1rem", fontWeight: 800 }}>{opt.icon} {opt.label}</div>
          <span style={{ background: opt.badgeColor, color: "#fff", fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.1em", padding: "3px 6px", flexShrink: 0 }}>{opt.badge}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "#f0fff4", border: "1px solid #bbf7d0", padding: "8px 10px" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#15803d", marginBottom: 5 }}>✓ AVANTAJE</div>
            {opt.pros.map((p, i) => <div key={i} style={{ fontSize: "0.75rem", color: "#166534", marginBottom: 2 }}>+ {p}</div>)}
          </div>
          <div style={{ background: "#fff8f8", border: "1px solid #fecaca", padding: "8px 10px" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#dc2626", marginBottom: 5 }}>✗ DEZAVANTAJE</div>
            {opt.cons.map((c, i) => <div key={i} style={{ fontSize: "0.75rem", color: "#991b1b", marginBottom: 2 }}>− {c}</div>)}
          </div>
        </div>
        <div style={{ background: "#fff8e1", borderLeft: "3px solid #f59e0b", padding: "7px 10px", fontSize: "0.78rem", color: "#92400e", fontWeight: 600, marginBottom: 10 }}>⚡ {opt.tip}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.82rem", fontWeight: 800 }}>💰 {opt.price}</span>
          <a href={opt.link} target="_blank" rel="noreferrer" style={{ background: "var(--ec-black)", color: "var(--ec-white)", padding: "6px 12px", fontSize: "0.7rem", fontWeight: 800, fontFamily: "var(--ec-font-display)", letterSpacing: "0.06em", textDecoration: "none" }}>REZERVĂ →</a>
        </div>
      </div>
    </div>
  );
}

function PackingBlock() {
  const [checked, setChecked] = useState(() => { try { return JSON.parse(localStorage.getItem("ec_packing") || "{}"); } catch { return {}; } });
  const [filter, setFilter] = useState("all");
  function toggle(id) { const next = { ...checked, [id]: !checked[id] }; setChecked(next); try { localStorage.setItem("ec_packing", JSON.stringify(next)); } catch {} }
  const filtered = filter === "all" ? PACKING_LIST : PACKING_LIST.filter(i => i.cat === filter);
  const total = PACKING_LIST.length; const done = PACKING_LIST.filter(i => checked[i.id]).length; const pct = Math.round((done / total) * 100);
  const catLabel = { must: "MUST", rec: "REC", opt: "OPT" };
  const catColor = { must: "#dc2626", rec: "#f59e0b", opt: "#6b7280" };
  return (
    <div style={{ ...CARD, height: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.88rem" }}>🎒 {done}/{total} packed</div>
        <div style={{ display: "flex", gap: 3 }}>
          {["all", "must", "rec", "opt"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "3px 8px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer", background: filter === f ? "var(--ec-black)" : "none", border: `1px solid ${filter === f ? "var(--ec-black)" : "#e5e7eb"}`, color: filter === f ? "var(--ec-white)" : "#666" }}>
              {f === "all" ? "TOATE" : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 3, background: "#f0f0f0" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#15803d" : "var(--ec-black)", transition: "width 0.3s" }} />
      </div>
      <div style={{ padding: "4px 16px" }}>
        {filtered.map(item => (
          <button key={item.id} onClick={() => toggle(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 18, height: 18, border: `2px solid ${checked[item.id] ? "var(--ec-black)" : "#e5e7eb"}`, background: checked[item.id] ? "var(--ec-black)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {checked[item.id] && <span style={{ color: "var(--ec-white)", fontSize: "0.6rem", fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: "0.9rem" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: checked[item.id] ? "#aaa" : "var(--ec-black)", textDecoration: checked[item.id] ? "line-through" : "none" }}>{item.label}</span>
            <span style={{ fontSize: "0.55rem", fontWeight: 900, color: catColor[item.cat], flexShrink: 0 }}>{catLabel[item.cat]}</span>
          </button>
        ))}
        {done === total && <div style={{ textAlign: "center", padding: "12px 0 6px", fontFamily: "var(--ec-font-display)", fontWeight: 800, color: "#15803d", fontSize: "0.88rem" }}>✅ Ești gata! 🏰</div>}
      </div>
    </div>
  );
}

function CashlessBlock() {
  return (
    <div style={{ ...CARD, height: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee" }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.95rem" }}>💳 Cashless în 5 pași</div>
        <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 3 }}>EC e 100% fără numerar — brățară RFID la intrare.</div>
      </div>
      <div style={{ padding: "8px 16px" }}>
        {CASHLESS_STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < CASHLESS_STEPS.length - 1 ? "1px solid #f5f5f5" : "none", alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, background: "var(--ec-black)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--ec-font-display)", fontWeight: 900, fontSize: "0.65rem", color: "var(--ec-white)" }}>{s.step}</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: "0.9rem" }}>{s.icon}</span>
                <span style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.82rem" }}>{s.title}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 16px", background: "#fff8e1", borderTop: "1px solid #fcd34d", fontSize: "0.76rem", fontWeight: 600, color: "#92400e" }}>
        ⚡ Încarcă mai mult decât crezi — mai ușor să ceri rambursare decât să stai la coadă la 2 noaptea.
      </div>
    </div>
  );
}

function FoodBlock() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? FOOD_HIGHLIGHTS
    : filter === "vegan" ? FOOD_HIGHLIGHTS.filter(f => ["Wok'n Roll", "ThaiMe"].includes(f.name))
    : filter === "breakfast" ? FOOD_HIGHLIGHTS.filter(f => f.type.includes("Break") || f.name === "PhoBar")
    : FOOD_HIGHLIGHTS.filter(f => ["Fumuri", "TacoTrib", "Crispyteria"].includes(f.name));
  return (
    <div style={{ ...CARD, height: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.88rem" }}>🍕 Food trucks top</div>
        <div style={{ display: "flex", gap: 3 }}>
          {[["all","TOATE"],["vegan","🌱"],["breakfast","🍳"],["comfort","🔥"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "3px 8px", fontSize: "0.62rem", fontWeight: 700, cursor: "pointer", background: filter === k ? "var(--ec-black)" : "none", border: `1px solid ${filter === k ? "var(--ec-black)" : "#e5e7eb"}`, color: filter === k ? "var(--ec-white)" : "#666" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {filtered.map((f, i) => (
          <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0", borderRight: i % 2 === 0 ? "1px solid #f0f0f0" : "none" }}>
            <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.82rem", marginBottom: 2 }}>{f.name}</div>
            <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 700, marginBottom: 4 }}>{f.type}</div>
            <div style={{ fontSize: "0.73rem", color: "#444", lineHeight: 1.35, marginBottom: 5 }}>{f.desc}</div>
            <div style={{ fontSize: "0.6rem", background: "#f0f0f0", display: "inline-block", padding: "2px 6px", color: "#555", fontWeight: 600 }}>📍 {f.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SafetyBlock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div style={{ ...CARD, padding: "18px", background: "var(--ec-black)", color: "var(--ec-white)" }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.14em", color: "#888", marginBottom: 6 }}>LINIE DE URGENȚĂ</div>
        <div style={{ fontFamily: "var(--ec-font-display)", fontSize: "1.4rem", fontWeight: 900, marginBottom: 3 }}>+40 741 069 443</div>
        <div style={{ fontSize: "0.75rem", color: "#aaa" }}>Safety Line EC — non-stop în festival</div>
      </div>
      <div style={{ ...CARD, padding: "14px", flex: 1 }}>
        <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>🦺</div>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.85rem", marginBottom: 5 }}>Red Team</div>
        <div style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>Vesta roșie în tot festivalul. Caută-i oricând ai nevoie.</div>
        <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#555", lineHeight: 1.5, borderTop: "1px solid #eee", paddingTop: 8 }}>🍹 <strong>Angel Shot</strong> — comandă la orice bar dacă te simți nesigur.</div>
      </div>
      <div style={{ ...CARD, padding: "14px" }}>
        <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>🏥</div>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.85rem", marginBottom: 5 }}>First Aid</div>
        <div style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>Posturi medicale lângă Main Stage, Ping Pong Stage, în potcoava castelului și în camping.</div>
      </div>
    </div>
  );
}

function ForbiddenBlock() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...CARD, height: "100%" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: open ? "var(--ec-black)" : "#fff8f8", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🚫</span>
          <span style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.92rem", fontWeight: 800, color: open ? "#fff" : "var(--ec-red)", letterSpacing: "0.02em" }}>CE ESTE INTERZIS</span>
        </div>
        <span style={{ fontSize: "0.78rem", fontWeight: 900, color: open ? "#fff" : "var(--ec-black)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {FORBIDDEN_ITEMS.map((cat, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${cat.color}`, paddingLeft: 12 }}>
              <div style={{ fontFamily: "var(--ec-font-display)", fontSize: "0.78rem", fontWeight: 800, color: cat.color, marginBottom: 6 }}>{cat.category}</div>
              {cat.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 6, fontSize: "0.78rem", color: "#333", marginBottom: 3 }}>
                  <span style={{ color: "#dc2626", fontWeight: "bold", flexShrink: 0 }}>✕</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ background: "#fff8e1", border: "1px solid #fcd34d", padding: "10px 12px", fontSize: "0.75rem", color: "#92400e", lineHeight: 1.5 }}>
            ⚠️ <strong>Permis:</strong> alimente non-alcoolice, aparat foto fără obiectiv detașabil, medicamente cu prescripție.
          </div>
        </div>
      )}
    </div>
  );
}

function StagesMap() {
  const [active, setActive] = useState(null);
  const stage = STAGES.find(s => s.id === active);
  return (
    <div style={CARD}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.95rem" }}>🗺️ Harta scenelor</div>
        <div style={{ fontSize: "0.72rem", color: "#888" }}>Click pe o scenă pentru detalii</div>
      </div>
      <div style={{ background: "#f9f6f0", borderBottom: "1px solid #eee" }}>
        <svg viewBox="0 0 500 320" style={{ width: "100%", display: "block" }}>
          <rect x="140" y="80" width="240" height="200" rx="4" fill="none" stroke="#d1c9b8" strokeWidth="1.5" strokeDasharray="6,4"/>
          <text x="260" y="72" textAnchor="middle" fontSize="10" fill="#aaa" fontFamily="sans-serif">Castelul Bánffy</text>
          <line x1="160" y1="240" x2="290" y2="155" stroke="#e5e7eb" strokeWidth="1.5"/>
          <line x1="290" y1="155" x2="390" y2="195" stroke="#e5e7eb" strokeWidth="1.5"/>
          <line x1="290" y1="155" x2="340" y2="145" stroke="#e5e7eb" strokeWidth="1.5"/>
          <line x1="160" y1="240" x2="300" y2="240" stroke="#e5e7eb" strokeWidth="1.5"/>
          <line x1="300" y1="240" x2="360" y2="270" stroke="#e5e7eb" strokeWidth="1.5"/>
          <rect x="410" y="230" width="60" height="28" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/>
          <text x="440" y="248" textAnchor="middle" fontSize="9" fill="#92400e" fontFamily="sans-serif" fontWeight="bold">INTRARE</text>
          <rect x="40" y="120" width="90" height="130" rx="4" fill="none" stroke="#4d7c0f" strokeWidth="1" strokeDasharray="4,3" opacity="0.5"/>
          <text x="85" y="115" textAnchor="middle" fontSize="9" fill="#4d7c0f" fontFamily="sans-serif">Camping</text>
          {STAGES.map(s => (
            <g key={s.id} onClick={() => setActive(active === s.id ? null : s.id)} style={{ cursor: "pointer" }}>
              <circle cx={s.x} cy={s.y} r={s.r + 5} fill="transparent"/>
              <circle cx={s.x} cy={s.y} r={s.r} fill={active === s.id ? s.color : "var(--ec-white)"} stroke={s.color} strokeWidth={active === s.id ? 0 : 2.5} style={{ transition: "all 0.2s" }}/>
              {active === s.id && <circle cx={s.x} cy={s.y} r={s.r + 4} fill="none" stroke={s.color} strokeWidth="1.5" opacity="0.4"/>}
              <text x={s.x} y={s.y - s.r - 5} textAnchor="middle" fontSize="8.5" fill={s.color} fontFamily="sans-serif" fontWeight="bold">{s.label.split(" ")[0]}</text>
            </g>
          ))}
        </svg>
      </div>
      {stage ? (
        <div style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, background: stage.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontSize: "1rem" }}>🎵</span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.92rem", color: stage.color }}>{stage.label}</div>
            <div style={{ fontSize: "0.75rem", color: "#555", marginTop: 1 }}>{stage.sub}</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "10px 20px", fontSize: "0.72rem", color: "#aaa", textAlign: "center" }}>Selectează o scenă de pe hartă</div>
      )}
    </div>
  );
}

function VeteranTipsBlock() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={CARD}>
      <div style={{ padding: "14px 20px", borderBottom: "2px solid var(--ec-black)", background: "var(--ec-black)" }}>
        <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 900, fontSize: "1rem", color: "var(--ec-white)" }}>⚡ SFATURI DE LA CEI CU EXPERIENȚĂ</div>
        <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 2 }}>Lucruri pe care le înveți doar după primul EC</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {TIPS.map((t, i) => (
          <button key={i} onClick={() => setExpanded(expanded === i ? null : i)}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", background: expanded === i ? "#fafafa" : "var(--ec-white)", border: "none", borderBottom: i < TIPS.length - 2 ? "1px solid #f0f0f0" : "none", borderRight: i % 2 === 0 ? "1px solid #f0f0f0" : "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{t.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--ec-font-display)", fontWeight: 800, fontSize: "0.82rem", color: "var(--ec-black)", marginBottom: expanded === i ? 5 : 0 }}>{t.tip}</div>
              {expanded === i && <div style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>{t.desc}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const G = { display: "grid", gap: 16 };
  const TWO = { ...G, gridTemplateColumns: "1fr 1fr" };

  return (
    <div>
      <div className="ec-page-header">
        <div className="ec-page-header__eyebrow">PENTRU PRIMA OARĂ</div>
        <h1 className="ec-page-header__title">GHIDUL<br/><span>PRIMULUI EC</span></h1>
        <p className="ec-page-header__sub">Tot ce trebuie să știi. Citește înainte, trăiești după.</p>
      </div>

      <div className="ec-page-content" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Row 1: Weather + Transport */}
        <div>
          <div style={{ ...TWO, marginBottom: 4 }}>
            <div><LABEL>VREME LA FESTIVAL</LABEL><WeatherBlock /></div>
            <div><LABEL>TRANSPORT DIN CLUJ</LABEL><TransportBlock /></div>
          </div>
          <a href="https://www.google.com/maps/dir/Gara+Cluj-Napoca/Iulius+Mall+Cluj/Expo+Transilvania+Cluj/Banffy+Castle+Bontida" target="_blank" rel="noreferrer"
            style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ec-black)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            🗺️ Vezi ruta completă pe Google Maps →
          </a>
        </div>

        {/* Row 2: Cazare + Checklist */}
        <div style={TWO}>
          <div><LABEL>CAZARE</LABEL><AccommodationBlock /></div>
          <div><LABEL>CHECKLIST BAGAJ</LABEL><PackingBlock /></div>
        </div>

        {/* Row 3: Cashless + Food */}
        <div style={TWO}>
          <div><LABEL>SISTEM CASHLESS</LABEL><CashlessBlock /></div>
          <div><LABEL>FOOD TRUCKS TOP</LABEL><FoodBlock /></div>
        </div>

        {/* Row 4: Siguranță + Interzise */}
        <div style={TWO}>
          <div><LABEL>SIGURANȚĂ</LABEL><SafetyBlock /></div>
          <div><LABEL>CHESTII INTERZISE</LABEL><ForbiddenBlock /></div>
        </div>

        {/* Row 5: Harta scenelor — full width */}
        <div><LABEL>HARTA SCENELOR</LABEL><StagesMap /></div>

        {/* Row 6: Veterani — full width */}
        <div><LABEL>SFATURI DE LA VETERANI</LABEL><VeteranTipsBlock /></div>

        <div className="ec-faq-cta">
          <p>Mai ai întrebări? Asistentul AI din colțul dreapta-jos știe totul.</p>
        </div>
      </div>
    </div>
  );
}