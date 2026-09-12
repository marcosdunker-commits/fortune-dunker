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
// coroa e sino são os símbolos "premium"/"intermediário" que deram mais
// variedade além das frutas -- os pesos não dependem de quantos rolos a
// grade tem (são chance por CÉLULA), então continuam os mesmos de quando
// a grade foi 6x5.
const SIMBOLOS = [
  { s: "coroa",    peso: 5,  pag: [8, 50, 200, 900] },
  { s: "sete",     peso: 7,  pag: [5, 30, 120, 600] },
  { s: "diamante", peso: 11, pag: [3, 18, 75, 300] },
  { s: "estrela",  peso: 9,  pag: [2, 9, 38, 135] },
  { s: "sino",     peso: 12, pag: [3, 12, 45, 160] },
  { s: "ferradura", peso: 23, pag: [2, 5, 18, 68] },
  { s: "limao",    peso: 47, pag: [2, 3, 11, 33] },
  { s: "cereja",   peso: 67, pag: [2, 3, 8, 24] },
];

// linhas de pagamento -- geradas a partir de NUM_ROLOS/LINHAS_VIS, então
// continuam corretas se a grade mudar de tamanho de novo no futuro.
const linhaReta = (row) => Array.from({ length: NUM_ROLOS }, () => row);
const DIAG_DESCE = Array.from({ length: NUM_ROLOS }, (_, i) => Math.round(i * (LINHAS_VIS - 1) / (NUM_ROLOS - 1)));
const LINHAS_PAG = [
  linhaReta(2), // meio
  linhaReta(0), // topo
  linhaReta(4), // base
  DIAG_DESCE,                        // diagonal \
  [...DIAG_DESCE].reverse(),         // diagonal /
];
const CORES_LINHA = ["#5ad1ff", "#4ade80", "#ff7b72", "#c084fc", "#ffd23f"];

const SUPER_PREMIO = 5000;

// ============================================================
//  SÍMBOLOS EM VETOR — todos iluminados, pulsando e brilhando
// ============================================================

