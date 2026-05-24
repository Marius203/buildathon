import { useState, useMemo, useRef, useEffect } from "react";
import "./FaqPage.css";

const FAQ_DATA = [
  {
    category: "Bilete & Acces",
    icon: "🎫",
    items: [
      { q: "Ce tipuri de bilete există?", a: "Abonament 4 zile (cel mai popular), bilet zilnic, pachet cu camping inclus și VIP cu zone exclusive, toalete separate și spații dedicate. Cumpără exclusiv de pe site-ul oficial — revânzătorii vând bilete false." },
      { q: "Cum activez brățara cashless?", a: "Primești brățara la intrare la schimbul biletului. O activezi în contul tău EC online, pe pagina cashless. După înregistrare poți încărca bani și vedea soldul. Poți face asta înainte sau după ce primești brățara." },
      { q: "Pot transfera biletul altcuiva?", a: "Da, biletele pot fi transferate prin platforma oficială EC. Accesează contul tău, secțiunea My Tickets, și folosește opțiunea de transfer. Nu transfera prin intermediari." },
      { q: "Cum recuperez banii rămași pe brățară?", a: "Rambursarea online este gratuită și se poate face în 30 de zile după festival. Dacă alegi rambursarea pe loc, se aplică un comision de 3%." },
    ],
  },
  {
    category: "Transport",
    icon: "🚌",
    items: [
      { q: "Cum ajung la festival din Cluj-Napoca?", a: "Trenurile EC sunt cea mai rapidă opțiune — pleacă din Gara Mică (Cluj-Napoca) spre Jucu. Există și autobuze non-stop din Iulius Mall și Expo Transilvania. Biletele se cumpără online pe entertix.ro/ec-transport." },
      { q: "Care este programul trenurilor EC?", a: "Miercuri 16 iulie: 17:55, 19:15. Joi–vineri: 16:28, 17:55, 18:27, 19:15, 20:30. Sâmbătă: 14:56, 16:28, 17:55, 18:27, 19:15, 20:30. Duminică: 14:56, 16:28, 17:55, 19:15." },
      { q: "Pot veni cu mașina personală?", a: "Da, există parcare dedicată la Iulius Mall de unde poți lua autobuzul spre festival. Drumul spre Bonțida poate fi blocat în orele de vârf — calculează timp suplimentar. Nu se recomandă parcarea la fața locului." },
      { q: "Există transport de la aeroport?", a: "Nu există shuttle direct de la aeroport spre festival. Ia un taxi/Uber din aeroport spre Cluj-Napoca, apoi folosești trenul EC sau autobuzul non-stop spre festival." },
    ],
  },
  {
    category: "Cazare & Camping",
    icon: "⛺",
    items: [
      { q: "Ce variante de cazare există?", a: "Camping standard (aduci propriul cort), Glamping (corturi premium pre-instalate cu paturi, se rezervă rapid), hotel în Cluj-Napoca (30km distanță, naveta zilnică cu shuttle) sau pensiuni în Bonțida (raritate)." },
      { q: "De când este deschis campingul?", a: "Campingul este deschis din luni înainte de festival. Porțile festivalului se deschid conform programului oficial. EC Village funcționează 24 de ore din 24 în timpul festivalului." },
      { q: "Unde sunt dușurile și toaletele?", a: "Dușurile sunt doar în centrul campingului. Toaletele se găsesc lângă scena Backyard, între Hangar și Royal Grill, în spatele Ping Pong Stage, între Main Stage și deal, și în zona de camping." },
      { q: "Pot veni cu rulota sau cortul auto?", a: "Există zone dedicate Car Camping și RV Camping, disponibile la cumpărarea biletului. Verifică pagina de bilete pentru prețuri și disponibilitate." },
    ],
  },
  {
    category: "Festival Area",
    icon: "🏰",
    items: [
      { q: "Care sunt scenele și ce muzică cântă?", a: "Main Stage (pop/mainstream/headlineri), Hangar by BT (alternativ/indie/rock), Booha by glo (house/disco/melodic techno), Hideout (afro house/organic house), The Beach (funk/soul/caribbean), Stables (techno/ro-minimal), Backyard (world music), Ping Pong (oldies/guilty pleasures), Camping Stage (de la 12:00)." },
      { q: "Cum mă orientez în festival?", a: "Descarcă aplicația EC și salvează harta offline. Main Stage-ul e în capătul aleei centrale, Booha e în centru lângă EC Billboard, Hangar e după Hideout, Stables e în potcoava castelului. Calculează 10-15 minute de mers între scene." },
      { q: "Unde găsesc ATM și puncte de încărcare?", a: "ATM-ul e imediat la intrare în festival, lângă magazinul oficial. Puncte de încărcare găsești la foodcourtul central, la activările sponsorilor, lângă roata panoramică, la copacii dintre roată și Booha și în EC Village." },
      { q: "Există zone VIP?", a: "Da, VIP Lounge by Mastercard este lângă Main Stage. Există și platformă pentru persoane cu dizabilități în centrul spațiului de la Main Stage, deasupra sonoriștilor." },
    ],
  },
  {
    category: "Cashless & Plăți",
    icon: "💳",
    items: [
      { q: "Cum funcționează sistemul cashless?", a: "Electric Castle funcționează 100% cashless. Încarci bani pe brățara RFID din aplicația EC sau de la stațiile fizice din festival și plătești la orice stand atingând brățara de terminal." },
      { q: "Unde pot încărca bani pe brățară?", a: "Credit Point-ul este doar la intrarea în festival, imediat după ce intri. Poți de asemenea încărca online din aplicația EC sau de pe site oricând." },
      { q: "Ce se întâmplă dacă pierd brățara?", a: "O poți bloca imediat din aplicația EC pentru a proteja soldul. Contactează echipa EC la standul de informații pentru o brățară de înlocuire." },
    ],
  },
  {
    category: "Mâncare & Băutură",
    icon: "🍔",
    items: [
      { q: "Ce opțiuni de mâncare există?", a: "Există foodcourturi principale (Royal Food Court, Castle Food Court, Hillside, Hangar) cu zeci de food trucks: pizza, burgeri, tex-mex, vegan, ethnic food (thai, indian, asian), fine dining și dulciuri. Aproape toți vendorii au cel puțin un preparat vegan." },
      { q: "Există opțiuni vegetariene/vegane?", a: "Da. Zero (complet vegan), Wok'n Roll (noodles cu legume), ThaiMe (dumpling veggies), Fumuri la Hangar (Mac & Cheese), Cimbru (sandwich halloumi). Taste of Transylvania are platou de vinete vegan și ciorbă de ciuperci." },
      { q: "Pot aduce mâncare și băutură de acasă?", a: "Poți aduce alimente și băuturi non-alcoolice în cantități rezonabile. Sticlele de sticlă și recipientele metalice cu margini ascuțite sunt interzise la intrare." },
    ],
  },
  {
    category: "Siguranță & Reguli",
    icon: "🛡️",
    items: [
      { q: "Ce nu este permis la festival?", a: "Interzis: sticle de sticlă, recipiente metalice cu margini ascuțite, droguri, animale de companie, generatoare personale, drone fără acreditare, arme. Permis: alimente non-alcoolice, umbrele, aparat foto fără obiectiv detașabil." },
      { q: "Care este numărul de urgență al festivalului?", a: "Safety Line: +40 741 069 443. Găsești echipa Red Team în tot festivalul, gata să ajute oricând." },
      { q: "Ce fac dacă mă simt nesigur?", a: "Comandă un 'Angel Shot' la orice bar — cineva din echipă va veni să te ajute discret. Poți găsi Red Team-ul în orice colț al festivalului. Nu ești niciodată singur." },
    ],
  },
];

