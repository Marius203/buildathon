import { useState } from "react";

const FAQ_DATA = [
  {
    category: "transport",
    icon: "🚌",
    q: "Cum ajung la Electric Castle?",
    a: (
      <>
        <p>Ai mai multe opțiuni să ajungi la Bonțida:</p>
        <ul>
          <li><strong>Shuttle din Cluj-Napoca</strong> — cea mai comodă variantă. Plecări regulate din puncte fixe (Parcul Central, Iulius Mall). Costă ~50–70 RON dus-întors. Rezervă imediat după ce cumperi biletul — se termină rapid!</li>
          <li><strong>Mașina personală</strong> — parcare plătită disponibilă, dar drumul poate fi blocat seara. Calculează timp suplimentar.</li>
          <li><strong>Carpool</strong> — grupurile de Facebook ale EC sunt active. Găsești cu ușurință cu cine să mergi.</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat pro:</strong> Shuttle-urile din ultimele zile se epuizează primele. Rezervă dus-întors de la început.
        </p>
      </>
    ),
  },
  {
    category: "wristband",
    icon: "💳",
    q: "Ce este brățara cashless și cum funcționează?",
    a: (
      <>
        <p>Electric Castle funcționează <strong>100% cashless</strong>. La intrare primești o brățară cu cip RFID pe care o încarci cu bani.</p>
        <ul>
          <li>Încarci bani din aplicația EC sau de la stațiile fizice din festival</li>
          <li>Plătești la orice stand atingând brățara de terminal</li>
          <li>Soldul rămas la final se poate <strong>rambursa online</strong> în 30 de zile</li>
          <li>Dacă pierzi brățara, o poți bloca din aplicație</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat pro:</strong> Încarcă mai mult decât crezi că cheltuiești. Mai bine ceri rambursare decât stai la coadă să reîncarci la 2 noaptea.
        </p>
      </>
    ),
  },
  {
    category: "packing",
    icon: "🎒",
    q: "Ce să iau cu mine la festival?",
    a: (
      <>
        <p><strong>Absolut necesare:</strong></p>
        <ul>
          <li>🥾 Cizme de cauciuc sau ghete impermeabile — non-negociabil</li>
          <li>☔ Poncho sau geacă impermeabilă (ponchourile din festival costă triplu)</li>
          <li>🔋 Powerbank mare — bateria nu ține 4 zile de fotografiat și navigat</li>
          <li>🎫 Bilet + act de identitate valid</li>
          <li>💊 Medicamente personale (la farmacie ești departe)</li>
        </ul>
        <p style={{ marginTop: 10 }}><strong>Recomandate:</strong></p>
        <ul>
          <li>Lanternă frontală pentru camping noaptea</li>
          <li>Cremă de soare + insecticid</li>
          <li>Husă impermeabilă pentru telefon</li>
          <li>Dopuri de urechi (câteva ore de somn sunt posibile cu ele)</li>
          <li>Pungă de plastic mare pentru bocanci noroioși în cort</li>
        </ul>
      </>
    ),
  },
  {
    category: "camping",
    icon: "⛺",
    q: "Pot campa la festival? Ce variante de cazare există?",
    a: (
      <>
        <p>Campingul e parte esențială din experiența EC. Opțiunile tale:</p>
        <ul>
          <li><strong>Camping standard</strong> — aduci propriul cort, cel mai ieftin, comunitate mare</li>
          <li><strong>Glamping</strong> — corturi premium pre-instalate cu paturi. Se rezervă rapid, costă mai mult</li>
          <li><strong>Hotel în Cluj-Napoca</strong> — confort maxim, dar 30km distanță și naveta zilnică cu shuttle</li>
          <li><strong>Cazări în Bonțida</strong> — câteva pensiuni în sat, raritate</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat pro:</strong> Glamping-ul se rezervă în câteva ore de la lansarea biletelor. Dacă îl vrei, fii pregătit.
        </p>
      </>
    ),
  },
  {
    category: "tickets",
    icon: "🎫",
    q: "Ce tipuri de bilete există?",
    a: (
      <>
        <p>Biletele principale pentru Electric Castle:</p>
        <ul>
          <li><strong>Abonament 4 zile</strong> — acces complet la toate zilele. Cea mai populară și mai rentabilă opțiune.</li>
          <li><strong>Bilet zilnic</strong> — dacă poți merge doar 1-2 zile. Disponibilitate limitată.</li>
          <li><strong>Pachet cu camping</strong> — abonament + loc de camping inclus.</li>
          <li><strong>VIP</strong> — zone exclusive, toalete separate, spații de relaxare dedicate, mai puțin aglomerat.</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fee2e2", borderLeft: "3px solid #ef4444", fontSize: 14 }}>
          ⚠️ <strong>Atenție:</strong> Cumpără bilete <strong>exclusiv de pe site-ul oficial</strong>. Revânzătorii vând bilete false.
        </p>
      </>
    ),
  },
  {
    category: "rules",
    icon: "🚫",
    q: "Ce nu este permis la festival?",
    a: (
      <>
        <p><strong>Interzis la intrare:</strong></p>
        <ul>
          <li>Sticle de sticlă sau recipiente metalice cu margini ascuțite</li>
          <li>Droguri de orice fel — există controale la intrare</li>
          <li>Animale de companie (chiar și în zona de camping)</li>
          <li>Generatoare personale</li>
          <li>Drone fără acreditare specială</li>
          <li>Arme sau obiecte contondente</li>
        </ul>
        <p style={{ marginTop: 10 }}><strong>Ce poți aduce:</strong> alimente și băuturi non-alcoolice în cantități rezonabile, umbrele, aparat foto fără obiectiv detașabil, rucsacuri.</p>
      </>
    ),
  },
  {
    category: "lineup",
    icon: "🎵",
    q: "Cum funcționează programul artiștilor?",
    a: (
      <>
        <p>Câteva lucruri esențiale despre program:</p>
        <ul>
          <li>Programul complet apare cu câteva zile înainte pe site și în aplicație</li>
          <li>Headlinerii cântă noaptea — uneori și după miezul nopții</li>
          <li>Programele se suprapun des — imposibil să prinzi tot, prioritizează din timp</li>
          <li>Scenele sunt răspândite pe proprietate — calculează 10-15 minute de mers între ele</li>
          <li>Schimbările de ultim moment există — verifică aplicația în fiecare dimineață</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat pro:</strong> Fă o listă cu top 5 artiști musts și construiește restul programului în jurul lor.
        </p>
      </>
    ),
  },
  {
    category: "weather",
    icon: "🌧️",
    q: "Ce fac dacă plouă? (și plouă mereu)",
    a: (
      <>
        <p>Ploaia la Electric Castle e o certitudine, nu o surpriză. Castelul Bánffy = glod garantat.</p>
        <ul>
          <li>Cizmele de cauciuc nu sunt opționale — sunt obligatorii morale</li>
          <li>Ponchourile din festival costă de 3x mai mult — aduce-l de acasă</li>
          <li>Husă impermeabilă pentru telefon — esențială dacă plouă puternic</li>
          <li>Aleile devin noroioase noaptea — mișcă-te cu atenție</li>
          <li>Cortul tău trebuie să fie impermeabil — verifică înainte să pleci</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4", borderLeft: "3px solid #22c55e", fontSize: 14 }}>
          🌈 Ploaia creează unele dintre cele mai memorabile momente la EC. Zâmbești mai mult decât te gândești!
        </p>
      </>
    ),
  },
  {
    category: "meetup",
    icon: "📍",
    q: "Cum mă găsesc cu prietenii la festival?",
    a: (
      <>
        <p>Semnalul mobil poate fi slab la orele de vârf (seara). Soluții practice:</p>
        <ul>
          <li>Stabilește <strong>puncte de întâlnire fixe</strong> înainte — "stânga de la Main Stage", "la intrarea în zona de camping"</li>
          <li>Ore fixe de întâlnire dacă vă separați — nu depinde de apeluri</li>
          <li>Descarcă harta festivalului <strong>offline</strong> în aplicație</li>
          <li>Powerbank mereu încărcat — bateria descărcată = izolat</li>
          <li>WhatsApp funcționează pe WiFi-ul festivalului chiar și fără semnal</li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat pro:</strong> Un steag mic, o pălărie colorată sau orice semn vizibil te face de găsit în mulțime.
        </p>
      </>
    ),
  },
  {
    category: "money",
    icon: "💰",
    q: "Cât costă în total un weekend la Electric Castle?",
    a: (
      <>
        <p>Estimare realistă pentru 4 zile (per persoană, 2025):</p>
        <ul>
          <li>Bilet abonament: <strong>700–1.000 RON</strong></li>
          <li>Transport (shuttle): <strong>50–120 RON</strong></li>
          <li>Cazare — camping (cort propriu): <strong>100–150 RON</strong> / Glamping: <strong>600–1.200 RON</strong></li>
          <li>Mâncare și băutură în festival: <strong>150–400 RON/zi</strong> (prețurile sunt ridicate)</li>
          <li>Diverse (merchandise, urgențe): <strong>100–200 RON</strong></li>
        </ul>
        <p style={{ marginTop: 12, padding: "10px 14px", background: "#fff8e1", borderLeft: "3px solid #f59e0b", fontSize: 14 }}>
          ⚡ <strong>Sfat economie:</strong> Mănâncă bine înainte să intri, hidratează-te cu apă de la stațiile gratuite din festival, evită cocktailurile premium.
        </p>
      </>
    ),
  },
];