// contornos de coroa, ferradura, estrela, cereja, limão e sino vieram
// prontos do game-icons.net (licença CC BY 3.0 -- autores Lorc e
// Delapouite, crédito completo no rodapé), viewBox 0 0 512 512. A gente
// só troca a cor/brilho/sombra/animação por cima -- o desenho em si (7 e
// diamante) continua feito à mão, ficou bom do jeito que estava.
const COROA_PATH = new Path2D("m408.256 119.46-37.7 52.165 19.57 44.426 34.8-37.214-16.67-59.375zm86.074 12.513L384.44 249.498 334.01 135.02l-75.162 132.947-86.948-131.78-33.334 114.122L17.922 132.83l39.3 127.6c1.945-.348 3.94-.54 5.98-.54 18.812 0 34.26 15.452 34.26 34.262 0 13.823-8.346 25.822-20.235 31.22l5.337 17.33c12.425 25.466 71.863 45.152 176.582 47.206 110.805 2.174 178.12-17.54 189.854-47.207h-.002l4.357-20.26c-16.836-2.114-30.02-16.612-30.02-33.986 0-18.81 15.45-34.262 34.263-34.262 3.513 0 6.91.54 10.11 1.54l26.622-123.762zm-391.77 2.04 1.22 56.337 25.56 24.89 9.592-32.842-36.37-48.386zm150.585 2.91-24.483 51.36 28.955 43.885 24.922-44.08-29.395-51.166zm204.453 135.962c-8.712 0-15.575 6.862-15.575 15.572 0 8.71 6.863 15.574 15.575 15.574s15.572-6.863 15.572-15.573-6.86-15.572-15.572-15.572zM63.2 278.58c-8.71 0-15.573 6.864-15.573 15.574s6.862 15.573 15.574 15.573c8.713 0 15.573-6.862 15.573-15.573 0-8.71-6.86-15.574-15.572-15.574zm130.33 17.842c18.812 0 34.26 15.45 34.26 34.262 0 18.81-15.448 34.26-34.26 34.26-18.813 0-34.262-15.45-34.262-34.26s15.45-34.262 34.26-34.262zm131.234 0c18.812 0 34.26 15.45 34.26 34.262 0 18.81-15.448 34.26-34.26 34.26-18.813 0-34.262-15.45-34.262-34.26s15.45-34.262 34.262-34.262zm-131.235 18.69c-8.713 0-15.573 6.86-15.573 15.572 0 8.71 6.86 15.574 15.572 15.574 8.71 0 15.572-6.864 15.572-15.574s-6.86-15.573-15.573-15.573zm131.234 0c-8.712 0-15.573 6.86-15.573 15.572 0 8.71 6.862 15.574 15.574 15.574s15.574-6.864 15.574-15.574-6.862-15.573-15.574-15.573z");
const FERRADURA_PATH = new Path2D("M251.188 28.538c-202.97 2.955-190.282 230.2-126.782 409.47-14.678 9.41-17.29 6.385-15.75 17.062 1.105 7.65 12.483 23.233 17.563 25.844s9.372 2.85 17.03 2.343 60.337-8.77 49.22-22.625c-48-67.4-126.572-365.46 63.53-374.062 190.102 8.603 111.53 306.66 63.53 374.062-11.117 13.855 41.562 22.117 49.22 22.625s11.95.267 17.03-2.343 16.46-18.194 17.564-25.844c1.54-10.678-1.072-7.65-15.75-17.063 63.5-179.27 76.187-406.514-126.78-409.469-1.6-.023-3.19-.005-4.814 0-1.625-.004-3.214-.023-4.813 0zm-45.625 22.157c6.903 0 12.5 5.596 12.5 12.5s-5.597 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.596-12.5 12.5-12.5zm100.875 0c6.903 0 12.5 5.596 12.5 12.5s-5.597 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.596-12.5 12.5-12.5zM135.594 109.32c6.903 0 12.5 5.596 12.5 12.5s-5.597 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.596-12.5 12.5-12.5zm240.812 0c6.904 0 12.5 5.596 12.5 12.5s-5.596 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.597-12.5 12.5-12.5zm-266.844 96c6.904 0 12.5 5.596 12.5 12.5s-5.596 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.597-12.5 12.5-12.5zm292.875 0c6.904 0 12.5 5.596 12.5 12.5s-5.596 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.597-12.5 12.5-12.5zM118.22 307.82c6.902 0 12.5 5.596 12.5 12.5s-5.598 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.595-12.5 12.5-12.5zm275.56 0c6.905 0 12.5 5.596 12.5 12.5s-5.595 12.5-12.5 12.5-12.5-5.597-12.5-12.5 5.598-12.5 12.5-12.5zm-254.936 84.062c6.903 0 12.5 5.597 12.5 12.5s-5.597 12.5-12.5 12.5-12.5-5.596-12.5-12.5 5.596-12.5 12.5-12.5zm234.312 0c6.904 0 12.5 5.597 12.5 12.5s-5.596 12.5-12.5 12.5-12.5-5.596-12.5-12.5 5.597-12.5 12.5-12.5z");
const ESTRELA_PATH = new Path2D("M256 22.017l-69.427 102.007-123.038-9.32L100 232.584l-84 90.384 114.898 44.987 18.292 122.028L256 428.2l106.81 61.783 18.292-122.028L496 322.968l-84-90.385 36.465-117.88-123.038 9.32z");
const CEREJA_PATH = new Path2D("M278.814 35.137c-3.87 29.372 2.21 62.917 23.563 91.277 24.7 32.807 70.077 59.506 146.49 64.467-10.864-53.306-31.943-84.387-60.87-107.415-23.07-18.367-51.784-31.734-84.02-45.96 29.838 36.785 60.63 73.392 105.382 92.694l-7.13 16.527c-55.713-24.03-90.292-70.698-123.416-111.59zM259.2 46.79c-42.613 88.792-88.927 175.71-147.975 257.08-1.967-1.61-3.77-3.225-5.454-4.725-4.98-4.436-9.11-7.99-15.42-10.407-2.338-.896-4.675-1.33-7.02-1.326-7.035.01-14.15 3.948-21.65 11.11-10 9.553-18.946 24.412-23.893 37.62-14.318 38.227 4.955 80.574 43.186 94.89 38.23 14.32 80.582-4.952 94.9-43.178 4.94-13.187 8.024-30.42 6.8-44.243-.61-6.91-2.283-12.897-4.786-17.208-2.503-4.31-5.532-7.033-10.21-8.627-4.466-1.52-10.517-1.707-17.765-1.85-6.83-.133-14.742-.297-22.97-3.064 53.342-73.767 96.236-151.695 135.23-230.99-7.14 56.593-14.18 114.543-29.91 170.29-7.03-.83-12.847-3.195-17.887-5.144-6.222-2.407-11.337-4.285-18.094-4.336-10.013-.077-17.4 6.766-23.415 19.216-5.06 10.48-8.094 24.21-8.93 36.708 3.11.388 6.3 1.027 9.544 2.132 8.872 3.023 15.68 9.234 19.973 16.627 4.293 7.394 6.374 15.88 7.15 24.662.775 8.75.267 17.862-1.156 26.727 11.08 6.646 24.062 10.47 37.967 10.47 40.825 0 73.725-32.898 73.725-73.718 0-14.08-3.156-31.3-9.15-43.817-2.997-6.257-6.663-11.276-10.52-14.435-3.856-3.16-7.648-4.648-12.59-4.5-4.713.142-10.445 2.09-17.282 4.498-3.142 1.107-6.54 2.286-10.188 3.25 11.84-43.77 18.6-88.247 24.276-131.803C263.302 95.443 258.402 70.4 259.2 46.79zm46.732 110.605c1.617 5.452 3.26 10.96 4.945 16.554 20.44 67.845 45.324 144.313 68.207 195.255-4.537.18-8.715-.204-12.46-.52-6.65-.564-12.083-.93-18.583.917-9.63 2.738-14.8 11.38-17.075 25.017-2.275 13.638-.524 30.894 3.437 44.43 11.464 39.178 52.28 61.515 91.463 50.052 39.182-11.464 61.52-52.276 50.057-91.454-3.955-13.514-11.82-29.155-21.086-39.484-4.634-5.164-9.564-8.953-14.152-10.902-2.295-.975-4.456-1.554-6.63-1.698-2.177-.143-4.368.15-6.718.915-4.485 1.458-9.44 4.937-15.324 9.168-4.337 3.118-9.218 6.61-15.076 9.29-21.51-47.232-46.358-122.123-66.762-189.375-9.007-5.556-17.075-11.646-24.242-18.168z");
const LIMAO_PATH = new Path2D("M372.155 22.74c-2.383.006-4.78.023-7.188.048-96.615 1.006-212.449 16.343-293.129 48.299 53.634 30.517 147.245 69.92 225.258 63.623 105.888-13.769 130.213-63.196 166.272-101.89-80.543 35.402-188.935 68.295-277.344 47.288l4.16-17.513c73.994 17.581 169.091-7.127 245.187-37.719-19.444-1.475-40.736-2.204-63.216-2.137zm116.047 10.769c-39.292 35.566-65.02 103.045-189.024 119.088l-.209.027-.213.018c-61.286 5.007-128.03-14.881-181.385-38.34C27.258 195.335-3.358 324.769 46.178 423.278c-7.19 15.133-14.1 55.714-5.344 61.455 9.907 6.497 56.377 9.562 100.434-16.152 266.975 22.149 381.075-197.096 334.31-373.64 8.996-17.539 16.994-48.322 12.623-61.432zm-48.096 205.65l17.713 3.207c-2.711 14.97-3.485 18.941-11.979 35.942l-16.103-8.045c8.295-16.605 7.624-15.945 10.369-31.104zm-35.526 1.266l17.248 5.146c-3.966 13.29-4.674 15.182-15.61 32.938l-15.327-9.44c10.918-17.725 9.683-15.218 13.69-28.644zm17.729 53.422l16.557 7.062c-8.988 21.07-21.13 37.16-39.688 52.98l-11.676-13.699c17.009-14.499 26.767-27.494 34.807-46.343zm-46.104 1.103l15.397 9.324c-2.623 4.33-8.042 11.385-14.457 19.522-6.415 8.136-13.293 16.513-17.988 21.48l-13.08-12.365c3.706-3.92 10.693-12.345 16.931-20.258 6.239-7.913 12.26-16.156 13.197-17.703zm-43.068 50.4l12.639 12.815c-9.895 9.759-20.094 15.268-35.375 24.004l-8.934-15.627c15.413-8.811 23.773-13.403 31.67-21.191zm35.586 17.608l11.492 13.854c-9.585 7.95-22.44 17.369-37.342 25.14l-8.324-15.96c13.363-6.97 25.313-15.684 34.174-23.034zm-88.23 15.025l5.69 17.077-17.878 5.96-5.691-17.078zm-41.774 14.329l5.309 17.199c-16.105 4.971-22.016 7.66-42.565 7.85l-.166-18c19.248-.178 20.64-1.87 37.422-7.05zm69.85 7.666l7.642 16.296c-15.603 7.318-36.356 15.454-56.24 19.31l-3.426-17.67c17.473-3.389 37.378-11.067 52.024-17.936zm-91.68 29.017l4.77 17.358c-11.888 3.267-22 2.141-35.957 1.748l.507-17.993c14.53.41 22.439 1.152 30.68-1.113z");
const SINO_PATH = new Path2D("M254.125 26.188c-17.377-.003-31.66 14.28-31.656 31.656 0 7.617 2.733 14.64 7.28 20.125-10.79 3.876-19.043 10.963-26.906 22.06-13.057 18.43-23.687 49.03-35.406 92.782-10.257 38.29-24.345 57.012-34.657 70.563-10.31 13.55-16.252 20.325-16.25 42.688.002 3.5 1.975 7.314 8.44 12.03 6.463 4.717 16.877 9.383 29.905 13.188 26.055 7.612 62.442 11.962 100.25 11.97 19.384.004 38.368-1.15 55.78-3.28v.124c12.13-1.043 33.332-3.898 51.345-10.28 5.795-2.055 11.28-4.422 16.125-7.533 2.612-1.376 4.947-2.747 6.875-4.155 6.458-4.714 8.438-8.523 8.438-12.03-.004-22.363-5.935-29.135-16.25-42.69-10.316-13.553-24.42-32.27-34.688-70.56-11.732-43.757-22.343-74.35-35.406-92.782-8.225-11.607-16.895-18.836-28.438-22.594 4.31-5.41 6.908-12.24 6.906-19.626-.002-17.377-14.31-31.654-31.687-31.657zm0 18.687c7.278 0 13 5.694 13 12.97 0 7.272-5.722 12.97-13 12.968-7.278-.002-12.968-5.696-12.97-12.97 0-7.273 5.693-12.97 12.97-12.968zm9.22 43.22c34.616 10.188 49.56 64.686 58.124 101.56 14.99 64.56 45.652 82.98 53.03 111.25-.327.633-1.002 1.286-2.094 2.408-2.665 2.74-8.816 6.216-16.406 8.906-7.366 2.61-16 4.614-24.188 6.124-1.73-38.024-33.765-53.55-33.25-107.47.603-63.043-17.19-103.352-39.5-121.78 1.468-.233 2.886-.57 4.282-1zm-206.876 91.28C23.546 223.947 11.19 289.253 28.874 355.25c18.208 67.957 63.562 118.994 116.313 140.03-38.592-30.418-72.26-83.223-89.75-148.5-16.674-62.228-14.924-122.366 1.03-167.405zm399.436 0c15.955 45.04 17.705 105.177 1.03 167.406-17.49 65.277-51.157 118.082-89.748 148.5 52.75-21.036 98.135-72.073 116.343-140.03 17.686-65.997 5.298-131.303-27.624-175.875zM105.687 210.28c-29.71 34.43-42.433 83.74-29.343 132.595 13.478 50.306 50.845 87.082 95.5 101.156-32.19-21.55-59.46-60.02-72.406-108.342-12.344-46.066-8.896-91.175 6.25-125.407zm301.032 0c15.144 34.233 18.56 79.342 6.217 125.407-12.947 48.322-40.185 86.793-72.375 108.344 44.655-14.073 81.99-50.85 95.47-101.155 13.09-48.856.396-98.166-29.313-132.594zM146.53 348.25c1.218 12.736 11.944 22.686 25 22.688 9.422 0 17.642-5.173 21.94-12.844-15.986-2.11-30.823-5.08-43.814-8.875-1.06-.31-2.09-.65-3.125-.97z");

