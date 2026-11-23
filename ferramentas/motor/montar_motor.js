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
  const glP = ctx.loaderGLB || new GLTFLoader();      // o do cenario: le KTX2 (texturas comprimidas) e meshopt
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
// carregador muda com a arma do policial (pistola 15, fuzil 30); ao sacar, a posicao depende da arma
B = rep(B, `const CARREGADOR = 15, MIRA = new THREE.Vector3(), BOCA = new THREE.Vector3();`, `let CARREGADOR = 15; const MIRA = new THREE.Vector3(), BOCA = new THREE.Vector3();`);
B = rep(B, `arma.visible = on; mostrarControle('right', !on); status();`, `arma.visible = on; mostrarArmaPolicial(); mostrarControle('right', !on); status();`);
// fuzil do policial atira em rajada: intervalo menor entre tiros
B = rep(B, `if (agora - ultimoTiro < 280 || S.recarregando) return true;`, `if (agora - ultimoTiro < ({ fuzil: 95, sniper: 1300 }[S.armaTipo] || 280) || S.recarregando) return true;`);
// recuo depende da arma (recuo() em missoes.js): pistola pula para cima; fuzil coice no ombro, sobe e abre na rajada
B = rep(B, `somTiro(); acenderFlash(clarao); capsula(arma); status(); const rx = arma.rotation.x; arma.rotation.x = rx + .22;
    setTimeout(() => { arma.rotation.x = rx; }, 130);`, `somTiro(); acenderFlash(clarao); capsula(arma); status(); recuo(ray);`);
