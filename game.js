// ============================================================
//  Fortune DUNKER — caça-níquel 5×5, estilo "tigrinho".
//  Símbolos desenhados em vetor (nítidos em qualquer resolução).
//  Valores ficticios, sem dinheiro real, so diversao.
// ============================================================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

const NUM_ROLOS = 5;
const LINHAS_VIS = 5;
const LARG = 360;                 // tamanho lógico (o CSS cuida do tamanho na tela)
const ALT = 360;
const CELULA = LARG / NUM_ROLOS;  // 72
const RAIO = CELULA * 0.38;

// resolução real = lógico × densidade de pixels do aparelho (retina/celular)
const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
canvas.width = LARG * DPR;
canvas.height = ALT * DPR;
ctx.scale(DPR, DPR);

const LETRAS = ["D", "U", "N", "K", "E", "R"];
// Poucas letras e espalhadas: o super prêmio tem que custar a sair.
const LETRAS_POR_ROLO = [
  ["D", "R"], ["U"], ["N"], ["K"], ["E"],
];

// s = tipo do símbolo desenhado; pag = prêmio [2, 3, 4, 5 iguais] × aposta da linha
// (2 iguais paga pouquinho -> muitos prêmios pequenos toda hora)
// pesos altos -> as letras D-U-N-K-E-R ficam mais raras (super prêmio mais difícil)
// estrela é o "scatter" das rodadas grátis -> peso baixo de propósito (ela é rara)
const SIMBOLOS = [
  { s: "sete",     peso: 5,  pag: [3, 20, 80, 400] },
  { s: "diamante", peso: 8,  pag: [2, 12, 50, 200] },
  { s: "estrela",  peso: 4,  pag: [1, 6, 25, 90] },
  { s: "uva",      peso: 15, pag: [1, 3, 12, 45] },
  { s: "limao",    peso: 21, pag: [1, 2, 7, 22] },
  { s: "cereja",   peso: 28, pag: [1, 2, 5, 16] },
];

const LINHAS_PAG = [
  [2, 2, 2, 2, 2], // meio
  [0, 0, 0, 0, 0], // topo
  [4, 4, 4, 4, 4], // base
  [0, 1, 2, 3, 4], // diagonal \
  [4, 3, 2, 1, 0], // diagonal /
];
const CORES_LINHA = ["#5ad1ff", "#4ade80", "#ff7b72", "#c084fc", "#ffd23f"];

const SUPER_PREMIO = 10000;

// ============================================================
//  SÍMBOLOS EM VETOR — todos iluminados, pulsando e brilhando
// ============================================================
const FASE = { sete: 0, diamante: 1, estrela: 2, uva: 3, limao: 4, cereja: 5 };
const HALO = {
  sete: "255,70,70",
  diamante: "120,220,255",
  estrela: "255,215,90",
  uva: "190,120,255",
  limao: "255,225,80",
  cereja: "255,80,90",
};

function poligono(g, pts, R) {
  g.beginPath();
  pts.forEach(([x, y], i) =>
    i ? g.lineTo(x * R, y * R) : g.moveTo(x * R, y * R)
  );
  g.closePath();
}

function esferaBrilhante(g, x, y, r, c1, c2, c3, hx, hy) {
  const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  rg.addColorStop(0, c1);
  rg.addColorStop(0.55, c2);
  rg.addColorStop(1, c3);
  g.fillStyle = rg;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.beginPath();
  g.ellipse(x - r * 0.35 + (hx || 0), y - r * 0.42 + (hy || 0), r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  g.fill();
}

function folha(g, x, y, R) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.5);
  const gr = g.createLinearGradient(0, -R * 0.3, 0, R * 0.3);
  gr.addColorStop(0, "#8ef08a");
  gr.addColorStop(1, "#2e9e3f");
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(0, 0, R * 0.34, R * 0.16, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// estrelinha de brilho de 4 pontas
function cintila(g, x, y, s, cor) {
  g.save();
  g.translate(x, y);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = cor || "#ffffff";
  g.shadowColor = cor || "#ffffff";
  g.shadowBlur = s * 1.2;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.moveTo(0, 0);
    g.lineTo(s * 0.16, -s * 0.16);
    g.lineTo(0, -s);
    g.lineTo(-s * 0.16, -s * 0.16);
  }
  g.fill();
  g.restore();
}

