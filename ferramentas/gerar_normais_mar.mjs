// Gera o mapa de normais das ondas do mar (repete sem emenda): soma de ondas com frequencias inteiras em
// direcoes sorteadas, amplitude caindo com a frequencia (como o espectro do mar). Saida: PNG 512 x 512.
// Uso: node gerar_normais_mar.mjs <saida.png>
import sharp from 'sharp';
const [, , SAIDA] = process.argv;
const N = 512, ondas = [];
let semente = 7; const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 70; i++) {
  const a = rnd() * Math.PI * 2, f = 2 + Math.floor(Math.pow(rnd(), 1.6) * 22);      // frequencia (ciclos por ladrilho)
  const kx = Math.round(Math.cos(a) * f), ky = Math.round(Math.sin(a) * f);
  if (!kx && !ky) continue;
  const k = Math.hypot(kx, ky);
  ondas.push({ kx, ky, amp: 1 / Math.pow(k, 1.7), fase: rnd() * Math.PI * 2 });
}
const px = Buffer.alloc(N * N * 3);
const DX = new Float32Array(N * N), DY = new Float32Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let dx = 0, dy = 0;
  for (const o of ondas) {
    const t = 2 * Math.PI * (o.kx * x + o.ky * y) / N + o.fase;
    // crista mais aguda (forma de onda do mar): derivada de -|sin|^1.5 aproximada por cos * (1 + 0.5 sin)
    const d = Math.cos(t) * (1 + .5 * Math.sin(t)) * o.amp * 2 * Math.PI / N;
    dx += d * o.kx; dy += d * o.ky;
  }
  DX[y * N + x] = dx; DY[y * N + x] = dy;
}
// intensidade: 98% dos pontos com inclinacao ate INCL (ondulacao moderada; o site ainda ajusta pela distancia)
const INCL = .45, incl = Array.from(DX, (v, i) => Math.hypot(v, DY[i])).sort((a, b) => a - b), esc = INCL / incl[Math.floor(incl.length * .98)];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let nx = -DX[y * N + x] * esc, ny = -DY[y * N + x] * esc, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
  const i = (y * N + x) * 3;
  px[i] = Math.round((nx * .5 + .5) * 255); px[i + 1] = Math.round((ny * .5 + .5) * 255); px[i + 2] = Math.round((nz * .5 + .5) * 255);
}
await sharp(px, { raw: { width: N, height: N, channels: 3 } }).png().toFile(SAIDA);
console.log('ok', ondas.length, 'ondas');
