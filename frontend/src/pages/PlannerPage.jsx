import { useState, useRef, useEffect } from "react";
import { API_URL, getToken, ensureAuth, getSessionId } from "../utils";
import "./PlannerPage.css";

const STEPS = [
  {
    id: "first_time",
    question: "Prima oară la Electric Castle?",
    options: [
      { value: "yes", label: "Da, prima oară 🏰", desc: "Vreau să știu tot" },
      { value: "no", label: "Am mai fost", desc: "Știu cum stă treaba" },
    ],
  },
  {
    id: "origin",
    question: "De unde vii?",
    options: [
      { value: "cluj", label: "📍 Cluj-Napoca", desc: "Sunt local" },
      { value: "other_ro", label: "🚆 Altă localitate din RO", desc: "Vin din altă parte" },
      { value: "abroad", label: "✈️ Din afara țării", desc: "International traveler" },
    ],
  },
  {
    id: "days",
    question: "Câte zile stai?",
    options: [
      { value: "1", label: "1 zi", desc: "Fug și revin" },
      { value: "2", label: "2 zile", desc: "Weekend vibe" },
      { value: "5", label: "Toate 5 zilele", desc: "Full EC mode 🔥" },
    ],
  },
  {
    id: "company",
    question: "Cu cine vii?",
    options: [
      { value: "solo", label: "🧍 Singur", desc: "Solo adventure" },
      { value: "couple", label: "👫 Cuplu", desc: "Romantic chaos" },
      { value: "friends", label: "👯 Grup de prieteni", desc: "Gang's all here" },
      { value: "family", label: "👨‍👩‍👧 Familie cu copii", desc: "Family vibes" },
    ],
  },
  {
    id: "accommodation",
    question: "Unde dormi?",
    options: [
      { value: "tent", label: "⛺ Cort propriu", desc: "Festival hardcore" },
      { value: "glamping", label: "🛖 Glamping", desc: "Confort + festival" },
      { value: "hotel", label: "🏨 Hotel în Cluj", desc: "Naveta zilnică" },
    ],
  },
  {
    id: "music",
    question: "Ce muzică te aprinde?",
    options: [
      { value: "mainstream", label: "🎤 Pop / Mainstream", desc: "Main Stage headliners" },
      { value: "electronic", label: "🎛️ House / Techno", desc: "Booha & Stables" },
      { value: "alternative", label: "🎸 Alternativ / Rock", desc: "Hangar energy" },
      { value: "discovery", label: "🔍 Discovery mode", desc: "Artiști noi, surprize" },
    ],
  },
];

function StepIndicator({ current, total }) {
  return (
    <div className="planner-steps">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`planner-step-dot ${i < current ? "done" : ""} ${i === current ? "active" : ""}`}
        />
      ))}
    </div>
  );
}

function OptionCard({ option, selected, onClick }) {
  return (
    <button
      className={`planner-option ${selected ? "selected" : ""}`}
      onClick={() => onClick(option.value)}
    >
      <span className="planner-option-label">{option.label}</span>
      <span className="planner-option-desc">{option.desc}</span>
      {selected && <span className="planner-option-check">✓</span>}
    </button>
  );
}

