// ============================================================
//  Fortune DUNKER — caça-níquel 4×4, tema pirata, estilo "tigrinho".
//  Símbolos em arte (criada pelo usuário), com brilho/sombra/animação
//  aplicados por cima via canvas.
//  Valores ficticios, sem dinheiro real, so diversao.
// ============================================================

const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");

const NUM_ROLOS = 4;
const LINHAS_VIS = 4;
const LARG = 288;                 // tamanho lógico (o CSS cuida do tamanho na tela)
const ALT = 288;
const CELULA = LARG / NUM_ROLOS;  // 72 -- mesmo tamanho de célula de sempre
const RAIO = CELULA * 0.38;

// resolução real = lógico × densidade de pixels do aparelho (retina/celular)
const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
canvas.width = LARG * DPR;
canvas.height = ALT * DPR;
ctx.scale(DPR, DPR);

// s = tipo do símbolo desenhado; pag = prêmio [2, 3, 4 iguais] × aposta da
// linha (grade é 4 rolos, então 4 iguais já é o máximo possível numa linha).
// mapa é o "scatter" das rodadas grátis -> peso ajustado pra manter a MESMA
// fração do total que tinha antes (~4,9%), preservando a dificuldade de
// sempre mesmo com o baralho agora bem maior (15 tipos em vez de 9).
// capitão é o Wild -- substitui qualquer símbolo pra fechar linha (ver
// avaliar()), por isso é o mais raro de todos e paga mais que qualquer outro.
const SIMBOLOS = [
  { s: "capitao",  peso: 4,  pag: [12, 70, 500] },
  { s: "bau",      peso: 6,  pag: [8, 40, 220] },
  { s: "bandeira", peso: 8,  pag: [5, 24, 130] },
  { s: "caveira",  peso: 10, pag: [4, 18, 95] },
  { s: "bussola",  peso: 13, pag: [3, 13, 65] },
  { s: "pistola",  peso: 16, pag: [2, 10, 48] },
  { s: "bomba",    peso: 19, pag: [2, 8, 38] },
  { s: "rum",      peso: 22, pag: [2, 7, 30] },
  { s: "papagaio", peso: 26, pag: [1, 5, 24] },
  { s: "mapa",     peso: 16, pag: [1, 5, 22] },
  { s: "cartaA",   peso: 30, pag: [1, 4, 16] },
  { s: "cartaK",   peso: 34, pag: [1, 3, 13] },
  { s: "cartaQ",   peso: 38, pag: [1, 3, 11] },
  { s: "cartaJ",   peso: 42, pag: [1, 2, 9] },
  { s: "carta10",  peso: 46, pag: [1, 2, 7] },
];

// linhas de pagamento -- geradas a partir de NUM_ROLOS/LINHAS_VIS (topo/base/
// meio nunca mais hardcoded), então continuam corretas se a grade mudar de
// tamanho de novo no futuro.
const linhaReta = (row) => Array.from({ length: NUM_ROLOS }, () => row);
const LINHA_TOPO = 0;
const LINHA_BASE = LINHAS_VIS - 1;
const LINHA_MEIO = Math.floor(LINHA_BASE / 2);
const DIAG_DESCE = Array.from({ length: NUM_ROLOS }, (_, i) => Math.round(i * LINHA_BASE / (NUM_ROLOS - 1)));
const LINHAS_PAG = [
  linhaReta(LINHA_MEIO),
  linhaReta(LINHA_TOPO),
  linhaReta(LINHA_BASE),
  DIAG_DESCE,                        // diagonal \
  [...DIAG_DESCE].reverse(),         // diagonal /
];
const CORES_LINHA = ["#5ad1ff", "#4ade80", "#ff7b72", "#c084fc", "#ffd23f"];

const SUPER_PREMIO = 5000;

// ============================================================
//  SÍMBOLOS EM SPRITE — arte pirata (criada pelo usuário), com o mesmo
//  tratamento de brilho/sombra/cintilação que todo símbolo já tinha
// ============================================================

