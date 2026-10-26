"use client";

import { useMemo, useState } from "react";
import DATA from "../data.json";

const GODS = DATA.gods;
const QUESTIONS = DATA.questions;
const PRONOUN_QUESTION = Object.keys(QUESTIONS).find((q) => q.toLowerCase().includes("pronombres"));
const QUESTION_NAMES = [...Object.keys(QUESTIONS).filter((q) => q !== PRONOUN_QUESTION), PRONOUN_QUESTION];
const THREE_BIG = new Set(["Zeus", "Poseidón", "Hades"]);
const CABIN_BY_GOD = {
  Zeus: 1, Eolo: 1, Hera: 2, Poseidón: 3, Demeter: 4, Deméter: 4, Perséfone: 4,
  Ares: 5, Deimos: 5, Fobos: 5, Atenea: 6, Apolo: 7, Asclepio: 7, Higía: 7,
  Artemisa: 8, Hefesto: 9, Afrodita: 10, Hermes: 11, Hebe: 11, Jano: 11,
  Harmonía: 11, Dionisio: 12, Hades: 13, Iris: 14, Hypnos: 15, Tánatos: 15,
  Nix: 15, Némesis: 16, Hécate: 20,
};
const getCabin = (god) => CABIN_BY_GOD[god] ?? 11;

function calculateScores(answers, pronouns) {
  const scores = Object.fromEntries(GODS.map((god) => [god, 0]));
  for (const [question, answer] of Object.entries(answers)) {
    if (question === PRONOUN_QUESTION) continue;
    const rule = QUESTIONS[question]?.[answer];
    for (const god of rule?.gods ?? []) if (god in scores) scores[god] += 1;
  }
  if (pronouns.includes("Él")) scores.Artemisa = 0;
  return scores;
}