function buildWhatsAppText(plan) {
  // Strip markdown to plain text for WhatsApp
  return "🏰 *Planul nostru pentru Electric Castle*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    plan
      .replace(/#{1,3} (.*)/g, "*$1*")
      .replace(/\*\*(.*?)\*\*/g, "*$1*")
      .replace(/^- /gm, "• ")
      .replace(/<[^>]+>/g, "")
      .trim() +
    "\n\n━━━━━━━━━━━━━━━━━━━━\n" +
    "📲 Plan generat pe electriccastle.ai";
}

function PlanDisplay({ plan, onReset, answers }) {
  const [displayedText, setDisplayedText] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGroupShare, setShowGroupShare] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setDisplayedText(plan);
    setDone(true);
  }, [plan]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  function handleCopyPlan() {
    const text = buildWhatsAppText(plan);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const formatPlan = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^### (.*?)$/gm, '<h3 class="plan-h3">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 class="plan-h2">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1 class="plan-h1">$1</h1>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="plan-list">${m}</ul>`)
      .replace(/\n\n/g, '</p><p class="plan-p">')
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="planner-result">
      <div className="planner-result-header">
        <div className="planner-result-icon">🏰</div>
        <div>
          <h2 className="planner-result-title">Planul tău EC</h2>
          <p className="planner-result-sub">Personalizat special pentru tine</p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="planner-result-body"
        dangerouslySetInnerHTML={{ __html: formatPlan(displayedText) }}
      />

      {done && (
        <>
          {/* Group Share Section */}
          <div className="planner-share-box">
            <div className="planner-share-header">
              <span className="planner-share-title">📲 Trimite planul în grupul de WhatsApp</span>
              <span className="planner-share-sub">Copiază și dă paste direct în chat</span>
            </div>
            <div className="planner-share-preview">
              <div className="planner-share-preview-header">
                <span>🏰 Planul nostru pentru Electric Castle</span>
              </div>
              <div className="planner-share-preview-body">
                {plan.split("\n").slice(0, 6).map((line, i) => (
                  <div key={i} style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.5 }}>
                    {line.replace(/[#*]/g, "").trim() || <br/>}
                  </div>
                ))}
                <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: 4 }}>...și mai mult</div>
              </div>
            </div>
            <button className="planner-share-btn" onClick={handleCopyPlan}>
              {copied ? "✓ Copiat! Dă paste în WhatsApp" : "📋 Copiază pentru grup"}
            </button>
          </div>

          <div className="planner-result-actions">
            <button className="planner-reset-btn" onClick={onReset}>
              ↩ Încearcă alt profil
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlannerPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;

  function handleSelect(value) {
    const newAnswers = { ...answers, [currentStep.id]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (step < totalSteps - 1) {
        setStep(step + 1);
      } else {
        generatePlan(newAnswers);
      }
    }, 300);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function buildPrompt(a) {
    const labels = {
      first_time: { yes: "prima oară la festival", no: "a mai fost la festival" },
      origin: { cluj: "din Cluj-Napoca", other_ro: "din altă localitate din România", abroad: "din afara țării" },
      days: { "1": "o singură zi", "2": "2 zile", "5": "toate cele 5 zile (miercuri-duminică)" },
      company: { solo: "singur", couple: "în cuplu", friends: "cu un grup de prieteni", family: "cu familia și copii" },
      accommodation: { tent: "doarme la cort", glamping: "la glamping", hotel: "la hotel în Cluj și face naveta" },
      music: { mainstream: "muzică pop/mainstream (Main Stage headliners)", electronic: "house și techno (Booha, Stables)", alternative: "muzică alternativă și rock (Hangar)", discovery: "vrea să descopere artiști noi" },
    };

    return `Construiește un plan personalizat pentru Electric Castle 2025 pentru o persoană cu următorul profil:
- Este ${labels.first_time[a.first_time]}
- Vine ${labels.origin[a.origin]}
- Stă ${labels.days[a.days]}
- Vine ${labels.company[a.company]}
- Cazare: ${labels.accommodation[a.accommodation]}
- Preferințe muzicale: ${labels.music[a.music]}

Creează un plan practic și specific care include:
1. Recomandare de transport (cum să ajungă, ce opțiuni are - trenuri EC, autobuze, mașina personală)
2. Sfaturi de cazare și logistică specifice situației lor
3. Plan pe zile cu activități, experiențe și stagii recomandate (bazat pe câte zile stau)
4. Top 3-5 artiști de urmărit bazat pe preferințele muzicale
5. Recomandări de mâncare și experiențe speciale potrivite profilului
6. 2-3 sfaturi practice specifice situației lor (ex: dacă e cu copii, dacă e prima oară etc.)

Fii specific, entuziast și util. Folosește informațiile reale despre EC 2025.`;
  }

  async function generatePlan(finalAnswers) {
    setLoading(true);
    setError(null);
    setStreamedText("");

    try {
      const authed = await ensureAuth();
      if (!authed) throw new Error("Auth failed");

      const prompt = buildPrompt(finalAnswers);
      setLoading(false);
      setStreaming(true);

      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ session_id: getSessionId() + "-planner", message: prompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line;
          if (jsonStr === "[DONE]") break;
          try {
            const data = JSON.parse(jsonStr);
            const token = data.token ?? data.text ?? data.content ?? "";
            if (token) {
              fullText += token;
              setStreamedText(fullText);
            }
          } catch { continue; }
        }
      }

      setPlan(fullText);
      setStreaming(false);
    } catch (err) {
      setError("Nu am putut genera planul. Verifică că serviciile rulează.");
      setLoading(false);
      setStreaming(false);
    }
  }

  function handleReset() {
    setStep(0);
    setAnswers({});
    setPlan(null);
    setStreamedText("");
    setError(null);
  }

  if (loading) {
    return (
      <div className="planner-loading">
        <div className="planner-loading-castle">🏰</div>
        <p className="planner-loading-text">Se construiește planul tău...</p>
        <div className="planner-loading-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  if (streaming || plan) {
    return (
      <div className="planner-wrap">
        <PlanDisplay plan={streaming ? streamedText : plan} onReset={handleReset} answers={answers} />
      </div>
    );
  }

  return (
    <div className="planner-wrap">
      <div className="planner-hero">
        <h1 className="planner-title">EC Planner</h1>
        <p className="planner-subtitle">6 întrebări. Planul tău perfect pentru festival.</p>
      </div>

      <div className="planner-card">
        <StepIndicator current={step} total={totalSteps} />

        <div className="planner-question-wrap">
          <p className="planner-step-label">Întrebarea {step + 1} din {totalSteps}</p>
          <h2 className="planner-question">{currentStep.question}</h2>
        </div>

        <div className="planner-options">
          {currentStep.options.map((opt) => (
            <OptionCard
              key={opt.value}
              option={opt}
              selected={answers[currentStep.id] === opt.value}
              onClick={handleSelect}
            />
          ))}
        </div>

        {step > 0 && (
          <button className="planner-back-btn" onClick={handleBack}>
            ← Înapoi
          </button>
        )}
      </div>

      {error && <div className="planner-error">⚠️ {error}</div>}
    </div>
  );
}