// facho de luz que gira por cima do símbolo
function facho(g, R, t, alfa) {
  g.save();
  g.rotate((t / 1600) % (Math.PI * 2));
  g.globalCompositeOperation = "lighter";
  const lg = g.createLinearGradient(-R, 0, R, 0);
  lg.addColorStop(0, "rgba(255,255,255,0)");
  lg.addColorStop(0.5, `rgba(255,255,255,${alfa})`);
  lg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = lg;
  g.fillRect(-R, -R * 0.14, R * 2, R * 0.28);
  g.restore();
}

function desenhaSete(g, R, t, pulso) {
  const pts = [
    [-0.80, -0.90], [0.82, -0.90], [0.82, -0.56],
    [0.12, 0.96], [-0.34, 0.96], [0.34, -0.56], [-0.80, -0.56],
  ];
  const gr = g.createLinearGradient(0, -R, 0, R);
  gr.addColorStop(0, "#ff8a8a");
  gr.addColorStop(0.5, "#e11d1d");
  gr.addColorStop(1, "#8f0c0c");
  g.save();
  g.shadowColor = `rgba(255,60,60,${0.5 + 0.45 * pulso})`;
  g.shadowBlur = R * (0.35 + 0.7 * pulso);
  poligono(g, pts, R);
  g.fillStyle = gr;
  g.fill();
  g.restore();
  g.lineWidth = R * 0.09;
  g.strokeStyle = "#ffe9a8";
  poligono(g, pts, R);
  g.stroke();
  // brilho que desliza
  g.save();
  poligono(g, pts, R);
  g.clip();
  const off = ((t / 700) % 2 - 1) * 1.6 * R;
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = R * 0.16;
  g.beginPath();
  g.moveTo(-R + off, -R);
  g.lineTo(off, R);
  g.stroke();
  g.restore();
  cintila(g, -R * 0.55, -R * 0.7, R * (0.22 + 0.14 * pulso));
}

