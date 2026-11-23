// Monta 04_ThreeJS/web/treinamento.js: partes genericas do motor do cassino (paineis, legenda, vozes, personagens,
// arma e tiro) + a logica das missoes da favela (missoes.js). Uso: node montar_motor.js <treinamento.js do cassino> <saida>
const fs = require('fs'), path = require('path');
const [, , ORIG, SAIDA] = process.argv;
const L = fs.readFileSync(ORIG, 'utf8').split(/\r?\n/);
const faixa = (a, b) => L.slice(a - 1, b).join('\n');           // linhas a..b (1 = primeira)
let A = faixa(16, 411), B = faixa(551, 889);
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error('nao achou: ' + a.slice(0, 90)); return s.replace(a, b); };

// ---- parte generica (paineis, legenda, vozes, personagens)
A = rep(A, `const CEN = await fetch(HQ('treinamento/cenario_cs_01.json')).then(r => r.json());`, `const CEN = await fetch(HQ('treinamento/cenario_favela_01.json')).then(r => r.json());`);
A = rep(A, faixa(251, 256), `  /* personagens reais (Rocketbox, licenca MIT): baixados so quando a missao precisa (personagens/<papel>.glb) */
  const modelos = {};
  const glP = new GLTFLoader();
  const MANIF = fetch(HQ('personagens/manifest.json')).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const carregarPapeis = lista => MANIF.then(man => Promise.all([...new Set(lista)].filter(p => man[p] && !modelos[p]).map(p => glP.loadAsync(HQ(man[p].arquivo)).then(g => { modelos[p] = g; }).catch(() => { }))));`);
// personagens andam nas escadas: a altura acompanha o chao
A = rep(A, `    n.position.addScaledVector(V2.normalize(), Math.min(L, (u.vel || 1.4) * dt));`,
  `    n.position.addScaledVector(V2.normalize(), Math.min(L, (u.vel || 1.4) * dt));
    n.position.y = ALT(n.position.x, n.position.z, n.position.y);`);

// ---- arma, tiro, sangue (o chao da favela tem varias alturas: nada de piso fixo em y = 0,15)
B = rep(B, `scene.add(m); soltos.push({ m, v: lado.multiplyScalar(1.6 + Math.random()).add(new THREE.Vector3(0, 1.8, 0)), t: 0, vida: 1.1, giro: 20 });`,
  `scene.add(m); soltos.push({ m, v: lado.multiplyScalar(1.6 + Math.random()).add(new THREE.Vector3(0, 1.8, 0)), t: 0, vida: 1.1, giro: 20, chao: rig.position.y + .01 });`);
B = rep(B, `scene.add(m); soltos.push({ m, v, t: 0, vida: .55 + Math.random() * .3, giro: 0 });`,
  `scene.add(m); soltos.push({ m, v, t: 0, vida: .55 + Math.random() * .3, giro: 0, chao: p.y - 1.3 });`);
B = rep(B, `if (o.m.position.y < .16) { o.m.position.y = .16; o.v.set(0, 0, 0); }`,
  `const ch = o.chao ?? -1e9; if (o.m.position.y < ch) { o.m.position.y = ch; o.v.set(0, 0, 0); }`);
B = rep(B, `new THREE.Vector3(n.position.x + Math.sin(n.rotation.y) * 1.0, .152, n.position.z + Math.cos(n.rotation.y) * 1.0)`,
  `new THREE.Vector3(n.position.x + Math.sin(n.rotation.y) * 1.0, ALT(n.position.x + Math.sin(n.rotation.y), n.position.z + Math.cos(n.rotation.y), n.position.y) + .004, n.position.z + Math.cos(n.rotation.y) * 1.0)`);
B = rep(B, `if (u.sentado) { u.sentado = false; n.position.y = .15; }`, `if (u.sentado) { u.sentado = false; n.position.y = ALT(n.position.x, n.position.z, n.position.y + 1); }`);
B = rep(B, `    const g = chave === 'seguranca_2' ? armaSolta2 : chave === 'atirador' ? armaSolta3 : armaSolta;
    g.position.set(p.x + .35, .17, p.z + .2);`, `    const g = chave === 'vendedor' ? armaSolta2 : chave === 'morador' ? armaSolta3 : armaSolta;
    g.position.set(p.x + .35, p.y + .02, p.z + .2);`);
