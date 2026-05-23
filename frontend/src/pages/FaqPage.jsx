import { useState, useMemo, useRef } from "react";
import "./FaqPage.css";

const FAQ_DATA = [
  {
    category: "Tickets & Personalization",
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
    category: "Camping & Cazare",
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
    category: "Cashless System",
    icon: "💳",
    items: [
      { q: "Cum funcționează sistemul cashless?", a: "Electric Castle funcționează 100% cashless. Încarci bani pe brățara RFID din aplicația EC sau de la stațiile fizice din festival și plătești la orice stand atingând brățara de terminal." },
      { q: "Unde pot încărca bani pe brățară?", a: "Credit Point-ul este doar la intrarea în festival, imediat după ce intri. Poți de asemenea încărca online din aplicația EC sau de pe site oricând." },
      { q: "Ce se întâmplă dacă pierd brățara?", a: "O poți bloca imediat din aplicația EC pentru a proteja soldul. Contactează echipa EC la standul de informații pentru o brățară de înlocuire." },
      { q: "Cum recuperez banii de pe brățară după festival?", a: "Rambursarea online este gratuită, disponibilă 30 de zile după festival. Rambursarea on-site are un comision de 3%. Accesează contul EC și mergi la secțiunea cashless." },
    ],
  },
  {
    category: "Mâncare & Băutură",
    icon: "🍔",
    items: [
      { q: "Ce opțiuni de mâncare există?", a: "Există foodcourturi principale (Royal Food Court, Castle Food Court, Hillside, Hangar) cu zeci de food trucks: pizza, burgeri, tex-mex, vegan, ethnic food (thai, indian, asian), fine dining și dulciuri. Aproape toți vendorii au cel puțin un preparat vegan." },
      { q: "Există opțiuni vegetariene/vegane?", a: "Da. Zero (complet vegan), Wok'n Roll (noodles cu legume), ThaiMe (dumpling veggies), Fumuri la Hangar (Mac & Cheese), Cimbru (sandwich halloumi). Taste of Transylvania are platou de vinete vegan și ciorbă de ciuperci." },
      { q: "Unde pot lua micul dejun?", a: "RedBarn (spanac cremos cu ouă), UMami în castel (Huevos Rotos), Royal Breakfast by Lidl în camping (simplu și accesibil). Zona de camping are bar 24/24." },
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
      { q: "Există servicii medicale?", a: "Da, First Aid se găsește lângă Main Stage, lângă Premium Parking, lângă scena Ping Pong by Burn, în potcoava castelului spre Backyard și în camping lângă dușuri." },
    ],
  },
  {
    category: "EC Village",
    icon: "🏕️",
    items: [
      { q: "Ce este EC Village?", a: "EC Village este zona de camping și servicii a festivalului, deschisă din miercuri 15 iulie la 12:00. Include camping, glamping, dușuri, activări sponsori, Camping Stage și toate facilitățile pentru campatori." },
      { q: "Ce activități sunt în camping?", a: "Body & Mind by World Class, Beach Volley by Men Expert, Bodega by Havana, Burn Energy Lounge, Fizz It Up by Schweppes, E.ON Charging Point, Chill Tent Aliat, Royal Breakfast și Persil Laundromat." },
      { q: "Există locuri de blocare a bagajelor?", a: "Da, Lockere by Eurolife FFH sunt disponibile pe aleea de exit și la VIP. Nu există lockere în camping." },
      { q: "Pot intra în festival cu mașina?", a: "Accesul auto este restricționat în festival. Există Uber/Taxi Pickup Point pe lângă camping spre podul din Bonțida și Go Bicycle Parking la intrarea în EC Village." },
    ],
  },
];

// Toate întrebările posibile pentru autocomplete
const ALL_QUESTIONS = FAQ_DATA.flatMap(cat => cat.items.map(i => i.q));
const ALL_TOPICS = FAQ_DATA.map(cat => cat.category);
const SUGGESTIONS = [...ALL_TOPICS, ...ALL_QUESTIONS];

function getCompletion(input) {
  if (!input || input.length < 2) return "";
  const lower = input.toLowerCase();
  const match = SUGGESTIONS.find(s => s.toLowerCase().startsWith(lower));
  if (!match) return "";
  return match.slice(input.length); // doar sufixul
}

