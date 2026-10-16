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

// Easter egg: 12345678 ÷ 143 shows a message (143 = "I love you" in pager code)
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
    if (prev.operation === '/' && prev.previous === "12345678" && prev.current === "143") {
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

  const memory = (kind) => setCalc(prev => {
    const c = parseFloat(prev.current);
    if (kind === 'MC') return { ...prev, memory: 0 };
    if (kind === 'MR') return { ...prev, current: prev.memory.toString(), resetScreen: true };
    if (isNaN(c)) return prev;
    const m = round(kind === 'M+' ? prev.memory + c : prev.memory - c);
    return { ...prev, memory: m, resetScreen: true };
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

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Inter", -apple-system, "Segoe UI", system-ui, sans-serif; }
        :root {
          --bg: #006aff; --shell: #cfe2ff; --display: #ffffff; --ink: #18212f; --muted: #7a8699;
          --key: #ffffff; --key-fn: #818387; --key-op: #6e0ccf; --op-ink: #fdfeff;
          --accent: #2f5bea; --accent-ink: #ffffff; --line: #e1e7f0; --mem: #e8f5ee; --mem-ink: #1f7a4d;
        }
        body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 16px; }
        .calculator { position: relative; width: 100%; max-width: 360px; background: var(--shell); border-radius: 28px; padding: 20px; box-shadow: 0 1px 0 #fff inset, 0 24px 48px -16px rgba(36,56,96,0.28); overflow: hidden; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; min-height: 28px; }
        .badge { font-size: 0.75rem; font-weight: 600; color: var(--mem-ink); background: var(--mem); padding: 4px 10px; border-radius: 999px; }
        .badge.hidden { visibility: hidden; }
        .link { border: none; background: none; color: var(--muted); font-size: 0.85rem; font-weight: 500; cursor: pointer; padding: 6px 8px; border-radius: 8px; }
        .link:hover { background: var(--key-fn); color: var(--ink); }
        .display { width: 100%; background: var(--display); border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; text-align: right; margin-bottom: 16px; min-height: 96px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; font: inherit; color: inherit; overflow: hidden; }
        .previous-operand { color: var(--muted); font-size: 0.95rem; min-height: 22px; font-variant-numeric: tabular-nums; }
        .current-operand { color: var(--ink); font-size: 2.5rem; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .current-operand.sm { font-size: 1.9rem; }
        .current-operand.xs { font-size: 1.4rem; }
        .keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .btn { height: 54px; font-size: 1.15rem; font-weight: 500; border: none; border-radius: 16px; cursor: pointer; transition: background-color 0.15s ease, transform 0.06s ease; user-select: none; }
        .btn:active { transform: scale(0.95); }
        .btn:focus-visible, .link:focus-visible, .display:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .btn-num { background: var(--key); color: var(--ink); box-shadow: 0 1px 2px rgba(36,56,96,0.1); }
        .btn-num:hover { background: #f0f4fa; }
        .btn-fn { background: var(--key-fn); color: var(--ink); font-size: 1rem; }
        .btn-fn:hover { background: #d1dbe9; }
        .btn-mem { background: transparent; color: var(--muted); font-size: 0.85rem; font-weight: 600; height: 36px; border-radius: 10px; }
        .btn-mem:hover { background: var(--key-fn); color: var(--ink); }
        .btn-op { background: var(--key-op); color: var(--op-ink); font-size: 1.4rem; }
        .btn-op:hover { background: #c6d6f8; }
        .btn-op.active { background: var(--accent); color: var(--accent-ink); }
        .btn-eq { background: var(--accent); color: var(--accent-ink); font-size: 1.5rem; }
        .btn-eq:hover { background: #2450d2; }
        .span2 { grid-column: span 2; }
        .history { position: absolute; inset: 0; background: var(--shell); padding: 20px; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.25s ease; z-index: 2; }
        .history.open { transform: translateY(0); }
        .history-list { flex: 1; overflow-y: auto; margin-top: 8px; }
        .history-item { display: block; width: 100%; text-align: right; background: none; border: none; border-bottom: 1px solid var(--line); padding: 12px 4px; cursor: pointer; }
        .history-item:hover { background: var(--display); }
        .history-expr { display: block; color: var(--muted); font-size: 0.9rem; }
        .history-result { display: block; color: var(--ink); font-size: 1.3rem; font-weight: 600; font-variant-numeric: tabular-nums; }
        .empty { color: var(--muted); text-align: center; margin-top: 48px; font-size: 0.95rem; }
        @media (prefers-reduced-motion: reduce) { .history, .btn { transition: none; } }
      `}</style>

      <div className="calculator">
        <div className="topbar">
          <span className={`badge ${calc.memory === 0 ? "hidden" : ""}`}>M = {formatDisplay(calc.memory.toString())}</span>
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
          <button className={`btn btn-op ${calc.operation === '/' && calc.resetScreen ? "active" : ""}`} onClick={() => chooseOp('/')}>÷</button>

          <button className="btn btn-num" onClick={() => append('7')}>7</button>
          <button className="btn btn-num" onClick={() => append('8')}>8</button>
          <button className="btn btn-num" onClick={() => append('9')}>9</button>
          <button className={`btn btn-op ${calc.operation === '*' && calc.resetScreen ? "active" : ""}`} onClick={() => chooseOp('*')}>×</button>

          <button className="btn btn-num" onClick={() => append('4')}>4</button>
          <button className="btn btn-num" onClick={() => append('5')}>5</button>
          <button className="btn btn-num" onClick={() => append('6')}>6</button>
          <button className={`btn btn-op ${calc.operation === '-' && calc.resetScreen ? "active" : ""}`} onClick={() => chooseOp('-')}>−</button>

          <button className="btn btn-num" onClick={() => append('1')}>1</button>
          <button className="btn btn-num" onClick={() => append('2')}>2</button>
          <button className="btn btn-num" onClick={() => append('3')}>3</button>
          <button className={`btn btn-op ${calc.operation === '+' && calc.resetScreen ? "active" : ""}`} onClick={() => chooseOp('+')}>+</button>

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
    </>
  );
}