// cada símbolo é a própria imagem gerada pelo usuário (pasta simbolos/,
// fundo já transparente) -- sem sprite sheet, sem recorte, cada uma com
// seu próprio tamanho natural.
const SIMBOLOS_IMG = [
  "capitao", "bau", "bandeira", "bussola", "papagaio",
  "caveira", "pistola", "bomba", "rum", "mapa",
  "cartaA", "cartaK", "cartaQ", "cartaJ", "carta10",
];
const IMAGENS = {};
for (const nome of SIMBOLOS_IMG) {
  const img = new Image();
  img.src = `simbolos/${nome}.webp`;
  IMAGENS[nome] = img;
}

const FASE = {
  capitao: 0, bau: 1, bandeira: 2, bussola: 3, papagaio: 4,
  caveira: 5, pistola: 6, bomba: 7, rum: 8, mapa: 9,
  cartaA: 10, cartaK: 11, cartaQ: 12, cartaJ: 13, carta10: 14,
};
const HALO = {
  capitao: "255,120,60",   // Wild -- substitui qualquer símbolo pra fechar linha
  bau: "255,210,90",
  bandeira: "255,90,90",
  bussola: "255,205,110",
  papagaio: "255,140,60",
  caveira: "220,220,220",
  pistola: "190,205,220",
  bomba: "255,120,70",
  rum: "210,150,70",
  mapa: "225,190,120",      // scatter -- ativa rodadas grátis (achou o mapa!)
  cartaA: "255,90,90",
  cartaK: "255,180,70",
  cartaQ: "195,140,255",
  cartaJ: "120,200,255",
  carta10: "180,255,180",
};

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

// desenha a imagem do símbolo com o mesmo brilho/sombra/brilho-deslizante/
// cintilação que os símbolos sempre tiveram, só que clipando um retângulo
// em vez de um contorno vetorial (a imagem já vem recortada e transparente)
function desenhaSprite(g, tipo, R, t, pulso) {
  const img = IMAGENS[tipo];
  const iw = (img && img.naturalWidth) || 400;
  const ih = (img && img.naturalHeight) || 400;
  const escala = (R * 1.9) / Math.max(iw, ih);
  const dw = iw * escala, dh = ih * escala;
  const rgb = HALO[tipo] || "255,210,120";

  g.save();
  g.shadowColor = `rgba(${rgb},${0.5 + 0.4 * pulso})`;
  g.shadowBlur = R * (0.3 + 0.5 * pulso);
  if (img && img.complete && img.naturalWidth) {
    g.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  }
  g.restore();

  // brilho que desliza por cima, sem parar
  g.save();
  g.beginPath();
  g.rect(-dw / 2, -dh / 2, dw, dh);
  g.clip();
  const off = ((t / 700) % 2 - 1) * 1.6 * R;
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(255,255,255,0.4)";
  g.lineWidth = R * 0.22;
  g.beginPath();
  g.moveTo(-R + off, -R);
  g.lineTo(off, R);
  g.stroke();
  g.restore();

  cintila(g, dw * 0.22, -dh * 0.3, R * (0.14 + 0.12 * pulso));
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

  desenhaSprite(g, tipo, R, t, pulso);

  g.restore();
}

// ============================================================
//  ROLOS
// ============================================================
function montarTira() {
  const tira = [];
  for (const item of SIMBOLOS) {
    for (let i = 0; i < item.peso; i++) tira.push(item.s);
  }
  for (let i = tira.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tira[i], tira[j]] = [tira[j], tira[i]];
  }
  return tira;
}

const rolos = [];
for (let i = 0; i < NUM_ROLOS; i++) {
  rolos.push({
    tira: montarTira(),
    pos: Math.random() * 1000,
    girando: false,
    velocidade: 0,
    pararEm: 0,
    freando: false,
    de: 0, para: 0, dur: 0, t: 0,
  });
}

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