const ALL_QUESTIONS = FAQ_DATA.flatMap(cat => cat.items.map(i => i.q));
const ALL_TOPICS    = FAQ_DATA.map(cat => cat.category);

function getSuggestions(input) {
  if (!input || input.length < 2) return [];
  const lower = input.toLowerCase();
  const topicMatches = ALL_TOPICS.filter(s => s.toLowerCase().includes(lower)).map(s => ({ label: s, type: "categorie" }));
  const qMatches     = ALL_QUESTIONS.filter(s => s.toLowerCase().includes(lower)).map(s => ({ label: s, type: "întrebare" }));
  const all = [...topicMatches, ...qMatches];
  all.sort((a, b) => {
    const aStart = a.label.toLowerCase().startsWith(lower) ? 0 : 1;
    const bStart = b.label.toLowerCase().startsWith(lower) ? 0 : 1;
    return aStart - bStart;
  });
  return all.slice(0, 6);
}

function SearchBar({ value, onChange, onSubmit }) {
  const [focused, setFocused]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef                  = useRef(null);
  const wrapRef                   = useRef(null);

  const suggestions = getSuggestions(value);
  const showDrop    = focused && suggestions.length > 0;

  useEffect(() => { setActiveIdx(-1); }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pickSuggestion(label, type) {
    onChange(label);
    setFocused(false);
    setTimeout(() => onSubmit(label, type), 0);
  }

  function handleKeyDown(e) {
    if (showDrop) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        return;
      }
      if ((e.key === "Tab" || e.key === "Enter") && activeIdx >= 0) {
        e.preventDefault();
        pickSuggestion(suggestions[activeIdx].label, suggestions[activeIdx].type);
        return;
      }
      if (e.key === "Escape") { setFocused(false); return; }
    }
    if (e.key === "Enter") onSubmit();
  }

  function highlight(label) {
    const lower = value.toLowerCase();
    const idx   = label.toLowerCase().indexOf(lower);
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <strong>{label.slice(idx, idx + value.length)}</strong>
        {label.slice(idx + value.length)}
      </>
    );
  }

  return (
    <div className="faq-search-wrap" ref={wrapRef}>
      <div className={`faq-search-box ${showDrop ? "faq-search-box--open" : ""}`}>
        <svg className="faq-search-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        <input
          ref={inputRef}
          className="faq-search-input"
          value={value}
          onChange={e => { onChange(e.target.value); setFocused(true); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Caută orice despre festival..."
          autoComplete="off"
          spellCheck="false"
          aria-autocomplete="list"
          aria-expanded={showDrop}
        />

        {value && (
          <button className="faq-search-clear" onClick={() => { onChange(""); inputRef.current?.focus(); }} aria-label="Șterge">✕</button>
        )}

        <button className="faq-search-btn" onClick={() => onSubmit()} aria-label="Caută">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {showDrop && (
        <ul className="faq-suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === activeIdx}
              className={`faq-suggestion-item ${i === activeIdx ? "faq-suggestion-item--active" : ""}`}
              onMouseDown={e => { e.preventDefault(); pickSuggestion(s.label, s.type); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="faq-suggestion-type">{s.type === "categorie" ? "📂" : "❓"}</span>
              <span className="faq-suggestion-label">{highlight(s.label)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqItem({ q, a, delayIndex = 0, badge, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`faq-box ${open ? "faq-box--open" : ""}`}
      style={{ animationDelay: `${delayIndex * 0.06}s` }}
    >
      {badge && <span className="faq-result-badge">{badge}</span>}

      <button className="faq-box-q" onClick={() => setOpen(o => !o)}>
        <span className="faq-box-q-text">{q}</span>
        <span className="faq-box-q-icon">+</span>
      </button>

      <div className={`faq-box-a ${open ? "faq-box-a--open" : ""}`}>
        <div className="faq-box-a-inner">
          <div className="faq-box-a-content">
            <p>{a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicView({ topic, onBack }) {
  return (
    <div className="faq-topic-view">
      <button className="faq-back-btn" onClick={onBack}>
        ← Înapoi la categorii
      </button>

      <h2 className="faq-topic-title">
        <span>{topic.icon}</span>
        {topic.category}
      </h2>
      <p className="faq-topic-subtitle">{topic.items.length} întrebări frecvente</p>

      <div className="faq-items-list">
        {topic.items.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} delayIndex={i} />
        ))}
      </div>
    </div>
  );
}

function SearchResults({ results, query, onBack, exactQuestion }) {
  if (results.length === 0) {
    return (
      <div className="faq-no-results ec-fade-in">
        <div className="faq-no-results-icon">🔍</div>
        <p>Niciun rezultat pentru <strong>"{query}"</strong>.</p>
        <p style={{ fontSize: "0.82rem", color: "#777", fontWeight: 400 }}>
          Încearcă un cuvânt mai scurt sau navighează la o categorie.
        </p>
        <button className="faq-back-btn" onClick={onBack} style={{ margin: "20px auto 0", alignSelf: "center" }}>
          ← Înapoi
        </button>
      </div>
    );
  }

  return (
    <div className="faq-topic-view">
      <div className="faq-results-header">
        <button className="faq-back-btn" onClick={onBack}>← Înapoi</button>
        <p className="faq-results-count">{results.length} răspunsuri pentru „{query}"</p>
      </div>

      <div className="faq-items-list">
        {results.map((item, i) => (
          <FaqItem
            key={i}
            q={item.q}
            a={item.a}
            delayIndex={i}
            badge={item._cat}
            defaultOpen={exactQuestion ? item.q === exactQuestion : false}
          />
        ))}
      </div>
    </div>
  );
}

function FaqMarquee() {
  const text = "⚡ ELECTRIC CASTLE 2025 • BONȚIDA, CLUJ • 10–13 IULIE • ";
  return (
    <div className="faq-marquee" aria-hidden="true">
      <div className="faq-marquee__inner">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [search, setSearch]           = useState("");
  const [submitted, setSubmitted]     = useState("");
  const [activeTopic, setActiveTopic] = useState(null);
  const [exactQuestion, setExactQuestion] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTopic, submitted]);

  function handleSubmit(override, type) {
    const q = (typeof override === "string" ? override : search).trim();
    if (!q) return;

    if (type === "categorie") {
      const topic = FAQ_DATA.find(cat => cat.category === q);
      if (topic) {
        setSubmitted("");
        setExactQuestion(null);
        setActiveTopic(topic);
        return;
      }
    }

    const isExactQuestion = ALL_QUESTIONS.includes(q);
    setExactQuestion(isExactQuestion ? q : null);
    setSubmitted(q);
    setActiveTopic(null);
  }

  function handleBack() {
    setSubmitted("");
    setSearch("");
    setActiveTopic(null);
    setExactQuestion(null);
  }

  const searchResults = useMemo(() => {
    if (!submitted) return [];
    const q = submitted.toLowerCase();
    const results = [];
    FAQ_DATA.forEach(cat => {
      cat.items.forEach(item => {
        if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
          results.push({ ...item, _cat: cat.category });
        }
      });
    });
    return results;
  }, [submitted]);

  const showSearch = submitted.length > 0;
  const showTopic  = !showSearch && activeTopic !== null;
  const showTopics = !showSearch && activeTopic === null;

  return (
    <div className="faq-page">
      <div className="faq-hero">
        <div className="faq-hero-inner">
          <div className="faq-hero-eyebrow">Întrebări frecvente</div>
          <h1 className="faq-title">Got<br/><em>questions?</em></h1>
          <p className="faq-hero-sub">Electric Castle 2025 · Bonțida, Cluj</p>
          <SearchBar
            value={search}
            onChange={v => { setSearch(v); if (!v) setSubmitted(""); }}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <FaqMarquee />

      <div className="faq-body">
        {showTopics && (
          <div className="ec-fade-in">
            <div className="faq-section-label">Alege o categorie</div>
            <div className="faq-topics-grid">
              {FAQ_DATA.map((cat, i) => (
                <button
                  key={i}
                  className="faq-topic-card"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => setActiveTopic(cat)}
                >
                  <span className="faq-topic-card-icon">{cat.icon}</span>
                  <span className="faq-topic-card-title">{cat.category}</span>
                  <span className="faq-topic-card-count">{cat.items.length} întrebări</span>
                  <span className="faq-topic-card-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showTopic && (
          <TopicView topic={activeTopic} onBack={() => setActiveTopic(null)} />
        )}

        {showSearch && (
          <SearchResults
            results={searchResults}
            query={submitted}
            onBack={handleBack}
            exactQuestion={exactQuestion}
          />
        )}
      </div>
    </div>
  );
}