function desenhaDiamante(g, R, t, pulso) {
  const pts = [
    [-0.55, -0.6], [0.55, -0.6], [0.96, -0.16], [0, 0.98], [-0.96, -0.16],
  ];
  g.save();
  g.shadowColor = `rgba(120,220,255,${0.6 + 0.4 * pulso})`;
  g.shadowBlur = R * (0.35 + 0.7 * pulso);
  const gr = g.createLinearGradient(-R, -R, R, R);
  gr.addColorStop(0, "#eafffb");
  gr.addColorStop(0.4, "#8fe3ff");
  gr.addColorStop(0.7, "#4aa9e0");
  gr.addColorStop(1, "#2f74b8");
  poligono(g, pts, R);
  g.fillStyle = gr;
  g.fill();
  g.restore();

  g.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * pulso})`;
  g.lineWidth = R * 0.045;
  const L = (a, b) => {
    g.beginPath();
    g.moveTo(a[0] * R, a[1] * R);
    g.lineTo(b[0] * R, b[1] * R);
    g.stroke();
  };
  L([-0.55, -0.6], [0.55, -0.6]); L([-0.96, -0.16], [0.96, -0.16]);
  L([-0.55, -0.6], [-0.96, -0.16]); L([0.55, -0.6], [0.96, -0.16]);
  L([-0.55, -0.6], [0, 0.98]); L([0.55, -0.6], [0, 0.98]);
  L([-0.96, -0.16], [0, 0.98]); L([0.96, -0.16], [0, 0.98]);
  L([-0.28, -0.6], [0, -0.16]); L([0.28, -0.6], [0, -0.16]);

  g.lineWidth = R * 0.06;
  g.strokeStyle = "#dff6ff";
  poligono(g, pts, R);
  g.stroke();

  facho(g, R, t * 1.6, 0.4);
  const s = R * (0.3 + 0.2 * Math.abs(Math.sin(t / 260)));
  cintila(g, -R * 0.24, -R * 0.32, s);
  cintila(g, R * 0.42, R * 0.02, s * 0.55);
}

function desenhaEstrela(g, R, t, pulso) {
  g.save();
  g.rotate((t / 2600) % (Math.PI * 2));
  g.shadowColor = `rgba(255,210,80,${0.6 + 0.4 * pulso})`;
  g.shadowBlur = R * (0.3 + 0.6 * pulso);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? R * 0.44 : R;
    g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  g.closePath();
  const gr = g.createLinearGradient(0, -R, 0, R);
  gr.addColorStop(0, "#fff3c4");
  gr.addColorStop(0.5, "#ffd23f");
  gr.addColorStop(1, "#d99312");
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = R * 0.07;
  g.strokeStyle = "#fff6da";
  g.stroke();
  g.restore();
  cintila(g, 0, -R * 0.05, R * (0.3 + 0.16 * Math.abs(Math.sin(t / 200))), "#fff3c4");
}

function desenhaCereja(g, R, t, pulso) {
  g.strokeStyle = "#3aa03a";
  g.lineWidth = R * 0.1;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(R * 0.05, -R * 0.75);
  g.quadraticCurveTo(-R * 0.5, -R * 0.3, -R * 0.34, R * 0.28);
  g.moveTo(R * 0.05, -R * 0.75);
  g.quadraticCurveTo(R * 0.55, -R * 0.2, R * 0.36, R * 0.42);
  g.stroke();
  folha(g, R * 0.05, -R * 0.78, R);
  const h = Math.sin(t / 300) * R * 0.06;
  g.save();
  g.shadowColor = `rgba(255,60,80,${0.3 + 0.4 * pulso})`;
  g.shadowBlur = R * 0.5 * pulso;
  esferaBrilhante(g, -R * 0.34, R * 0.42, R * 0.42, "#ff9a9a", "#e01e2b", "#8c0b17", h, h);
  esferaBrilhante(g, R * 0.36, R * 0.55, R * 0.4, "#ff9a9a", "#e01e2b", "#8c0b17", -h, h);
  g.restore();
  cintila(g, -R * 0.5, R * 0.15, R * (0.14 + 0.12 * pulso));
}

function desenhaLimao(g, R, t, pulso) {
  g.save();
  g.rotate(-0.35 + Math.sin(t / 420) * 0.05);
  g.shadowColor = `rgba(255,225,80,${0.35 + 0.4 * pulso})`;
  g.shadowBlur = R * 0.55 * pulso;
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
  gr.addColorStop(0, "#fff6b0");
  gr.addColorStop(0.5, "#ffdd33");
  gr.addColorStop(1, "#e0a70c");
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(0, 0, R * 0.95, R * 0.7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d99a0a";
  g.beginPath();
  g.ellipse(R * 0.92, 0, R * 0.12, R * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  const hx = Math.sin(t / 500) * R * 0.15;
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.beginPath();
  g.ellipse(-R * 0.32 + hx, -R * 0.3, R * 0.28, R * 0.14, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  folha(g, R * 0.1, -R * 0.62, R);
  cintila(g, R * 0.5, -R * 0.4, R * (0.12 + 0.12 * pulso));
}

function desenhaUva(g, R, t, pulso) {
  g.strokeStyle = "#7a4a1e";
  g.lineWidth = R * 0.09;
  g.beginPath();
  g.moveTo(0, -R * 0.9);
  g.lineTo(0, -R * 0.5);
  g.stroke();
  folha(g, R * 0.16, -R * 0.82, R * 1.1);
  const bolas = [
    [0, -0.5], [-0.42, -0.2], [0.42, -0.2],
    [-0.66, 0.2], [0, 0.18], [0.66, 0.2],
    [-0.34, 0.56], [0.34, 0.56], [0, 0.9],
  ];
  const rr = R * 0.3;
  g.save();
  g.shadowColor = `rgba(190,120,255,${0.3 + 0.4 * pulso})`;
  g.shadowBlur = R * 0.4 * pulso;
  bolas.forEach(([x, y], i) => {
    const h = Math.sin(t / 320 + i) * R * 0.05;
    esferaBrilhante(g, x * R, y * R, rr, "#d8bcff", "#7d3fd6", "#45217e", h, h);
  });
  g.restore();
  cintila(g, -R * 0.2, -R * 0.15, R * (0.14 + 0.12 * pulso), "#e8d4ff");
}

function desenharSimbolo(g, tipo, cx, cy, R, t) {
  const fase = (FASE[tipo] || 0) * 1.15;
  const resp = 1 + 0.055 * Math.sin(t / 360 + fase);
  const pulso = 0.5 + 0.5 * Math.sin(t / 300 + fase);

  g.save();
  g.translate(cx, cy);
  g.scale(resp, resp);
  g.lineJoin = "round";

  // halo pulsante atrás de tudo
  const rgb = HALO[tipo] || "255,210,120";
  g.save();
  g.globalCompositeOperation = "lighter";
  const hg = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.55);
  hg.addColorStop(0, `rgba(${rgb},${0.18 + 0.32 * pulso})`);
  hg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = hg;
  g.beginPath();
  g.arc(0, 0, R * 1.55, 0, Math.PI * 2);
  g.fill();
  g.restore();

  if (tipo === "sete") desenhaSete(g, R, t, pulso);
  else if (tipo === "diamante") desenhaDiamante(g, R, t, pulso);
  else if (tipo === "estrela") desenhaEstrela(g, R, t, pulso);
  else if (tipo === "cereja") desenhaCereja(g, R, t, pulso);
  else if (tipo === "limao") desenhaLimao(g, R, t, pulso);
  else if (tipo === "uva") desenhaUva(g, R, t, pulso);

  g.restore();
}

// ============================================================
//  ROLOS
// ============================================================
function montarTira(indiceRolo) {
  const tira = [];
  for (const item of SIMBOLOS) {
    for (let i = 0; i < item.peso; i++) tira.push(item.s);
  }
  for (const L of LETRAS_POR_ROLO[indiceRolo]) tira.push(L);
  for (let i = tira.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tira[i], tira[j]] = [tira[j], tira[i]];
  }
  return tira;
}

const rolos = [];
for (let i = 0; i < NUM_ROLOS; i++) {
  rolos.push({
    tira: montarTira(i),
    pos: Math.random() * 1000,
    girando: false,
    velocidade: 0,
    pararEm: 0,
    freando: false,
    de: 0, para: 0, dur: 0, t: 0,
  });
}

const ehLetra = (s) => s.length === 1 && s >= "A" && s <= "Z";

function simboloNaLinha(rolo, linha) {
  const topo = Math.floor(rolo.pos / CELULA);
  const n = rolo.tira.length;
  return rolo.tira[((topo + linha) % n + n) % n];
}

// ============================================================
//  ESTADO
// ============================================================
const APOSTAS = [1, 10, 20, 50, 100];
let apostaIdx = 1;
let numLinhas = 1;

// rodadas grátis: sai com 4+ estrelas na grade; joga sem descontar a aposta
const GATILHO_GRATIS = 4;      // quantas ⭐ pra ativar
const RODADAS_GRATIS = 10;     // quantas rodadas ganha

let creditos = carregarCreditos();
let coletadas = carregarLetras();
let girosGratis = carregarGratis();
let girandoTudo = false;
let linhasVencedoras = [];
let flash = 0;
let linhasFlash = 0; // realça as linhas ativas quando o jogador muda a quantidade

let particulas = [];
let fogosAte = 0;
let fogosTimer = 0;
const CORES_FOGO = ["#ffd23f", "#ff7b72", "#5ad1ff", "#4ade80", "#c084fc", "#ffffff"];

const el = {
  creditos: document.getElementById("creditos"),
  apostaLinha: document.getElementById("apostaLinha"),
  numLinhas: document.getElementById("numLinhas"),
  apostaTotal: document.getElementById("apostaTotal"),
  premio: document.getElementById("premio"),
  msg: document.getElementById("msg"),
  girar: document.getElementById("girar"),
  girarTxt: document.querySelector("#girar span"),
  gratis: document.getElementById("gratis"),
  gratisN: document.getElementById("gratisN"),
  letras: [...document.querySelectorAll(".letras span")],
  deck: [...document.querySelectorAll(".dbtn[data-ap]")],
  overlay: document.getElementById("superOverlay"),
};

function carregarCreditos() {
  const v = parseInt(localStorage.getItem("dunker.creditos"), 10);
  return Number.isFinite(v) && v > 0 ? v : 10000;
}
function carregarLetras() {
  try {
    const a = JSON.parse(localStorage.getItem("dunker.letras"));
    if (Array.isArray(a) && a.length === 6) return a.map(Boolean);
  } catch (e) { /* ignora */ }
  return [false, false, false, false, false, false];
}
function carregarGratis() {
  const v = parseInt(localStorage.getItem("dunker.gratis"), 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
function salvar() {
  localStorage.setItem("dunker.creditos", String(creditos));
  localStorage.setItem("dunker.letras", JSON.stringify(coletadas));
  localStorage.setItem("dunker.gratis", String(girosGratis));
}

const apostaLinha = () => APOSTAS[apostaIdx];
const apostaTotal = () => apostaLinha() * numLinhas;

// formata valor fictício em "R$ 1.234"
const fmt = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");

// valores mostrados (contam suavemente até o valor real)
let creditosVis = creditos;
let premioAlvo = 0;
let premioVis = 0;

function contarValores() {
  if (creditosVis !== creditos) {
    const dif = creditos - creditosVis;
    const passo = Math.max(1, Math.ceil(Math.abs(dif) * 0.09));
    creditosVis += Math.sign(dif) * Math.min(Math.abs(dif), passo);
    el.creditos.textContent = fmt(creditosVis);
  }
  if (premioVis !== premioAlvo) {
    const dif = premioAlvo - premioVis;
    const passo = Math.max(1, Math.ceil(Math.abs(dif) * 0.09));
    premioVis += Math.sign(dif) * Math.min(Math.abs(dif), passo);
    el.premio.textContent = fmt(premioVis);
  }
}

function atualizarPainel() {
  // se o valor caiu (aposta) ou é a carga inicial, mostra na hora;
  // se subiu (prêmio), deixa a contagem no loop fazer o efeito
  if (creditos <= creditosVis) {
    creditosVis = creditos;
    el.creditos.textContent = fmt(creditos);
  }
  el.premio.textContent = fmt(premioVis);
  el.apostaLinha.textContent = apostaLinha();
  el.numLinhas.textContent = numLinhas;
  el.apostaTotal.textContent = fmt(apostaTotal());
  el.girar.disabled = girandoTudo || (girosGratis === 0 && creditos < apostaTotal());
  el.letras.forEach((sp, i) => sp.classList.toggle("on", coletadas[i]));
  el.deck.forEach((b) => b.classList.toggle("sel", b.dataset.ap === String(apostaIdx)));

  // rodadas grátis
  if (el.gratis) {
    el.gratis.hidden = girosGratis <= 0;
    if (el.gratisN) el.gratisN.textContent = girosGratis;
  }
  if (el.girarTxt) el.girarTxt.textContent = girosGratis > 0 ? "GRÁTIS " + girosGratis : "GIRAR";
}

// ---------- Fogos ----------
function explodir(x, y) {
  const qtd = 36 + Math.floor(Math.random() * 22);
  const base = CORES_FOGO[Math.floor(Math.random() * CORES_FOGO.length)];
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const vel = 55 + Math.random() * 175;
    particulas.push({
      x, y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida: 0.8 + Math.random() * 1.0,
      vidaMax: 1.8,
      cor: Math.random() < 0.25 ? "#ffffff" : base,
      tam: 1.6 + Math.random() * 2.4,
    });
  }
}
function iniciarFogos() {
  fogosAte = performance.now() + 4200;
  fogosTimer = 0;
  explodir(LARG / 2, ALT / 2);
}

// ---------- Girar ----------
function girar() {
  if (girandoTudo) return;
  const gratis = girosGratis > 0;
  if (!gratis && creditos < apostaTotal()) return;

  if (window.Som) { Som.iniciar(); Som.girou(); }
  if (gratis) girosGratis--;
  else creditos -= apostaTotal();
  salvar();
  premioAlvo = 0;
  premioVis = 0;
  el.premio.textContent = fmt(0);
  el.msg.textContent = "Girando...";
  el.msg.className = "";
  girandoTudo = true;
  linhasVencedoras = [];
  flash = 0;

  const agora = performance.now();
  rolos.forEach((r, i) => {
    r.girando = true;
    r.freando = false;
    r.velocidade = 2600 + Math.random() * 500;
    r.pararEm = agora + 450 + i * 240;
  });
  atualizarPainel();
}

function iniciarFreada(rolo) {
  const n = rolo.tira.length;
  const alvo = Math.floor(Math.random() * n);
  const topoAlvo = ((alvo - 2) % n + n) % n;
  const minPos = rolo.pos + n * CELULA;
  let k = Math.ceil(minPos / CELULA);
  while ((k % n) !== topoAlvo) k++;

  rolo.freando = true;
  rolo.de = rolo.pos;
  rolo.para = k * CELULA;
  rolo.dur = 0.5 + Math.random() * 0.15;
  rolo.t = 0;
}

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// ---------- Avaliar ----------
function avaliar() {
  const grade = rolos.map((r) =>
    Array.from({ length: LINHAS_VIS }, (_, ln) => simboloNaLinha(r, ln))
  );

  let ganho = 0;
  const detalhes = [];

  for (let l = 0; l < numLinhas; l++) {
    const linha = LINHAS_PAG[l];
    const seq = grade.map((col, c) => col[linha[c]]);
    const primeiro = seq[0];
    if (ehLetra(primeiro)) continue;

    let n = 1;
    while (n < NUM_ROLOS && seq[n] === primeiro) n++;
    if (n >= 2) {
      const info = SIMBOLOS.find((x) => x.s === primeiro);
      const valor = info.pag[n - 2] * apostaLinha();
      ganho += valor;
      linhasVencedoras.push({ l, n });
      detalhes.push(`×${n} (+${valor})`);
    }
  }

  // letras só contam quando param SOBRE uma linha ativa (mais linhas = mais chance)
  const novas = [];
  for (let l = 0; l < numLinhas; l++) {
    const linha = LINHAS_PAG[l];
    for (let c = 0; c < NUM_ROLOS; c++) {
      const s = grade[c][linha[c]];
      if (ehLetra(s)) {
        const i = LETRAS.indexOf(s);
        if (i >= 0 && !coletadas[i]) { coletadas[i] = true; novas.push(s); }
      }
    }
  }

  let super_ = false;
  if (coletadas.every(Boolean)) {
    ganho += SUPER_PREMIO;
    super_ = true;
    coletadas = [false, false, false, false, false, false];
  }

  // rodadas grátis: 4+ ⭐ em qualquer lugar da grade
  const estrelas = grade.reduce((tot, col) => tot + col.filter((s) => s === "estrela").length, 0);
  const ganhouGratis = estrelas >= GATILHO_GRATIS;
  if (ganhouGratis) girosGratis += RODADAS_GRATIS;

  creditos += ganho;
  salvar();

  if (super_) {
    el.msg.textContent = `🎉 SUPER PRÊMIO D-U-N-K-E-R!  +${SUPER_PREMIO}`;
    el.msg.className = "super";
    flash = 140;
    iniciarFogos();
    mostrarOverlaySuper();
    if (window.Som) Som.super(SUPER_PREMIO);
  } else if (ganho > 0) {
    el.msg.textContent = `Ganhou ${ganho}!  ${detalhes.join("  ")}`;
    el.msg.className = "ganhou";
    flash = 48;
    if (window.Som) Som.ganhou(ganho);
  } else if (novas.length) {
    el.msg.textContent = `Pegou a letra ${novas.join(", ")}!`;
    el.msg.className = "";
  } else {
    el.msg.textContent = "Não foi dessa vez.";
    el.msg.className = "perdeu";
  }

  if (ganhouGratis) {
    el.msg.textContent = `🎁 ${RODADAS_GRATIS} RODADAS GRÁTIS!  (${estrelas}× ⭐)` +
      (ganho > 0 ? `  +${ganho}` : "");
    el.msg.className = "super";
    flash = Math.max(flash, 70);
    if (window.Som) Som.gratis();
  }

  premioAlvo = ganho;   // a contagem no loop faz o número entrar

  if (creditos < APOSTAS[0]) {
    el.msg.textContent += "  Sem saldo — toque em Reiniciar.";
  }

  girandoTudo = false;
  atualizarPainel();
}

let overlayTimer = 0;
function mostrarOverlaySuper() {
  el.overlay.hidden = false;
  el.overlay.style.animation = "none";
  void el.overlay.offsetWidth;
  el.overlay.style.animation = "";
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { el.overlay.hidden = true; }, 4300);
}

// ---------- Loop ----------
let ultimo = performance.now();
function loop(agora) {
  let dt = (agora - ultimo) / 1000;
  ultimo = agora;
  if (dt > 0.1) dt = 0.1;

  for (let ri = 0; ri < rolos.length; ri++) {
    const r = rolos[ri];
    if (!r.girando) continue;
    if (!r.freando) {
      r.pos = (r.pos + r.velocidade * dt) % (r.tira.length * CELULA);
      if (agora >= r.pararEm) iniciarFreada(r);
    } else {
      r.t += dt;
      const p = Math.min(r.t / r.dur, 1);
      r.pos = r.de + (r.para - r.de) * easeOutCubic(p);
      if (p >= 1) {
        r.pos = r.para % (r.tira.length * CELULA);
        r.girando = false;
        r.freando = false;
      }
    }
  }

  if (girandoTudo && rolos.every((r) => !r.girando)) avaliar();

  if (agora < fogosAte) {
    fogosTimer -= dt;
    if (fogosTimer <= 0) {
      fogosTimer = 0.16 + Math.random() * 0.2;
      explodir(LARG * (0.12 + Math.random() * 0.76), ALT * (0.08 + Math.random() * 0.5));
    }
  }
  for (const p of particulas) {
    p.vida -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.vx *= 0.99;
  }
  particulas = particulas.filter((p) => p.vida > 0);

  contarValores();
  render(agora);
  requestAnimationFrame(loop);
}

// ---------- Render ----------
function celulasVencedoras() {
  const set = new Set();
  for (const w of linhasVencedoras) {
    const linha = LINHAS_PAG[w.l];
    for (let c = 0; c < w.n; c++) set.add(c + "," + linha[c]);
  }
  return set;
}

function render(t) {
  ctx.clearRect(0, 0, LARG, ALT);

  for (let i = 0; i < NUM_ROLOS; i++) {
    const g = ctx.createLinearGradient(0, 0, 0, ALT);
    g.addColorStop(0, i % 2 ? "#1a1712" : "#141109");
    g.addColorStop(1, i % 2 ? "#0d0b08" : "#090705");
    ctx.fillStyle = g;
    ctx.fillRect(i * CELULA, 0, CELULA, ALT);
  }

  const venc = celulasVencedoras();
  const piscando = flash > 0 && Math.floor(flash / 6) % 2 === 0;

  if (venc.size) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const chave of venc) {
      const [c, ln] = chave.split(",").map(Number);
      const cx = c * CELULA + CELULA / 2;
      const cy = ln * CELULA + CELULA / 2;
      const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELULA * 0.72);
      rg.addColorStop(0, piscando ? "rgba(255,220,120,0.9)" : "rgba(255,190,80,0.5)");
      rg.addColorStop(1, "rgba(255,170,50,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(c * CELULA - 6, ln * CELULA - 6, CELULA + 12, CELULA + 12);
    }
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(245,197,66,0.22)";
  ctx.lineWidth = 1;
  for (let i = 1; i < NUM_ROLOS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELULA, 0); ctx.lineTo(i * CELULA, ALT); ctx.stroke();
  }
  for (let j = 1; j < LINHAS_VIS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELULA); ctx.lineTo(LARG, j * CELULA); ctx.stroke();
  }

  for (let i = 0; i < NUM_ROLOS; i++) {
    const r = rolos[i];
    const x = i * CELULA + CELULA / 2;
    const desloc = r.pos % CELULA;
    const parado = !r.girando;
    for (let ln = -1; ln <= LINHAS_VIS; ln++) {
      const s = simboloNaLinha(r, ln);
      const y = ln * CELULA - desloc + CELULA / 2;
      const ganhou = parado && venc.has(i + "," + ln);
      const k = ganhou ? (piscando ? 1.16 : 1.05) : 1;

      if (ehLetra(s)) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${30 * k}px 'Cinzel', Georgia, serif`;
        ctx.fillStyle = "#ffd23f";
        ctx.shadowColor = "#ffb020";
        ctx.shadowBlur = ganhou ? 22 : 12;
        ctx.fillText(s, x, y + 1);
        ctx.restore();
      } else {
        desenharSimbolo(ctx, s, x, y, RAIO * k, t || 0);
      }
    }
  }

  // linhas de pagamento ATIVAS — bem visíveis, com número e brilho
  const realce = linhasFlash > 0 ? (0.6 + 0.4 * Math.abs(Math.sin(linhasFlash / 6))) : 0;
  for (let l = 0; l < numLinhas; l++) {
    const linha = LINHAS_PAG[l];
    const venceu = linhasVencedoras.some((w) => w.l === l);
    const cor = CORES_LINHA[l];
    const pts = [];
    for (let c = 0; c < NUM_ROLOS; c++) {
      pts.push([c * CELULA + CELULA / 2, linha[c] * CELULA + CELULA / 2]);
    }

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = venceu ? 16 : 8 + realce * 10;
    ctx.globalAlpha = venceu ? 1 : 0.5 + realce * 0.5;
    ctx.lineWidth = venceu ? (piscando ? 6 : 4) : 2.5 + realce * 2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();

    // badge com o número da linha, nas duas pontas
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    for (const [bx, by] of [pts[0], pts[pts.length - 1]]) {
      const dir = bx < LARG / 2 ? -1 : 1;
      const cx = bx + dir * (CELULA * 0.42);
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(cx, by, 9 + realce * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0806";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(l + 1), cx, by + 0.5);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  if (linhasFlash > 0) linhasFlash--;

  ctx.strokeStyle = "rgba(245,197,66,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, LARG - 2, ALT - 2);

  if (particulas.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particulas) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.vida / p.vidaMax));
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (flash > 0) flash--;
}