const CATEGORIES = [
  { key: "all",       label: "Toate" },
  { key: "transport", label: "🚌 Transport" },
  { key: "camping",   label: "⛺ Cazare" },
  { key: "packing",   label: "🎒 Bagaj" },
  { key: "wristband", label: "💳 Cashless" },
  { key: "lineup",    label: "🎵 Program" },
  { key: "weather",   label: "🌧️ Vreme" },
  { key: "money",     label: "💰 Buget" },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ec-faq-item">
      <button
        className={`ec-faq-question${open ? " ec-faq-question--open" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ec-faq-icon">{item.icon}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{item.q}</span>
        <svg
          className={`ec-faq-chevron${open ? " ec-faq-chevron--open" : ""}`}
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="ec-faq-answer">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all"
    ? FAQ_DATA
    : FAQ_DATA.filter(item => item.category === activeCategory);

  return (
    <div>
      <div className="ec-page-header">
        <div className="ec-page-header__eyebrow">PRIMA DATĂ LA EC</div>
        <h1 className="ec-page-header__title">
          ÎNTREBĂRI<br/><span>FRECVENTE</span>
        </h1>
        <p className="ec-page-header__sub">
          Tot ce trebuie să știi înainte de prima ta vizită la Electric Castle
        </p>
      </div>

      <div className="ec-page-content">
        <div className="ec-faq-category-filter">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`ec-faq-category-btn${activeCategory === cat.key ? " ec-faq-category-btn--active" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="ec-faq-list">
          {filtered.map((item, i) => (
            <FaqItem key={i} item={item}/>
          ))}
        </div>

        <div className="ec-faq-cta">
          <p>Nu ai găsit răspunsul?</p>
          <p>Folosește asistentul AI din colțul dreapta-jos — e acolo pentru asta. 👇</p>
        </div>
      </div>
    </div>
  );
}