// rodadas grátis: sai com 3+ mapas do tesouro na grade; joga sem descontar
// a aposta (grade caiu de 25 pra 16 células -- gatilho desce na mesma
// proporção (5 * 16/25 = 3.2 -> 3) pra manter a dificuldade de sempre)
const GATILHO_GRATIS = 3;      // quantos mapas 🗺️ pra ativar
const RODADAS_GRATIS = 10;     // quantas rodadas ganha

let creditos = carregarCreditos();
let girosGratis = carregarGratis();
let girandoTudo = false;
let sacarAberto = false; // formulário de "saque" (chave PIX) aberto?
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
  deck: [...document.querySelectorAll(".dbtn[data-ap]")],
  overlay: document.getElementById("superOverlay"),
  resetar: document.getElementById("resetar"),
  sacarBtn: document.getElementById("sacarBtn"),
  sacarForm: document.getElementById("sacarForm"),
  pixChave: document.getElementById("pixChave"),
};

function carregarCreditos() {
  const v = parseInt(localStorage.getItem("dunker.creditos"), 10);
  return Number.isFinite(v) && v > 0 ? v : 10000;
}
function carregarGratis() {
  const v = parseInt(localStorage.getItem("dunker.gratis"), 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
function salvar() {
  localStorage.setItem("dunker.creditos", String(creditos));
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
  // "Sacar" e "Recarregar" nunca aparecem juntos: com saldo, só dá pra
  // sacar; zerado, só dá pra recarregar.
  const podeSacar = creditos > 0;
  if (el.resetar) el.resetar.hidden = podeSacar;
  if (el.sacarBtn) el.sacarBtn.hidden = !podeSacar || sacarAberto;
  if (el.sacarForm) el.sacarForm.hidden = !sacarAberto;
  if (el.sacarBtn) el.sacarBtn.textContent = "\u{1F4B8} Sacar " + fmt(creditos);
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

  // capitão (Wild) substitui qualquer símbolo pra completar a sequência --
  // o "alvo" da linha é o primeiro símbolo não-Wild encontrado a partir do
  // rolo 0; se só tiver Wild na sequência, ela paga pela tabela do próprio
  // capitão -- e quando isso fecha a linha INTEIRA (todos os rolos), é o
  // super prêmio: capitães alinhados de ponta a ponta.
  let superAtivado = false;
  for (let l = 0; l < numLinhas; l++) {
    const linha = LINHAS_PAG[l];
    const seq = grade.map((col, c) => col[linha[c]]);

    let n = 0, alvo = null;
    while (n < NUM_ROLOS) {
      const s = seq[n];
      if (s === "capitao") { n++; continue; }
      if (alvo === null) { alvo = s; n++; continue; }
      if (s === alvo) { n++; continue; }
      break;
    }
    if (alvo === null) alvo = "capitao"; // sequência só de Wild

    if (n >= 2) {
      const info = SIMBOLOS.find((x) => x.s === alvo);
      const valor = info.pag[n - 2] * apostaLinha();
      ganho += valor;
      linhasVencedoras.push({ l, n });
      detalhes.push(`×${n} (+${valor})`);
      if (alvo === "capitao" && n === NUM_ROLOS) superAtivado = true;
    }
  }

  if (superAtivado) ganho += SUPER_PREMIO;

  // rodadas grátis: 3+ mapas do tesouro em qualquer lugar da grade
  const mapas = grade.reduce((tot, col) => tot + col.filter((s) => s === "mapa").length, 0);
  const ganhouGratis = mapas >= GATILHO_GRATIS;
  if (ganhouGratis) girosGratis += RODADAS_GRATIS;

  creditos += ganho;
  salvar();

  if (superAtivado) {
    el.msg.textContent = `🎉 SUPER PRÊMIO! CAPITÃES ALINHADOS!  +${ganho}`;
    el.msg.className = "super";
    flash = 140;
    iniciarFogos();
    mostrarOverlaySuper(ganho);
    if (window.Som) Som.super(ganho);
  } else if (ganho > 0) {
    el.msg.textContent = `Ganhou ${ganho}!  ${detalhes.join("  ")}`;
    el.msg.className = "ganhou";
    flash = 48;
    if (window.Som) Som.ganhou(ganho);
  } else {
    el.msg.textContent = "Não foi dessa vez.";
    el.msg.className = "perdeu";
  }

  if (ganhouGratis) {
    el.msg.textContent = `🎁 ${RODADAS_GRATIS} RODADAS GRÁTIS!  (${mapas}× 🗺️)` +
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

// chuva de moedas/estrelas caindo pela tela inteira -- só no super prêmio
const GLIFOS_CHUVA = ["✦", "★", "◆", "🪙"]; // ✦ ★ ◆ 🪙
function chuvaDeMoedas() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.className = "moeda";
    s.textContent = GLIFOS_CHUVA[Math.floor(Math.random() * GLIFOS_CHUVA.length)];
    s.style.left = (Math.random() * 100).toFixed(1) + "%";
    s.style.fontSize = (14 + Math.random() * 18).toFixed(0) + "px";
    s.style.setProperty("--dur", (2.4 + Math.random() * 2).toFixed(2) + "s");
    s.style.setProperty("--atraso", (Math.random() * 1.1).toFixed(2) + "s");
    s.style.setProperty("--rot", ((Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 420)).toFixed(0) + "deg");
    frag.appendChild(s);
  }
  el.overlay.appendChild(frag);
}

let overlayTimer = 0;
function mostrarOverlaySuper(valor) {
  el.overlay.querySelectorAll(".moeda").forEach((n) => n.remove());
  const alvoValor = document.getElementById("superValor");
  if (alvoValor) alvoValor.textContent = "+" + fmt(valor).replace("R$ ", "");
  el.overlay.hidden = false;
  el.overlay.style.animation = "none";
  void el.overlay.offsetWidth;
  el.overlay.style.animation = "";
  chuvaDeMoedas();
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    el.overlay.hidden = true;
    el.overlay.querySelectorAll(".moeda").forEach((n) => n.remove());
  }, 5200);
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
      desenharSimbolo(ctx, s, x, y, RAIO * k, t || 0);
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
  // só pode recarregar quando o valor zerou -- evita empilhar créditos de graça
  if (creditos > 0) return;
  // só recarrega o valor -- rodadas grátis continuam do jeito que estavam
  creditos += 5000;
  salvar();
  el.msg.textContent = "Recarregou R$ 5.000!";
  el.msg.className = "ganhou";
  atualizarPainel();
});