const FASE = { coroa: 0, sete: 1, diamante: 2, estrela: 3, sino: 4, ferradura: 5, limao: 6, cereja: 7 };
const HALO = {
  coroa: "255,215,90",
  sete: "255,70,70",
  diamante: "120,220,255",
  estrela: "255,215,90",
  sino: "255,200,110",
  ferradura: "200,215,235",
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
  // contorno profissional (ESTRELA_PATH, ver aviso de crédito no rodapé)
  const esc = R * 0.0033;
  g.save();
  g.rotate((t / 2600) % (Math.PI * 2));
  g.scale(esc, esc);
  g.translate(-256, -256);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#fff3c4");
  gr.addColorStop(0.5, "#ffd23f");
  gr.addColorStop(1, "#d99312");
  g.save();
  g.shadowColor = `rgba(255,210,80,${0.6 + 0.4 * pulso})`;
  g.shadowBlur = 100 + 180 * pulso;
  g.fillStyle = gr;
  g.fill(ESTRELA_PATH);
  g.restore();
  g.lineWidth = 21;
  g.strokeStyle = "#fff6da";
  g.stroke(ESTRELA_PATH);
  g.restore();
  cintila(g, 0, -R * 0.05, R * (0.3 + 0.16 * Math.abs(Math.sin(t / 200))), "#fff3c4");
}