function SearchBar({ value, onChange, onSubmit }) {
  const completion = getCompletion(value);
  const inputRef = useRef(null);

  function handleKeyDown(e) {
    if ((e.key === "Tab" || e.key === "ArrowRight") && completion) {
      e.preventDefault();
      onChange(value + completion);
    } else if (e.key === "Enter") {
      onSubmit();
    }
  }

  return (
    <div className="faq-search-wrap">
      <div className="faq-search-box">
        <svg className="faq-search-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <div className="faq-search-inner">
          {/* Ghost text pentru autocomplete */}
          {value && completion && (
            <span className="faq-autocomplete-ghost" aria-hidden="true">
              <span style={{ color: "transparent" }}>{value}</span>
              <span className="faq-autocomplete-suffix">{completion}</span>
            </span>
          )}
          <input
            ref={inputRef}
            className="faq-search-input"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value ? "" : "Start here and search..."}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        {value && (
          <button className="faq-search-clear" onClick={() => onChange("")}>✕</button>
        )}
        <button className="faq-search-btn" onClick={onSubmit}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      {value && completion && (
        <p className="faq-autocomplete-hint">Tab sau → pentru a completa</p>
      )}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`}>
      <button className="faq-item-q" onClick={() => setOpen(o => !o)}>
        <span className="faq-item-arrow">{open ? "↑" : "↓"}</span>
        <span>{q}</span>
      </button>
      {open && <div className="faq-item-a">{a}</div>}
    </div>
  );
}

function TopicView({ topic, onBack }) {
  return (
    <div className="faq-topic-view">
      <button className="faq-back-btn" onClick={onBack}>
        ← BACK TO MAIN TOPICS
      </button>
      <h2 className="faq-topic-title">
        <span>{topic.icon}</span> {topic.category}
      </h2>
      <div className="faq-items-list">
        {topic.items.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}

function SearchResults({ results, query }) {
  if (results.length === 0) {
    return (
      <div className="faq-no-results">
        <p>Nu am găsit rezultate pentru <strong>"{query}"</strong>.</p>
        <p>Încearcă cu alt termen sau folosește asistentul AI 👇</p>
      </div>
    );
  }
  return (
    <div className="faq-topic-view">
      <p className="faq-results-count">{results.length} rezultate pentru <strong>"{query}"</strong></p>
      <div className="faq-items-list">
        {results.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [search, setSearch]       = useState("");
  const [submitted, setSubmitted] = useState("");
  const [activeTopic, setActiveTopic] = useState(null);

  function handleSubmit() {
    setSubmitted(search);
    setActiveTopic(null);
  }

  const searchResults = useMemo(() => {
    if (!submitted) return [];
    const q = submitted.toLowerCase();
    const results = [];
    FAQ_DATA.forEach(cat => {
      cat.items.forEach(item => {
        if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
          results.push(item);
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
      <div className="faq-header">
        <h1 className="faq-title">FAQ</h1>
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); if (!v) setSubmitted(""); }}
          onSubmit={handleSubmit}
        />
      </div>

      <div className="faq-body">
        {showTopics && (
          <>
            <h2 className="faq-main-topics-title">MAIN TOPICS</h2>
            <div className="faq-topics-list">
              {FAQ_DATA.map((cat, i) => (
                <button
                  key={i}
                  className="faq-topic-btn"
                  onClick={() => setActiveTopic(cat)}
                >
                  <span className="faq-topic-btn-label">
                    <span className="faq-topic-btn-icon">{cat.icon}</span>
                    {cat.category}
                  </span>
                  <span className="faq-topic-btn-arrow">→</span>
                </button>
              ))}
            </div>
            <div className="faq-bottom-cta">
              <p>Nu ai găsit răspunsul? Asistentul AI e în colțul dreapta-jos 👇</p>
            </div>
          </>
        )}

        {showTopic && (
          <TopicView topic={activeTopic} onBack={() => setActiveTopic(null)} />
        )}

        {showSearch && (
          <SearchResults results={searchResults} query={submitted} />
        )}
      </div>
    </div>
  );
}