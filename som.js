// ============================================================
//  som.js — só efeitos, sem música de fundo.
//  Toca ao GIRAR e quando dá prêmio. Web Audio, sem arquivos.
// ============================================================
var Som = (() => {
  let ctx, master;
  let ligado = true;
  try { ligado = localStorage.getItem("dunker.som") !== "0"; } catch (e) {}

  function build() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }
  function resumir() {
    if (ctx && ctx.state !== "running") { try { ctx.resume(); } catch (e) {} }
  }
  function unlockIOS() {
    try {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
  }

  function nota(freq, t, dur, tipo, vol) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  const N = { C: 523.25, D: 587.33, E: 659.25, G: 783.99, A: 880, C6: 1046.5, E6: 1318.5, G6: 1568.0, C7: 2093 };

  // duração da contagem (bate com a subida visual de 9%/frame @60fps)
  function durContagem(valor) {
    return Math.min(2.6, Math.max(0.5, Math.log(Math.max(2, valor)) / 5.64));
  }

  // clique seco metálico (dente do rolo / tic da contagem)
  function click(t, freq, vol, len) {
    try {
      const src = ctx.createBufferSource();
      const L = Math.max(1, Math.floor(ctx.sampleRate * (len || 0.012)));
      const buf = ctx.createBuffer(1, L, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L);
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = freq || 2600; bp.Q.value = 4;
      const g = ctx.createGain();
      g.gain.value = vol || 0.05;
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t); src.stop(t + (len || 0.012) + 0.01);
    } catch (e) {}
  }

  // catraca do rolo girando: só os cliquinhos dos dentes, desacelerando no fim
  function roloGirando(t, dur) {
    let tk = t, i = 0, rate = 32;
    while (tk < t + dur) {
      const prog = (tk - t) / dur;
      // dois "dentes" alternados, pra soar mecânico
      const f = (i % 2 ? 2500 : 3100) + Math.random() * 400;
      click(tk, f, 0.06 - prog * 0.02);
      rate = prog > 0.62 ? 32 - (prog - 0.62) / 0.38 * 24 : 32; // freia no fim
      tk += 1 / Math.max(7, rate);
      i++;
    }
  }

  // "créditos entrando" — tic rápido e brilhante, ritmo constante, pitch em degraus
  function contagem(t0, dur) {
    const rate = 24;
    const n = Math.max(6, Math.round(dur * rate));
    for (let k = 0; k < n; k++) {
      const tk = t0 + k / rate;
      const f = 1500 + Math.floor((k / n) * 6) * 150;
      nota(f, tk, 0.045, "triangle", 0.085);
      click(tk, 3400, 0.03, 0.008);
    }
    const tf = t0 + n / rate;
    nota(N.C6, tf, 0.5, "triangle", 0.18);
    nota(N.G6, tf + 0.02, 0.5, "sine", 0.08);
  }

  function iniciar() { if (!build()) return; resumir(); unlockIOS(); }

  function girou() {
    if (!ligado) return;
    iniciar();
    if (!ctx) return;
    roloGirando(ctx.currentTime, 1.75);
  }
  function ganhou(ganho) {
    if (!ligado || !ctx) return;
    resumir();
    const t = ctx.currentTime;
    [N.C, N.E, N.G].forEach((f) => nota(f, t, 0.5, "triangle", 0.16));
    contagem(t + 0.12, durContagem(ganho || 10));
  }
  function superPremio(ganho) {
    if (!ligado || !ctx) return;
    resumir();
    const t = ctx.currentTime;
    [N.C, N.E, N.G, N.C6, N.E6, N.G6, N.C6, N.E6, N.G6].forEach((f, k) => {
      nota(f, t + k * 0.1, 0.55, "triangle", 0.22);
      nota(f * 1.5, t + k * 0.1, 0.35, "sine", 0.06);
    });
    contagem(t + 1.0, durContagem(ganho || 50000));
    for (let k = 0; k < 10; k++) nota(1400 + Math.random() * 1800, t + 3.4 + k * 0.05, 0.22, "sine", 0.08);
  }
  function toggle() {
    ligado = !ligado;
    try { localStorage.setItem("dunker.som", ligado ? "1" : "0"); } catch (e) {}
    build(); resumir(); unlockIOS();
    if (ligado && ctx) {
      const tt = ctx.currentTime;
      nota(N.G, tt, 0.12, "triangle", 0.18);
      nota(N.C6, tt + 0.1, 0.16, "triangle", 0.18);
    }
    return ligado;
  }
  function estaLigado() { return ligado; }
  function estado() { return ctx ? ctx.state : "sem-contexto"; }

  return { iniciar, toggle, estaLigado, estado, girou, ganhou, super: superPremio };
})();
try { window.Som = Som; } catch (e) {}
