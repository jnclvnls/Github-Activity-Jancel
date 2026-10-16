import React, { useState, useEffect } from 'react';

const INITIAL = { current: "0", previous: "", operation: null, resetScreen: false, memory: 0, history: [] };
const SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const round = (n) => Math.round(n * 1e12) / 1e12;

const calculate = (p, c, op) => {
  if (op === '+') return p + c;
  if (op === '-') return p - c;
  if (op === '*') return p * c;
  if (op === '/') return c === 0 ? null : p / c;
  return c;
};

const LOVE = "I LOVE YOU";
const isText = (s) => s === "Error" || s === LOVE;

const formatDisplay = (num) => {
  if (isText(num) || num === "" || num.includes("e")) return num;
  const [integer, decimal] = num.split(".");
  const neg = integer.startsWith("-");
  const digits = integer.replace("-", "");
  const intDisplay = digits === "" ? "" : Number(digits).toLocaleString("en", { maximumFractionDigits: 0 });
  return `${neg ? "-" : ""}${intDisplay}${decimal != null ? "." + decimal : ""}`;
};

export default function App() {
  const [calc, setCalc] = useState(INITIAL);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const clear = () => setCalc(prev => ({ ...INITIAL, memory: prev.memory, history: prev.history }));

  const del = () => setCalc(prev => {
    if (prev.resetScreen || isText(prev.current)) return { ...prev, current: "0", resetScreen: false };
    const next = prev.current.slice(0, -1);
    return { ...prev, current: next === "" || next === "-" ? "0" : next };
  });

  const append = (num) => setCalc(prev => {
    if (prev.resetScreen || isText(prev.current)) return { ...prev, current: num === "." ? "0." : num, resetScreen: false };
    if (num === "." && prev.current.includes(".")) return prev;
    if (prev.current === "0" && num !== ".") return { ...prev, current: num };
    if (prev.current.replace(/[-.]/g, "").length >= 15) return prev;
    return { ...prev, current: prev.current + num };
  });

  const chooseOp = (op) => setCalc(prev => {
    if (isText(prev.current)) return prev;
    if (prev.previous !== "" && !prev.resetScreen) {
      const res = calculate(parseFloat(prev.previous), parseFloat(prev.current), prev.operation);
      if (res === null) return { ...prev, current: "Error", previous: "", operation: null, resetScreen: true };
      const r = round(res).toString();
      return { ...prev, current: r, previous: r, operation: op, resetScreen: true };
    }
    return { ...prev, previous: prev.current, operation: op, resetScreen: true };
  });

  const compute = () => setCalc(prev => {
    if (!prev.operation || prev.previous === "") return prev;
    const p = parseFloat(prev.previous);
    const c = parseFloat(prev.current);
    if (prev.operation === '+' && prev.previous === "1" && prev.current === "1") {
      return { ...prev, current: LOVE, previous: "", operation: null, resetScreen: true };
    }
    const res = calculate(p, c, prev.operation);
    if (res === null) return { ...prev, current: "Error", previous: "", operation: null, resetScreen: true };
    const r = round(res).toString();
    const entry = { expr: `${formatDisplay(prev.previous)} ${SYMBOL[prev.operation]} ${formatDisplay(prev.current)}`, result: r };
    return { ...prev, current: r, previous: "", operation: null, resetScreen: true, history: [entry, ...prev.history].slice(0, 20) };
  });

  const unary = (kind) => setCalc(prev => {
    if (isText(prev.current)) return prev;
    const c = parseFloat(prev.current);
    let res;
    if (kind === 'sqrt') res = c < 0 ? null : Math.sqrt(c);
    if (kind === 'square') res = c * c;
    if (kind === 'inverse') res = c === 0 ? null : 1 / c;
    if (kind === 'percent') res = prev.previous !== "" && (prev.operation === '+' || prev.operation === '-')
      ? (parseFloat(prev.previous) * c) / 100
      : c / 100;
    if (kind === 'sign') res = c * -1;
    if (res === null || !isFinite(res)) return { ...prev, current: "Error", previous: "", operation: null, resetScreen: true };
    if (kind === 'sign' && c === 0) return prev;
    return { ...prev, current: round(res).toString(), resetScreen: kind !== 'sign' && kind !== 'percent' ? true : prev.resetScreen };
  });

  const useHistory = (result) => {
    setCalc(prev => ({ ...prev, current: result, previous: "", operation: null, resetScreen: true }));
    setShowHistory(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(calc.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) { /* clipboard unavailable */ }
  };

  // Keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '.') append(k);
      else if (['+', '-', '*', '/'].includes(k)) { e.preventDefault(); chooseOp(k); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); compute(); }
      else if (k === 'Backspace') del();
      else if (k === 'Escape' || k === 'c' || k === 'C') clear();
      else if (k === '%') unary('percent');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const display = formatDisplay(calc.current);
  const sizeClass = display.length > 14 ? "xs" : display.length > 9 ? "sm" : "";
  const opClass = (o) => `btn btn-op ${calc.operation === o && calc.resetScreen ? "active" : ""}`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Inter", -apple-system, "Segoe UI", system-ui, sans-serif; }
        :root {
          --ink: #0f2a5c; --muted: #6b7fa8; --blue: #2563eb; --blue-dark: #1d4ed8; --cyan: #06b6d4;
          --ice: #e6f0ff; --ice-2: #d4e4ff; --line: #dbe7fb; --mem: #e0f7fa; --mem-ink: #0e7490;
        }
        body { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
          background: radial-gradient(circle at 12% 8%, #cfe4ff 0, transparent 45%), radial-gradient(circle at 92% 92%, #bdeaff 0, transparent 45%), linear-gradient(180deg, #ffffff, #eef5ff); }
        .app { width: min(460px, calc(100vw - 32px)); flex-shrink: 0; }
        .title { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(90deg, var(--blue), var(--cyan)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .calculator { position: relative; background: rgba(255,255,255,0.88); border: 1px solid #fff; border-radius: 30px; padding: 20px; box-shadow: 0 30px 60px -20px rgba(37,99,235,0.35), 0 2px 0 #fff inset; overflow: hidden; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; min-height: 28px; }
        .badge { font-size: 0.75rem; font-weight: 600; color: var(--mem-ink); background: var(--mem); padding: 4px 10px; border-radius: 999px; }
        .badge.hidden { visibility: hidden; }
        .link { border: none; background: var(--ice); color: var(--blue-dark); font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 6px 12px; border-radius: 999px; }
        .link:hover { background: var(--ice-2); }
        .display { width: 100%; background: linear-gradient(180deg, #ffffff, #f2f7ff); border: 1px solid var(--line); border-radius: 20px; padding: 16px 18px; text-align: right; margin-bottom: 16px; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; font: inherit; color: inherit; overflow: hidden; box-shadow: inset 0 2px 8px rgba(37,99,235,0.07); }
        .previous-operand { color: var(--muted); font-size: 0.95rem; min-height: 22px; font-variant-numeric: tabular-nums; }
        .current-operand { color: var(--ink); font-size: 2.6rem; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .current-operand.sm { font-size: 1.9rem; }
        .current-operand.xs { font-size: 1.4rem; }
        .keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .btn { height: 56px; font-size: 1.15rem; font-weight: 600; border: none; border-radius: 18px; cursor: pointer; transition: all 0.15s ease; user-select: none; }
        .btn:active { transform: scale(0.94); }
        .btn:focus-visible, .link:focus-visible, .display:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
        .btn-num { background: #fff; color: var(--ink); box-shadow: 0 2px 0 var(--line), 0 8px 14px -8px rgba(37,99,235,0.3); }
        .btn-num:hover { background: #f4f8ff; }
        .btn-fn { background: var(--ice); color: var(--blue-dark); font-size: 1rem; }
        .btn-fn:hover { background: var(--ice-2); }
        .btn-op { background: linear-gradient(180deg, #4f8cff, var(--blue)); color: #fff; font-size: 1.4rem; box-shadow: 0 8px 16px -8px rgba(37,99,235,0.8); }
        .btn-op:hover { filter: brightness(1.07); }
        .btn-op.active { background: #fff; color: var(--blue); box-shadow: 0 0 0 2px var(--blue); }
        .btn-eq { background: linear-gradient(135deg, var(--cyan), var(--blue)); color: #fff; font-size: 1.5rem; box-shadow: 0 8px 18px -8px rgba(6,182,212,0.9); }
        .btn-eq:hover { filter: brightness(1.07); }
        .span2 { grid-column: span 2; }
        .history { position: absolute; inset: 0; background: #f7faff; padding: 20px; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.25s ease; z-index: 2; }
        .history.open { transform: translateY(0); }
        .history-list { flex: 1; overflow-y: auto; margin-top: 8px; }
        .history-item { display: block; width: 100%; text-align: right; background: none; border: none; border-bottom: 1px solid var(--line); padding: 12px 4px; cursor: pointer; }
        .history-item:hover { background: #fff; }
        .history-expr { display: block; color: var(--muted); font-size: 0.9rem; }
        .history-result { display: block; color: var(--ink); font-size: 1.3rem; font-weight: 700; font-variant-numeric: tabular-nums; }
        .empty { color: var(--muted); text-align: center; margin-top: 48px; font-size: 0.95rem; }
        @media (prefers-reduced-motion: reduce) { .history, .btn { transition: none; } }
      `}</style>

      <div className="app">
        <div className="calculator">
          <div className="topbar">
            <h1 className="title">Calculator</h1>
            <button className="link" onClick={() => setShowHistory(true)}>History</button>
          </div>

          <button className="display" onClick={copy} title="Click to copy result" aria-label="Current value, click to copy">
            <div className="previous-operand">
              {copied ? "Copied" : <>{formatDisplay(calc.previous)} {calc.operation && SYMBOL[calc.operation]}</>}
            </div>
            <div className={`current-operand ${sizeClass}`}>{display}</div>
          </button>

          <div className="keypad">
            <button className="btn btn-fn" onClick={() => unary('square')}>x²</button>
            <button className="btn btn-fn" onClick={() => unary('sqrt')}>√</button>
            <button className="btn btn-fn" onClick={() => unary('inverse')}>1/x</button>
            <button className="btn btn-fn" onClick={() => unary('percent')}>%</button>

            <button className="btn btn-fn" onClick={clear}>AC</button>
            <button className="btn btn-fn" onClick={del}>DEL</button>
            <button className="btn btn-fn" onClick={() => unary('sign')}>±</button>
            <button className={opClass('/')} onClick={() => chooseOp('/')}>÷</button>

            {['7','8','9'].map(n => <button key={n} className="btn btn-num" onClick={() => append(n)}>{n}</button>)}
            <button className={opClass('*')} onClick={() => chooseOp('*')}>×</button>

            {['4','5','6'].map(n => <button key={n} className="btn btn-num" onClick={() => append(n)}>{n}</button>)}
            <button className={opClass('-')} onClick={() => chooseOp('-')}>−</button>

            {['1','2','3'].map(n => <button key={n} className="btn btn-num" onClick={() => append(n)}>{n}</button>)}
            <button className={opClass('+')} onClick={() => chooseOp('+')}>+</button>

            <button className="btn btn-num span2" onClick={() => append('0')}>0</button>
            <button className="btn btn-num" onClick={() => append('.')}>.</button>
            <button className="btn btn-eq" onClick={compute}>=</button>
          </div>

          <div className={`history ${showHistory ? "open" : ""}`} aria-hidden={!showHistory}>
            <div className="topbar">
              <button className="link" onClick={() => setCalc(prev => ({ ...prev, history: [] }))}>Clear history</button>
              <button className="link" onClick={() => setShowHistory(false)}>Close</button>
            </div>
            <div className="history-list">
              {calc.history.length === 0
                ? <p className="empty">No calculations yet. Press = to save one.</p>
                : calc.history.map((h, i) => (
                    <button key={i} className="history-item" onClick={() => useHistory(h.result)}>
                      <span className="history-expr">{h.expr} =</span>
                      <span className="history-result">{formatDisplay(h.result)}</span>
                    </button>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}