// a arma do NPC mira o alvo dele (refem, equipe) quando houver; senao, o policial
B = rep(B, `mao.getWorldPosition(g.position); camera.getWorldPosition(GT);`, `mao.getWorldPosition(g.position); if (n.userData.alvoMira) GT.copy(n.userData.alvoMira); else camera.getWorldPosition(GT);`);
// chance de acerto do bandido cai com a distancia (atiradores contra a laje do sniper)
B = rep(B, `if (visto(de, alvo) && Math.random() < .3) return policialAtingido();`, `if (visto(de, alvo) && Math.random() < (n.userData.acerto ?? (de.distanceTo(alvo) > 20 ? .1 : .3))) return policialAtingido();`);
// atiradores: cadencia propria; tiro que erra passa estalando perto (e marca a parede), mesmo de longe
B = rep(B, `u.proxTiro = agora + 1500 + Math.random() * 1300;`, `u.proxTiro = agora + (u.cadencia || 1500) + Math.random() * (u.cadencia ? 800 : 1300);`);
B = rep(B, `rayG.far = 30; const h = rayG.intersectObjects(ctx.colisao(), false)[0]; if (h?.face) marcar(h);`, `rayG.far = 90; const h = rayG.intersectObjects(ctx.colisao(), false)[0]; if (h?.face) marcar(h); if (!h || h.point.distanceTo(alvo) < 5) estouro(.035, 6500, .32);`);
// quem segura fuzil e posicionado por poseFuzil (missoes.js), nao pela mao
B = rep(B, `const g = n.userData.arma; if (!g?.visible) continue;`, `const g = n.userData.arma; if (!g?.visible || g.userData.fuzil) continue;`);
B = rep(B, `if (u.ameaca) { if (u.chave === 'atirador') registrar('resposta_sala', 'granada'); renderNPC(n, true); }`, `if (u.ameaca) renderNPC(n, true);`);
B = rep(B, `        if (n.userData.ameaca) { registrar(k === 'atirador' ? 'resposta_sala' : 'resposta_proporcional', 'disparo'); if (ameacando().length <= 1) legenda('Instrutor', 'Agressão armada atual: o disparo foi resposta legítima. Agora, socorro imediato e comunicação.', 6); }
        else registrar('disparo_injustificado', n.userData.nome);`,
`        if (n.userData.ameaca) {
          registrar('resposta_proporcional', 'disparo');
          // civis perto da linha de tiro (ate pouco depois do alvo): falha grave. Fuzil de precisao: margem estreita e so antes do alvo
          const civis = Object.values(npcs).filter(c => c !== n && c.visible && !c.userData.caido && !/^(parceiro|apoio)$/.test(c.userData.chave) && !c.userData.ameaca && !c.userData.atacante);
          const o = ray.ray.origin, dd = ray.ray.direction;
          if (civis.some(c => { const p = c.position.clone().setY(c.position.y + 1.1).sub(o); const t = p.dot(dd); const sn = S.armaTipo === 'sniper'; return t > 0 && t < hn.distance + (sn ? 0 : 3) && p.addScaledVector(dd, -t).length() < (sn ? .28 : .8); })) registrar('tiro_com_civis');
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
// ---- quedas ao levar tiro: as animacoes do Mixamo ("Dying") ja no esqueleto Rocketbox (personagens/quedas.glb), como no CIEP
A = rep(A, "  function personagem(papel, nome, cor, altura, calca) {", `  // e as de arma dos bandidos (fuzil e pistola, Mixamo -> Rocketbox: personagens/armas_anim.glb)
  let QUEDAS = [];
  const prepAnim = g => {
    for (const clip of g.animations) {
      const t0 = Math.min(...clip.tracks.map(t => t.times[0]));      // animacao cortada no meio (morrendo_sentado): comeca em 0
      if (t0 > .1) { new Set(clip.tracks.map(t => t.times)).forEach(ts => { for (let i = 0; i < ts.length; i++) ts[i] -= t0; }); clip.resetDuration(); }
    }
    g.scene.updateMatrixWorld(true); const pe = g.scene.getObjectByName('Bip01_Pelvis');
    return { clips: g.animations, quadril: pe ? g.scene.worldToLocal(pe.getWorldPosition(new THREE.Vector3())).y : 0 };
  };
  const quedasProntas = Promise.all(['quedas', 'armas_anim'].map(a => glP.loadAsync(HQ('personagens/' + a + '.glb')).then(prepAnim).catch(() => null))).then(l => { QUEDAS = l.filter(q => q?.quadril); });
  function personagem(papel, nome, cor, altura, calca) {`);
A = rep(A, "    for (const clip of base.animations) acoes[clip.name.replace(/\\.\\d+$/, '')] = mixer.clipAction(clip);", `    for (const clip of base.animations) acoes[clip.name.replace(/\\.\\d+$/, '')] = mixer.clipAction(clip);
    m.updateMatrixWorld(true); const peM = m.getObjectByName('Bip01_Pelvis');
    for (const Q of QUEDAS) {                                         // quedas e armas na escala do quadril deste personagem
      const k = peM ? m.worldToLocal(peM.getWorldPosition(new THREE.Vector3())).y / Q.quadril : 1;
      for (const clip of Q.clips) {
        const nm = clip.name.replace(/\\.\\d+$/, ''); if (acoes[nm]) continue;
        const c = clip.clone(); if (Math.abs(k - 1) > .02) for (const t of c.tracks) if (/\\.position$/.test(t.name)) { t.values = t.values.slice(); for (let i = 0; i < t.values.length; i++) t.values[i] *= k; }
        acoes[nm] = mixer.clipAction(c);
      }
    }`);
A = rep(A, "if (!u.acoes[nome]) return;", "if (!u.acoes[nome] || u.pose === 'morrendo') return;       // depois de cair, nada troca a animacao");
A = rep(A, `    u.hit.scale.y = h; u.hit.position.y = h / 2;
  }`, `    u.hit.scale.y = h; u.hit.position.y = h / 2;
    if (u.pose === 'morrendo') {          // caido pela animacao: a area cobre dos pes a cabeca
      const l = n.worldToLocal(AH.clone()); l.y = 0; const r = (l.length() / 2 + .25) / .42;
      u.hit.position.x = l.x / 2; u.hit.position.z = l.z / 2; u.hit.scale.x = u.hit.scale.z = r;
    }
  }`);
// armado: as animacoes do Mixamo da arma que ele segura (pistola ou fuzil) no lugar das genericas
A = rep(A, `    const u = npc?.userData; if (!u?.real) return;
    if (u.algemado`, `    const u = npc?.userData; if (!u?.real) return;
    if (u.arma?.visible && !u.algemado && !u.rendido) nome = armaAnim(u, nome);
    if (u.algemado`);
B = rep(B, `const g = n.userData.arma; if (!g?.visible || g.userData.fuzil) continue;`, `const g = n.userData.arma; if (!g?.visible || g.userData.fuzil) continue;
      if (armaNaMao(n, g, false)) continue;      // animacao de pistola: mira com a arma na mao; nas outras, a arma acompanha a mao`);
// bandido que atira: coice (animacao de disparo do fuzil; na pistola, o cano sobe)
B = rep(B, `somTiro(); if (g.userData.flash) acenderFlash(g.userData.flash); capsula(g);`, `somTiro(); if (g.userData.flash) acenderFlash(g.userData.flash); capsula(g); aoAtirarNPC(n);`);
// abrigado atras da mureta: so leva tiro se o policial enxergar a cabeca dele
B = rep(B, `const pessoas = Object.values(npcs).filter(n => n.visible && !n.userData.caido);`, `const pessoas = Object.values(npcs).filter(n => n.visible && !n.userData.caido && !protegido(n));`);
// carregar as quedas junto com os papeis da missao
A = rep(A, "const carregarPapeis = lista => MANIF.then(man => Promise.all([...new Set(lista)]", "const carregarPapeis = lista => MANIF.then(man => Promise.all([quedasProntas, ...[...new Set(lista)]");
A = rep(A, "glP.loadAsync(HQ(man[p].arquivo)).then(g => { modelos[p] = g; }).catch(() => { }))));", "glP.loadAsync(HQ(man[p].arquivo)).then(g => { modelos[p] = g; }).catch(() => { }))]));");
B = rep(B, "sangue(hn.point, ray.ray.direction); cair(n); sincAmeaca();", "sangue(hn.point, ray.ray.direction); if (!feridoLeve(n)) cair(n, ray.ray.direction.clone()); sincAmeaca();");      // tiro que nao derruba: o atirador cambaleia e volta
B = rep(B, "  function pocaSangue(n) {", "  function pocaSangue(n, s = 1) {          // s = -1: corpo caido de costas (a poca fica atras dos pes)");
B = rep(B, "new THREE.Vector3(n.position.x + Math.sin(n.rotation.y) * 1.0, ALT(n.position.x + Math.sin(n.rotation.y), n.position.z + Math.cos(n.rotation.y), n.position.y) + .004, n.position.z + Math.cos(n.rotation.y) * 1.0)", "new THREE.Vector3(n.position.x + Math.sin(n.rotation.y) * s, ALT(n.position.x + Math.sin(n.rotation.y) * s, n.position.z + Math.cos(n.rotation.y) * s, n.position.y) + .004, n.position.z + Math.cos(n.rotation.y) * s)");
{
  const i0 = B.indexOf('  function cair(n) {'), i1 = B.indexOf('\n  }\n', i0) + 4;
  if (i0 < 0) throw new Error('cair');
  B = B.slice(0, i0) + `  function cair(n, dirTiro = null) {          // dirTiro: direcao do tiro (de frente, a pessoa em pe cai de costas). Igual ao CIEP.
    const u = n.userData; u.caido = true; u.rota = []; u.destino = null; u.semVirar = true; u.aoChegar = null;
    const lado = u.sentado ? 1 : -1; if (u.sentado) { u.sentado = false; n.position.y = ALT(n.position.x, n.position.z, n.position.y + 1); }
    u.ameaca = false; u.atira = false;
    if (u.arma?.visible) { u.arma.visible = false; armaChao(n.position, u.chave); }
    // em pe, tiro de frente: "Dying Backwards" de costas (~1,8 m); senao uma das duas quedas para a frente (~2 m)
    const deFrente = dirTiro && (Math.sin(n.rotation.y) * dirTiro.x + Math.cos(n.rotation.y) * dirTiro.z) < 0;
    let queda = lado < 0 ? ['morrendo_a', 'morrendo_b'].filter(k => u.acoes?.[k]) : (u.acoes?.morrendo_sentado ? ['morrendo_sentado'] : []);
    let tras = lado > 0, dir = null;
    if (lado < 0 && deFrente && u.acoes?.morrendo_tras) { dir = direcaoLivre(n, 1.8, true); if (dir !== null) { queda = ['morrendo_tras']; tras = true; } }
    if (dir === null && queda.length) dir = direcaoLivre(n, lado < 0 ? 2.0 : 1.4, lado > 0);
    if (dir !== null) {
      const r0 = n.rotation.y, dr = Math.atan2(Math.sin(dir - r0), Math.cos(dir - r0));
      suave(tras ? 1.1 : .45, e => { n.rotation.y = r0 + dr * e; }); setTimeout(() => pocaSangue(n, tras ? -1 : 1), 300);
      const acao = u.acoes[queda[Math.floor(Math.random() * queda.length)]];
      clearTimeout(u.volta); acao.reset(); acao.setLoop(THREE.LoopOnce, 1); acao.clampWhenFinished = true; acao.play();
      u.atual?.crossFadeTo(acao, .15, false); u.atual = acao; u.pose = 'morrendo';
      return;
    }
    const giro = direcaoLivre(n, 1.8); if (giro !== null) n.rotation.y = giro;      // sem lado livre: tombo antigo
    pocaSangue(n);
    const y0 = n.position.y, r0 = n.rotation.x;
    suave(.7, e => { n.rotation.x = r0 + (lado * Math.PI / 2 - r0) * e; n.position.y = y0 + .12 * e; });
  }
  const rayQ = new THREE.Raycaster(); rayQ.firstHitOnly = true;
  function direcaoLivre(n, dist, tras = false) {          // giro em que o corpo caido (ombros de 0,6 m) nao entra em parede; tras: queda de costas
    const o = new THREE.Vector3(), d = new THREE.Vector3(), lado = new THREE.Vector3();
    const perto = ctx.malhas().filter(m => m.userData.caixa && m.userData.caixa.distanceToPoint(n.position) < dist + 1);
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4, .5, -.5, 1.5, -1.5, 2.5, -2.5, 3.5, -3.5]) {
      const ry = n.rotation.y + k * Math.PI / 4; d.set(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(tras ? -1 : 1); lado.set(d.z, 0, -d.x);
      const livre = [.25, .7].every(h => [-.3, 0, .3].every(l => {
        o.copy(n.position).addScaledVector(lado, l).setY(n.position.y + h); rayQ.set(o, d); rayQ.far = dist;
        return !rayQ.intersectObjects(perto, false).length;
      }));
      if (livre) return ry;
    }
    return null;
  }
` + B.slice(i1);
}
const missoes = fs.readFileSync(path.join(__dirname, 'missoes.js'), 'utf8');
fs.writeFileSync(SAIDA, cab + A + '\n' + base + '\n' + B + '\n' + missoes);
console.log('motor montado:', (cab + A + base + B + missoes).split('\n').length, 'linhas');
// confere a sintaxe como modulo (pega nome declarado duas vezes, que o --check comum deixa passar)
require('child_process').execSync('node --input-type=module --check', { input: fs.readFileSync(SAIDA), stdio: ['pipe', 'inherit', 'inherit'] });
console.log('sintaxe ok');