// ---------- Saque (fictício) ----------
// Tudo aqui é só de brincadeira: a chave PIX digitada nunca é salva nem
// enviada pra lugar nenhum (nem localStorage) -- serve só pra dar aquele
// clima de "saque de verdade" antes de zerar o valor fictício.
if (el.sacarBtn) {
  el.sacarBtn.addEventListener("click", () => {
    if (creditos <= 0) return;
    sacarAberto = true;
    atualizarPainel();
    if (el.pixChave) el.pixChave.focus();
  });
}
document.getElementById("pixCancelar")?.addEventListener("click", () => {
  sacarAberto = false;
  if (el.pixChave) el.pixChave.value = "";
  atualizarPainel();
});
document.getElementById("pixConfirmar")?.addEventListener("click", () => {
  const chave = el.pixChave ? el.pixChave.value.trim() : "";
  if (!chave) {
    if (el.pixChave) el.pixChave.focus();
    return;
  }
  const valor = creditos;
  creditos = 0;
  creditosVis = 0;
  sacarAberto = false;
  if (el.pixChave) el.pixChave.value = "";
  salvar();
  el.msg.textContent = `💸 Saque realizado com sucesso! ${fmt(valor)} (fictício)`;
  el.msg.className = "saque";
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

atualizarPainel();
requestAnimationFrame(loop);