// ---------- Controles ----------
document.getElementById("girar").addEventListener("click", girar);
document.getElementById("apMenos").addEventListener("click", () => {
  apostaIdx = Math.max(0, apostaIdx - 1); atualizarPainel();
});
document.getElementById("apMais").addEventListener("click", () => {
  apostaIdx = Math.min(APOSTAS.length - 1, apostaIdx + 1); atualizarPainel();
});
document.getElementById("lnMenos").addEventListener("click", () => {
  numLinhas = Math.max(1, numLinhas - 1); linhasFlash = 90; atualizarPainel();
});
document.getElementById("lnMais").addEventListener("click", () => {
  numLinhas = Math.min(LINHAS_PAG.length, numLinhas + 1); linhasFlash = 90; atualizarPainel();
});
document.getElementById("resetar").addEventListener("click", () => {
  creditos = 10000;
  creditosVis = 10000;
  premioAlvo = 0;
  premioVis = 0;
  girosGratis = 0;
  coletadas = [false, false, false, false, false, false];
  salvar();
  el.premio.textContent = fmt(0);
  el.msg.textContent = "Reiniciado. Boa sorte!";
  el.msg.className = "";
  atualizarPainel();
});

// fileira de apostas: 1 / 10 / 20 / 50 / 100 = aposta por linha;  MAX BET = tudo no máximo
el.deck.forEach((b) => {
  b.addEventListener("click", () => {
    const v = b.dataset.ap;
    if (v === "max") {
      apostaIdx = APOSTAS.length - 1;
      numLinhas = LINHAS_PAG.length;
      linhasFlash = 90;
    } else {
      apostaIdx = Math.max(0, Math.min(APOSTAS.length - 1, parseInt(v, 10)));
    }
    atualizarPainel();
  });
});

addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); girar(); }
});

// ---------- Som ----------
const btnSom = document.getElementById("som");
function pintarSom() {
  const on = window.Som ? Som.estaLigado() : true;
  btnSom.textContent = on ? "🔊" : "🔇";
  btnSom.classList.toggle("off", !on);
}
if (btnSom) {
  pintarSom();
  btnSom.addEventListener("click", () => {
    if (window.Som) {
      const on = Som.toggle();
      el.msg.textContent = on ? "♪ som ligado" : "som desligado";
      el.msg.className = "";
    }
    pintarSom();
  });
}
// destrava e começa a música no PRIMEIRO toque em qualquer lugar
let somDestravado = false;
function destravarSom() {
  if (somDestravado) return;
  somDestravado = true;
  if (window.Som) Som.iniciar();
  pintarSom();
}
["pointerdown", "touchend", "click", "keydown"].forEach((ev) =>
  addEventListener(ev, destravarSom, { once: false })
);

// ---------- Escala automática: a cabine sempre cabe na tela ----------
//
// Antes isto recalculava a área disponível a partir de window.innerHeight
// menos as margens seguras lidas separadamente — duas contas independentes
// que deviam bater mas nem sempre batiam (por isso às vezes sobrava ou
// faltava espaço). Agora mede DIRETO a caixa real do <body> — a mesma caixa
// que o flex usa pra centralizar a cabine — então não tem conta duplicada
// pra desalinhar: o número usado É o número que o layout realmente usa.
const cabineEl = document.getElementById("cabine");
const embl = document.getElementById("emblema");
const NAT_W = 430;

