import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// ─── REVEAL ON SCROLL COMPONENT ───
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // Only animate once
        }
      },
      { threshold: 0.15 } // Triggers when 15% of the element is visible
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ec-reveal ${visible ? "ec-reveal--visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── INFINITE MARQUEE COMPONENT ───
function Marquee() {
  const text = "⚡ 10–13 IULIE 2025 • BONȚIDA, CLUJ • BUKU • SKRILLEX • PEGGY GOU • ";
  return (
    <div className="ec-marquee">
      <div className="ec-marquee__inner">
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

const INFO_CARDS = [
  { icon: "🚌", title: "Transport", desc: "Shuttle din Cluj direct la Bonțida. Simplu și fără stres de parcare sau trafic." },
  { icon: "🏕️", title: "Cazare",   desc: "Camping, glamping sau hotel în Cluj. Există o opțiune pentru fiecare buget." },
  { icon: "🎵", title: "Muzică",   desc: "5 scene, genuri diferite, energie non-stop 4 zile și 4 nopți." },
  { icon: "🌧️", title: "Vreme",   desc: "Ploaia face parte din experiența EC. Cizmele de cauciuc sunt obligatorii morale." },
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
      <Reveal>
        <div className="ec-hero__eyebrow">Prima dată la festival?</div>
      </Reveal>
      
      <Reveal delay={100}>
        <h1 className="ec-hero__title">
          <span className="ec-hero__title-electric">ELECTRIC</span>
          <span className="ec-hero__title-castle">CASTLE</span>
        </h1>
      </Reveal>

      <Reveal delay={200}>
        <div className="ec-hero__date">10–13 Iulie 2025 · Bonțida, Cluj</div>
      </Reveal>

      <Reveal delay={300}>
        <div className="ec-hero__cta-group">
          <Link to="/guide" className="ec-btn--primary">Ghidul Primului EC</Link>
          <Link to="/faq" className="ec-btn--outline">Întrebări Frecvente</Link>
        </div>
      </Reveal>

      <div className="ec-hero__scroll-hint">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </div>
  );
}

function InfoSection({ onTopicClick }) {
  return (
    <section className="ec-info">
      <div className="ec-info__inner">
        <Reveal>
          <div className="ec-section-label">CE TREBUIE SĂ ȘTII</div>
          <h2 className="ec-info__title">TOTUL ARE SENS ODATĂ CE EȘTI ACOLO</h2>
        </Reveal>
        
        <div className="ec-info__grid">
          {INFO_CARDS.map((card, index) => (
            <Reveal key={card.title} delay={index * 100}>
              <div 
                className="ec-info__card ec-hover-glitch"
                onClick={() => onTopicClick && onTopicClick(card.title)}
                style={{ cursor: "pointer" }}
              >
                <div className="ec-info__card-icon">{card.icon}</div>
                <h3 className="ec-info__card-title">{card.title}</h3>
                <p className="ec-info__card-desc">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        
        <Reveal delay={400}>
          <div className="ec-info__cta">
            <Link to="/guide" className="ec-btn--outline-dark">Vezi ghidul complet →</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LineupSection() {
  return (
    <section className="ec-lineup">
      <div className="ec-lineup__inner">
        <Reveal>
          <div className="ec-section-label ec-section-label--light">DESCOPERA</div>
          <h2 className="ec-lineup__title">DISCOVER THE STAGES</h2>
          <p className="ec-lineup__sub">5 scene, zeci de artiști, o singură experiență</p>
        </Reveal>
        
        <div className="ec-lineup__stages">
          {STAGES.map((s, index) => (
            <Reveal key={s.label} delay={index * 100}>
              <span className={`ec-lineup__stage ec-lineup__stage--${s.size} ec-floating`}>
                {s.label}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage({ onTopicClick }) {
  return (
    <>
      <Hero/>
      <Marquee />
      <InfoSection onTopicClick={onTopicClick}/>
      <LineupSection/>
    </>
  );
}