function desenhaCereja(g, R, t, pulso) {
  // contorno profissional (CEREJA_PATH) -- balança devagar, pendurada
  const esc = R * 0.0033;
  const balanco = Math.sin(t / 700) * 0.09;
  g.save();
  g.rotate(balanco);
  g.scale(esc, esc);
  g.translate(-256, -256);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#ff9a9a");
  gr.addColorStop(0.5, "#e01e2b");
  gr.addColorStop(1, "#8c0b17");
  g.save();
  g.shadowColor = `rgba(255,60,80,${0.4 + 0.4 * pulso})`;
  g.shadowBlur = 90 + 170 * pulso;
  g.fillStyle = gr;
  g.fill(CEREJA_PATH);
  g.restore();
  g.lineWidth = 10;
  g.strokeStyle = "#ffd9d9";
  g.stroke(CEREJA_PATH);
  g.restore();
  cintila(g, -R * 0.35, -R * 0.3, R * (0.16 + 0.14 * pulso));
}

function desenhaLimao(g, R, t, pulso) {
  // contorno profissional (LIMAO_PATH) -- balanço suave contínuo
  const esc = R * 0.0033;
  const balanco = -0.12 + Math.sin(t / 480) * 0.1;
  g.save();
  g.rotate(balanco);
  g.scale(esc, esc);
  g.translate(-256, -256);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#fff6b0");
  gr.addColorStop(0.5, "#ffdd33");
  gr.addColorStop(1, "#e0a70c");
  g.save();
  g.shadowColor = `rgba(255,225,80,${0.4 + 0.4 * pulso})`;
  g.shadowBlur = 90 + 170 * pulso;
  g.fillStyle = gr;
  g.fill(LIMAO_PATH);
  g.restore();
  g.lineWidth = 9;
  g.strokeStyle = "#fffbe0";
  g.stroke(LIMAO_PATH);
  g.restore();
  cintila(g, R * 0.35, -R * 0.35, R * (0.14 + 0.12 * pulso));
}

