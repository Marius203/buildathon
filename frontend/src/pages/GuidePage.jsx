const GUIDE_SECTIONS = [
  {
    icon: "🚌",
    title: "Cum ajungi",
    color: "#3b82f6",
    items: [
      "Shuttle din Cluj-Napoca — rezervă imediat după bilet, se termină rapid",
      "Plecare cu mașina? Contează parcare plătită și trafic de retur",
      "Carpool pe grupurile de Facebook EC — comunitate activă",
      "Evită să conduci dacă planifici să bei — taxis/ridesharing funcționează",
    ],
  },
  {
    icon: "⛺",
    title: "Cazare",
    color: "#22c55e",
    items: [
      "Camping standard — aduce propriul cort, cel mai ieftin, atmosferă mare",
      "Glamping — confort premium, rezervă-l ziua lansării biletelor",
      "Hotel în Cluj — confort maxim, naveta zilnică cu shuttle",
      "Rezervă cazarea devreme, mai ales glamping și pensiuni locale",
    ],
  },
  {
    icon: "🎒",
    title: "Ce să iei",
    color: "#f59e0b",
    items: [
      "Cizme de cauciuc sau ghete impermeabile — obligatoriu",
      "Poncho impermeabil — ia-l de acasă, nu de la festival",
      "Powerbank de 20.000+ mAh — bateria nu ține 4 zile",
      "Lanternă frontală pentru deplasări nocturne în camping",
      "Cremă de soare, insecticid, dopuri de urechi",
    ],
  },
  {
    icon: "💳",
    title: "Sistemul Cashless",
    color: "#8b5cf6",
    items: [
      "Festival 100% fără numerar — totul prin brățara RFID",
      "Încarci din aplicație sau de la stații în festival",
      "Banii rămas se rambursează online după festival",
      "Blochează brățara din aplicație dacă o pierzi",
      "Sfat: încarcă mai mult — mai ușor să ceri rambursare",
    ],
  },
  {
    icon: "🍕",
    title: "Mâncare & Băutură",
    color: "#ef4444",
    items: [
      "Mănâncă bine înainte să intri — prețurile sunt ridicate în festival",
      "Apă potabilă gratuită la stații — folosește sticle reutilizabile",
      "Varietate mare de food trucks — de la burgeri la mâncare thai",
      "Alcoolul e mai scump seara la concerte — planifică bugetul",
    ],
  },
  {
    icon: "🎵",
    title: "Cele 5 Scene",
    color: "#ec4899",
    items: [
      "Main Stage — headlinerii principali, cele mai mari show-uri",
      "Forest Stage — techno, electronic, atmosferă de pădure",
      "Electric Stage — pop, indie, alternative",
      "Live Stage — trupe live, jazz, world music",
      "Secret Stage — surprize, genuri neașteptate, locul de descoberit",
    ],
  },
  {
    icon: "🌧️",
    title: "Vreme & Ploaie",
    color: "#06b6d4",
    items: [
      "Ploaia e garantată — nu e o surpriză, e parte din experiență",
      "Glodul devine intens după ploaie — cizmele sunt esențiale",
      "Verifică prognoza cu o zi înainte pentru fiecare zi",
      "Husă impermeabilă pentru telefon dacă plouă puternic",
      "Cortul tău trebuie testat acasă înainte — nu descoperi scurgerile acolo",
    ],
  },
  {
    icon: "📍",
    title: "Orientare & Întâlniri",
    color: "#10b981",
    items: [
      "Descarcă harta offline în aplicație înainte să pleci",
      "Stabilește puncte de întâlnire fixe cu prietenii — semnalul e slab seara",
      "Ore fixe de întâlnire sunt mai fiabile decât apelurile",
      "Semnul vizibil (steag, pălărie) te face de găsit în mulțime",
      "WhatsApp funcționează pe WiFi-ul festivalului",
    ],
  },
];

const PRO_TIPS = [
  "Ajunge joi seara să prinzi un loc bun de camping înainte de aglomerație",
  "Headlinerii cântă târziu — dacă vrei să-i prinzi, fii pregătit după miezul nopții",
  "Programul se schimbă — verifică aplicația în fiecare dimineață",
  "Merchandise-ul cel mai bun se termină în prima zi",
  "Castelul în sine merită vizitat dimineața, când e liniște",
  "Grupurile de WhatsApp cu prietenii sunt salvarea ta când semnalul e slab",
  "Un mic rucsac de zi e mai practic decât o geantă mare la concerte",
];

export default function GuidePage() {
  return (
    <div>
      <div className="ec-page-header">
        <div className="ec-page-header__eyebrow">PENTRU PRIMA OARĂ</div>
        <h1 className="ec-page-header__title">
          GHIDUL<br/><span>PRIMULUI EC</span>
        </h1>
        <p className="ec-page-header__sub">
          Tot ce trebuie să știi în 8 capitole. Citește înainte, trăiește după.
        </p>
      </div>

      <div className="ec-page-content">

        <div className="ec-guide-intro">
          <p>
            Electric Castle e mai mult decât un festival — e o experiență cu propriile sale reguli.
            Dacă e prima dată, e normal să ai întrebări. Ghidul ăsta le răspunde pe toate, pe scurt.
          </p>
        </div>

        <div className="ec-guide-grid">
          {GUIDE_SECTIONS.map(section => (
            <div key={section.title} className="ec-guide-card">
              <div className="ec-guide-card__icon">{section.icon}</div>
              <h3 className="ec-guide-card__title" style={{ color: section.color }}>
                {section.title}
              </h3>
              <ul className="ec-guide-card__list">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ec-guide-tip">
          <div className="ec-guide-tip__title">⚡ SFATURI DE LA CEI CU EXPERIENȚĂ</div>
          <ul className="ec-guide-tip__list">
            {PRO_TIPS.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className="ec-faq-cta">
          <p>Mai ai întrebări specifice?</p>
          <p>Asistentul AI din colțul dreapta-jos știe totul despre EC — întreabă orice. 👇</p>
        </div>

      </div>
    </div>
  );
}