let escalaAtual = 0;
function calcularEscala() {
  const cs = getComputedStyle(document.body);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const vw = document.body.clientWidth - padX;
  const vh = document.body.clientHeight - padY;
  const natH = cabineEl.offsetHeight; // transform não altera offsetHeight
  if (!natH || vw <= 0 || vh <= 0) return;

  let s = Math.min((vw - 4) / NAT_W, (vh - 4) / natH);
  s = Math.max(0.3, Math.min(s, 1.8));

  // zona morta: ignora mudanças minúsculas (evita "tremer" reagindo a
  // ruído de sub-pixel durante a animação de abertura do app instalado)
  if (Math.abs(s - escalaAtual) < 0.004) return;
  escalaAtual = s;

  const root = document.body.style;
  root.setProperty("--escala", s);
  root.setProperty("--cabW", NAT_W * s + "px");
  root.setProperty("--cabH", natH * s + "px");
}

// agrupa chamadas próximas num só recálculo por frame
let escalaAgendada = false;
function ajustarEscala() {
  if (escalaAgendada) return;
  escalaAgendada = true;
  requestAnimationFrame(() => { escalaAgendada = false; calcularEscala(); });
}

// gatilho principal: observa a caixa real do body e da cabine.
// isso cobre TODO caso que muda o tamanho disponível (rotação, teclado,
// barra do navegador recolhendo, o app assentando ao abrir, fonte
// trocando de largura) sem precisar adivinhar em quais eventos confiar.
if (window.ResizeObserver) {
  const ro = new ResizeObserver(ajustarEscala);
  ro.observe(document.body);
  ro.observe(cabineEl);
} else {
  // navegador bem antigo sem ResizeObserver: cai pra escuta manual
  addEventListener("resize", ajustarEscala);
  addEventListener("orientationchange", () => setTimeout(ajustarEscala, 150));
}
addEventListener("pageshow", ajustarEscala);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarEscala);
if (embl) embl.addEventListener("load", ajustarEscala);
addEventListener("load", ajustarEscala);
requestAnimationFrame(() => requestAnimationFrame(ajustarEscala));
ajustarEscala();

atualizarPainel();
requestAnimationFrame(loop);