function desenhaFerradura(g, R, t, pulso) {
  // contorno profissional (FERRADURA_PATH) -- metal prateado, balançando
  // como se estivesse pendurada, bem mais animada que os outros
  const esc = R * 0.0033;
  const balanco = Math.sin(t / 500) * 0.22;

  g.save();
  g.rotate(balanco);
  g.scale(esc, esc);
  g.translate(-256, -256);

  const gr = g.createLinearGradient(0, 0, 460, 460);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(0.45, "#cfe0ee");
  gr.addColorStop(0.75, "#8fa9c2");
  gr.addColorStop(1, "#4c6079");
  g.save();
  g.shadowColor = `rgba(190,215,255,${0.5 + 0.4 * pulso})`;
  g.shadowBlur = 100 + 200 * pulso;
  g.fillStyle = gr;
  g.fill(FERRADURA_PATH);
  g.restore();

  g.lineWidth = 8;
  g.strokeStyle = "#fbfeff";
  g.stroke(FERRADURA_PATH);

  // brilho metálico que desliza
  g.save();
  g.clip(FERRADURA_PATH);
  const off = ((t / 600) % 2 - 1) * 520;
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(255,255,255,0.6)";
  g.lineWidth = 60;
  g.beginPath();
  g.moveTo(off - 100, -100);
  g.lineTo(off + 100, 540);
  g.stroke();
  g.restore();
  g.restore();

  cintila(g, -R * 0.4, -R * 0.5, R * (0.16 + 0.14 * pulso), "#eaf6ff");
  cintila(g, R * 0.42, R * 0.1, R * (0.12 + 0.1 * pulso), "#ffffff");
}

