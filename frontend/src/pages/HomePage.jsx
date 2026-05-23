import { Link } from "react-router-dom";

const INFO_CARDS = [
  { icon: "🚌", title: "Transport", desc: "Shuttle din Cluj direct la Bonțida. Simplu și fără stres de parcare sau trafic." },
  { icon: "🏕️", title: "Cazare",   desc: "Camping, glamping sau hotel în Cluj. Există o opțiune pentru fiecare buget." },
  { icon: "🎵", title: "Muzică",   desc: "5 scene, genuri diferite, energie non-stop 4 zile și 4 nopți." },
  { icon: "🌧️", title: "Vreme",   desc: "Ploaia face parte din experiență. Cizmele de cauciuc sunt obligatorii morale." },
];

const STAGES = [
  { label: "Main Stage",     size: "featured" },
  { label: "Forest Stage",   size: "mid"      },
  { label: "Electric Stage", size: "mid"      },
  { label: "Live Stage",     size: "sm"       },
  { label: "Secret Stage",   size: "sm"       },
];

function Hero() {
  return (
    <div className="ec-hero">
      <div className="ec-hero__eyebrow">Prima dată la festival?</div>
      <h1 className="ec-hero__title">
        <span className="ec-hero__title-electric">ELECTRIC</span>
        <span className="ec-hero__title-castle">CASTLE</span>
      </h1>
      <div className="ec-hero__date">10–13 Iulie 2025 · Bonțida, Cluj</div>
      <div className="ec-hero__cta-group">
        <Link to="/guide" className="ec-btn--primary">Ghidul Primului EC</Link>
        <Link to="/faq" className="ec-btn--outline">Întrebări Frecvente</Link>
      </div>
      <div className="ec-hero__scroll-hint">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </div>
  );
}

function InfoSection() {
  return (
    <section className="ec-info">
      <div className="ec-info__inner">
        <div className="ec-section-label">CE TREBUIE SĂ ȘTII</div>
        <h2 className="ec-info__title">TOTUL ARE SENS ODATĂ CE EȘTI ACOLO</h2>
        <div className="ec-info__grid">
          {INFO_CARDS.map(card => (
            <div key={card.title} className="ec-info__card">
              <div className="ec-info__card-icon">{card.icon}</div>
              <h3 className="ec-info__card-title">{card.title}</h3>
              <p className="ec-info__card-desc">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="ec-info__cta">
          <Link to="/guide" className="ec-btn--outline-dark">Vezi ghidul complet →</Link>
        </div>
      </div>
    </section>
  );
}

function LineupSection() {
  return (
    <section className="ec-lineup">
      <div className="ec-lineup__inner">
        <div className="ec-section-label ec-section-label--light">DESCOPERA</div>
        <h2 className="ec-lineup__title">DISCOVER THE STAGES</h2>
        <p className="ec-lineup__sub">5 scene, zeci de artiști, o singură experiență</p>
        <div className="ec-lineup__stages">
          {STAGES.map(s => (
            <span key={s.label} className={`ec-lineup__stage ec-lineup__stage--${s.size}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero/>
      <InfoSection/>
      <LineupSection/>
    </>
  );
}