function getCandidates(scores) {
  const ranked = GODS.map((god, index) => ({ god, score: scores[god], index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const positive = ranked.filter((item) => item.score > 0);
  if (!positive.length) return { candidates: [], ranked, hermesTieRule: false };
  const maxScore = positive[0].score;
  const tiedTop = positive.filter((item) => item.score === maxScore).map((item) => item.god);
  const allowedBig = tiedTop.length === 1 && THREE_BIG.has(tiedTop[0]) ? new Set([tiedTop[0]]) : new Set();
  const filtered = positive.filter((item) => !THREE_BIG.has(item.god) || allowedBig.has(item.god));
  const hermesTieRule = tiedTop.length >= 3;
  let candidates;
  if (hermesTieRule) {
    const topAllowed = filtered.filter((item) => tiedTop.includes(item.god) && item.god !== "Hermes");
    candidates = [{ god: "Hermes", score: scores.Hermes ?? 0 }];
    candidates.push(...topAllowed.slice(0, 2).map(({ god, score }) => ({ god, score })));
    for (const item of filtered) {
      if (candidates.length >= 3) break;
      if (!candidates.some((c) => c.god === item.god)) candidates.push({ god: item.god, score: item.score });
    }
  } else {
    candidates = filtered.slice(0, 3).map(({ god, score }) => ({ god, score }));
  }
  const seen = new Set();
  candidates = candidates.filter((item) => {
    if (seen.has(item.god)) return false;
    seen.add(item.god);
    return true;
  }).slice(0, 3);
  return { candidates, ranked, hermesTieRule };
}

export default function Home() {
  const [stage, setStage] = useState("cirse");
  const [cirseInput, setCirseInput] = useState("");
  const [cirse, setCirse] = useState("");
  const [answers, setAnswers] = useState({});
  const [pronouns, setPronouns] = useState([]);
  const [step, setStep] = useState(0);
  const [manualGod, setManualGod] = useState(GODS[0]);
  const [selectedGod, setSelectedGod] = useState("");
  const [selectedOption, setSelectedOption] = useState("candidate-0");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const scores = useMemo(() => calculateScores(answers, pronouns), [answers, pronouns]);
  const { candidates, ranked, hermesTieRule } = useMemo(() => getCandidates(scores), [scores]);
  const question = QUESTION_NAMES[step];
  const isPronounQuestion = question === PRONOUN_QUESTION;
  const cabin = getCabin(selectedGod || manualGod);

  async function continueWithCirse(event) {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch(`/api/campista?cirse=${encodeURIComponent(cirseInput.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo consultar el Circe.");
      if (result.status === "missing") throw new Error("El Circe no existe.");
      if (result.status === "occupied") throw new Error("Circe no disponible.");
      setCirse(result.cirse);
      setAnswers({}); setPronouns([]); setStep(0); setStage("test");
    } catch (e) { setError(e.message || "No pudimos consultar la base de datos."); }
    finally { setBusy(false); }
  }

  function saveCurrentAnswer() {
    if (isPronounQuestion) setPronouns((current) => current);
    else setAnswers((current) => ({ ...current, [question]: current[question] ?? Object.keys(QUESTIONS[question])[0] }));
  }

  function goNext() {
    setError(""); setNotice("");
    if (!isPronounQuestion) {
      setAnswers((current) => ({
        ...current,
        [question]: current[question] ?? Object.keys(QUESTIONS[question])[0],
      }));
    }
    if (step < QUESTION_NAMES.length - 1) setStep((s) => s + 1);
    else {
      setSelectedOption(candidates.length ? "candidate-0" : "manual");
      setManualGod(GODS[0]);
      setStage("choice");
    }
  }
  function goPrevious() {
    setError(""); setNotice("");
    if (step > 0) setStep((s) => s - 1);
  }

  async function confirmResult() {
    const god = selectedOption.startsWith("candidate-")
      ? candidates[Number(selectedOption.split("-")[1])]?.god
      : manualGod;
    if (!god) { setError("Elegí una deidad antes de confirmar."); return; }
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/campista", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cirse, god, cabin: getCabin(god) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el resultado.");
      setSelectedGod(god); setStage("done");
    } catch (e) { setError(e.message || "No pudimos guardar el resultado."); }
    finally { setBusy(false); }
  }

  function restart() {
    setStage("cirse"); setCirseInput(""); setCirse(""); setAnswers({}); setPronouns([]);
    setStep(0); setManualGod(GODS[0]); setSelectedGod(""); setSelectedOption("candidate-0");
    setError(""); setNotice(""); setBusy(false);
  }

  return (
    <main className="shell">
      <header className="brand"><span className="bolt">⚡</span><div><h1>Test de filiación divina</h1><p>DEMIGODS ARG</p></div></header>
      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert info">{notice}</div>}

      {stage === "cirse" && <section className="panel">
        <p className="intro">Ingresá únicamente el número de Circe que te asignó el equipo.</p>
        <form onSubmit={continueWithCirse}>
          <label htmlFor="cirse">Número de Circe</label>
          <input id="cirse" value={cirseInput} onChange={(e) => setCirseInput(e.target.value)} placeholder="Ej.: 1042" inputMode="numeric" autoComplete="off" />
          <button className="primary full" disabled={busy}>{busy ? "Consultando…" : "Continuar"}</button>
        </form>
      </section>}

      {stage === "test" && question && <section className="panel">
        <div className="meta"><span>Circe: {cirse}</span><span>Pregunta {step + 1} de {QUESTION_NAMES.length}</span></div>
        <div className="progress"><div style={{ width: `${((step + 1) / QUESTION_NAMES.length) * 100}%` }} /></div>
        <h2>{question}</h2>
        {isPronounQuestion ? <>
          <p className="muted">Podés seleccionar todas las opciones que quieras.</p>
          <fieldset className="options"><legend>¿Qué pronombres usás para referirte a vos?</legend>
            {["Él", "Ella", "Elle"].map((p) => <label className="check-option" key={p}>
              <input type="checkbox" checked={pronouns.includes(p)} onChange={(e) => setPronouns((current) => e.target.checked ? [...current, p] : current.filter((x) => x !== p))} /> {p}
            </label>)}
          </fieldset>
        </> : <fieldset className="options">
          <legend>Elegí una opción:</legend>
          {Object.keys(QUESTIONS[question]).map((option) => <label className="radio-option" key={option}>
            <input type="radio" name={`question-${step}`} checked={(answers[question] ?? Object.keys(QUESTIONS[question])[0]) === option} onChange={() => setAnswers((current) => ({ ...current, [question]: option }))} />
            <span>{option}</span>
          </label>)}
        </fieldset>}
        <div className="button-row">
          <button className="secondary" onClick={goPrevious} disabled={step === 0}>← Anterior</button>
          <button className="primary" onClick={goNext}>{step === QUESTION_NAMES.length - 1 ? "Ver resultados →" : "Siguiente →"}</button>
        </div>
      </section>}

      {stage === "choice" && <section className="panel">
        <h2>Elegí tu filiación divina</h2>
        <p className="intro">Podés elegir uno de los resultados del test o seleccionar manualmente cualquier deidad.</p>
        {hermesTieRule && <div className="alert info">Hubo un empate de tres o más dioses en el puntaje máximo: se aplica la regla de Hermes.</div>}
        {candidates.length > 0 ? <fieldset className="options">
          <legend>Opciones</legend>
          {candidates.map((candidate, i) => <label className="radio-option" key={candidate.god}>
            <input type="radio" name="final-choice" checked={selectedOption === `candidate-${i}`} onChange={() => setSelectedOption(`candidate-${i}`)} />
            <span><strong>{candidate.god}</strong><small>{candidate.score} {candidate.score === 1 ? "punto" : "puntos"}</small></span>
          </label>)}
          <label className="radio-option">
            <input type="radio" name="final-choice" checked={selectedOption === "manual"} onChange={() => setSelectedOption("manual")} />
            <span>Elegir manualmente</span>
          </label>
        </fieldset> : <div className="alert info">No hay resultados positivos para ofrecer. Podés elegir manualmente una deidad.</div>}
        {(!candidates.length || selectedOption === "manual") && <div className="manual-select">
          <label htmlFor="manual-god">Elegí el dios o la diosa</label>
          <select id="manual-god" value={manualGod} onChange={(e) => setManualGod(e.target.value)}>
            {GODS.map((god) => <option key={god}>{god}</option>)}
          </select>
        </div>}
        <div className="summary">
          <p><span>Deidad elegida</span><strong>{selectedOption.startsWith("candidate-") && candidates[Number(selectedOption.split("-")[1])] ? candidates[Number(selectedOption.split("-")[1])].god : manualGod}</strong></p>
          <p><span>Cabaña asignada</span><strong>{getCabin(selectedOption.startsWith("candidate-") && candidates[Number(selectedOption.split("-")[1])] ? candidates[Number(selectedOption.split("-")[1])].god : manualGod)}</strong></p>
        </div>
        <p className="muted">Al confirmar, se guardarán únicamente <code>deidad</code> y <code>cabana</code> en la fila de tu Circe.</p>
        <button className="primary full" onClick={confirmResult} disabled={busy}>{busy ? "Guardando…" : "Confirmar filiación divina"}</button>
        <button className="text-button" onClick={() => { setStep(QUESTION_NAMES.length - 1); setStage("test"); setError(""); }}>Volver a las preguntas</button>
      </section>}

      {stage === "done" && <section className="panel success-panel">
        <div className="success-icon">✓</div><h2>¡Filiación divina registrada!</h2>
        <p>Tu deidad es <strong>{selectedGod}</strong> y tu cabaña es la número <strong>{getCabin(selectedGod)}</strong>.</p>
        <p className="muted">Ya podés cerrar esta página.</p>
        <button className="primary full" onClick={restart}>Volver al inicio</button>
      </section>}

      <details className="review">
        <summary>Puntajes del test (modo de revisión)</summary>
        <p className="muted">Los puntajes aparecerán después de responder las preguntas.</p>
        {ranked.map(({ god, score }) => <div className="score-row" key={god}><span>{god}</span><strong>{score}</strong></div>)}
      </details>
      <footer>Demigods ARG · Test de filiación divina</footer>
    </main>
  );
}