function desenhaCoroa(g, R, t, pulso) {
  // contorno profissional (COROA_PATH); a gente só aplica cor/brilho/animação
  const esc = R * 0.0033; // o path é 512x512 -> encolhe pro tamanho do símbolo
  const balanco = Math.sin(t / 900) * 0.14;       // balanço suave contínuo
  const flutua = Math.abs(Math.sin(t / 620)) * R * 0.08; // flutua pra cima e voltando

  g.save();
  g.rotate(balanco);
  g.translate(0, -flutua);
  g.scale(esc, esc);
  g.translate(-256, -256);

  const gr = g.createLinearGradient(0, 0, 0, 460);
  gr.addColorStop(0, "#fff7d6");
  gr.addColorStop(0.5, "#ffd23f");
  gr.addColorStop(1, "#a9791a");
  g.save();
  g.shadowColor = `rgba(255,215,90,${0.55 + 0.4 * pulso})`;
  g.shadowBlur = 100 + 210 * pulso;
  g.fillStyle = gr;
  g.fill(COROA_PATH);
  g.restore();

  g.lineWidth = 21;
  g.strokeStyle = "#fff6da";
  g.stroke(COROA_PATH);

  // brilho que desliza por cima, sem parar
  g.save();
  g.clip(COROA_PATH);
  const off = ((t / 650) % 2 - 1) * 480;
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 55;
  g.beginPath();
  g.moveTo(off - 260, -80);
  g.lineTo(off + 260, 540);
  g.stroke();
  g.restore();
  g.restore();

  cintila(g, -R * 0.5, -R * 0.55, R * (0.2 + 0.18 * pulso));
  cintila(g, R * 0.45, -R * 0.15, R * (0.14 + 0.12 * pulso), "#fff3c4");
}

function desenhaSino(g, R, t, pulso) {
  // contorno profissional (SINO_PATH, já vem com as ondas de "toque" nas
  // laterais) -- treme mais forte de vez em quando, tipo tocando de verdade
  const esc = R * 0.0033;
  const forca = 0.4 + 0.6 * Math.abs(Math.sin(t / 1400));
  const balanco = Math.sin(t / 170) * 0.1 * forca;
  g.save();
  g.rotate(balanco);
  g.scale(esc, esc);
  g.translate(-256, -256);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#fff6b0");
  gr.addColorStop(0.55, "#ffcf3f");
  gr.addColorStop(1, "#b8790f");
  g.save();
  g.shadowColor = `rgba(255,200,110,${0.45 + 0.4 * pulso})`;
  g.shadowBlur = 110 + 190 * pulso;
  g.fillStyle = gr;
  g.fill(SINO_PATH);
  g.restore();
  g.lineWidth = 10;
  g.strokeStyle = "#fff2c0";
  g.stroke(SINO_PATH);
  g.restore();
  cintila(g, -R * 0.35, -R * 0.4, R * (0.16 + 0.14 * pulso));
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
  else if (tipo === "ferradura") desenhaFerradura(g, R, t, pulso);
  else if (tipo === "coroa") desenhaCoroa(g, R, t, pulso);
  else if (tipo === "sino") desenhaSino(g, R, t, pulso);

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

// rodadas grátis: sai com 5+ estrelas na grade; joga sem descontar a aposta
// (grade voltou a 25 células -- gatilho volta a 5, mesma dificuldade de antes)
const GATILHO_GRATIS = 5;      // quantas ⭐ pra ativar
const RODADAS_GRATIS = 10;     // quantas rodadas ganha

let creditos = carregarCreditos();
let coletadas = carregarLetras();
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
  letras: [...document.querySelectorAll(".letras span")],
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
  // "Sacar" e "Recarregar" nunca aparecem juntos: com saldo, só dá pra
  // sacar; zerado, só dá pra recarregar.
  const podeSacar = creditos > 0;
  if (el.resetar) el.resetar.hidden = podeSacar;
  if (el.sacarBtn) el.sacarBtn.hidden = !podeSacar || sacarAberto;
  if (el.sacarForm) el.sacarForm.hidden = !sacarAberto;
  if (el.sacarBtn) el.sacarBtn.textContent = "\u{1F4B8} Sacar " + fmt(creditos);
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
function mostrarOverlaySuper() {
  el.overlay.querySelectorAll(".moeda").forEach((n) => n.remove());
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
  // só pode recarregar quando o valor zerou -- evita empilhar créditos de graça
  if (creditos > 0) return;
  // só recarrega o valor -- rodadas grátis e letras coletadas continuam do
  // jeito que estavam, ninguém quer perder o progresso do super prêmio
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