// quem segura fuzil e posicionado por poseFuzil (missoes.js), nao pela mao
B = rep(B, `const g = n.userData.arma; if (!g?.visible) continue;`, `const g = n.userData.arma; if (!g?.visible || g.userData.fuzil) continue;`);
B = rep(B, `if (u.ameaca) { if (u.chave === 'atirador') registrar('resposta_sala', 'granada'); renderNPC(n, true); }`, `if (u.ameaca) renderNPC(n, true);`);
B = rep(B, `        if (n.userData.ameaca) { registrar(k === 'atirador' ? 'resposta_sala' : 'resposta_proporcional', 'disparo'); if (ameacando().length <= 1) legenda('Instrutor', 'Agressão armada atual: o disparo foi resposta legítima. Agora, socorro imediato e comunicação.', 6); }
        else registrar('disparo_injustificado', n.userData.nome);`,
`        if (n.userData.ameaca) {
          registrar('resposta_proporcional', 'disparo');
          // civis perto da linha de tiro (ate pouco depois do alvo): falha grave
          const civis = Object.values(npcs).filter(c => c !== n && c.visible && !c.userData.caido && !/^(parceiro|apoio)$/.test(c.userData.chave));
          const o = ray.ray.origin, dd = ray.ray.direction;
          if (civis.some(c => { const p = c.position.clone().setY(c.position.y + 1.1).sub(o); const t = p.dot(dd); return t > 0 && t < hn.distance + 3 && p.addScaledVector(dd, -t).length() < .8; })) registrar('tiro_com_civis');
          if (ameacando().length <= 1) legenda('Instrutor', 'Agressão armada atual: o disparo foi resposta legítima. Agora, socorro imediato e comunicação.', 6);
        }
        else if (n.userData.fugindo) registrar('tiro_fuga', n.userData.nome);
        else registrar('disparo_injustificado', n.userData.nome);`);

const cab = `/*
  Favela - motor do treinamento (partes genericas copiadas do cassino; missoes em ferramentas/motor/missoes.js)
  Gerado por ferramentas/motor/montar_motor.js: edite missoes.js e rode de novo, nao este arquivo.
  Le treinamento/cenario_favela_01.json (fases, acoes, pontos, falhas graves, variacoes, dialogos, historia).

  Controles
    Computador: clique = falar / usar / botoes   T = menu   K = checklist   Q = saca ou guarda a arma (clique dispara)   R = recarrega
    Quest:      gatilho = falar / usar / botoes / teleporte   A = saca a arma (gatilho direito dispara; apertar o analogico direito recarrega)
                botao Y ou B = menu do treinamento
  Variacoes forcadas pela URL (para o instrutor):  ?v=missao:deposito,suspeito:atira,evento:crianca
*/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export async function iniciar(ctx) {
`;
const base = `
  const suave = (seg, passo) => new Promise(fim => {          // interpola de 0 a 1 em 'seg' segundos (setTimeout: funciona com a aba oculta)
    const t0 = performance.now();
    const tic = () => { const k = Math.min(1, (performance.now() - t0) / (seg * 1000)); passo(k * k * (3 - 2 * k)); k < 1 ? setTimeout(tic, 16) : fim(); };
    tic();
  });
  const invisivel = () => new THREE.MeshBasicMaterial({ visible: false });
`;
const missoes = fs.readFileSync(path.join(__dirname, 'missoes.js'), 'utf8');
fs.writeFileSync(SAIDA, cab + A + '\n' + base + '\n' + B + '\n' + missoes);
console.log('motor montado:', (cab + A + base + B + missoes).split('\n').length, 'linhas');
// confere a sintaxe como modulo (pega nome declarado duas vezes, que o --check comum deixa passar)
require('child_process').execSync('node --input-type=module --check', { input: fs.readFileSync(SAIDA), stdio: ['pipe', 'inherit', 'inherit'] });
console.log('sintaxe ok');
