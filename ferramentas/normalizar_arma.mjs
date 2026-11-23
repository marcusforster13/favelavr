// Poe uma arma do autor na mesma convencao da pistola do site (modelos/arma.glb):
//   cano para -Z (glTF), eixo do cano em x = 0 e y = 0, origem no plano da empunhadura (z da origem original).
// O eixo do cano e medido pela boca: media dos vertices na ponta da frente. As pecas separadas (tambor, carregador,
// coronha) continuam separadas, dentro de um no "Arma" que recebe o giro de 180 graus e o deslocamento.
// Uso: node normalizar_arma.mjs entrada.glb saida.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const [, , ENT, SAI] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(ENT), root = doc.getRoot(), cena = root.getDefaultScene() || root.listScenes()[0];
const b = getBounds(cena);
// vertices no mundo
const pts = [];
const mul = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
for (const n of root.listNodes()) {
  const me = n.getMesh(); if (!me) continue; const M = n.getWorldMatrix();
  for (const p of me.listPrimitives()) { const a = p.getAttribute('POSITION'), v = [0, 0, 0]; for (let i = 0; i < a.getCount(); i++) pts.push(mul(M, a.getElement(i, v))); }
}
// a boca fica na frente (+Z antes do giro): vertices a ate 6 mm da ponta, perto do topo (exclui a vareta do revolver)
const zMax = b.max[2];
const ponta = pts.filter(p => p[2] > zMax - .006);
const yTopo = Math.max(...ponta.map(p => p[1]));
const boca = ponta.filter(p => p[1] > yTopo - .035);
const cx = boca.reduce((s, p) => s + p[0], 0) / boca.length, cy = (Math.min(...boca.map(p => p[1])) + Math.max(...boca.map(p => p[1]))) / 2;
const pai = doc.createNode('Arma').setRotation([0, 1, 0, 0]).setTranslation([cx, -cy, 0]);       // 180 graus em Y: (x,y,z) -> (-x,y,-z)
for (const n of cena.listChildren()) { cena.removeChild(n); pai.addChild(n); }
cena.addChild(pai);
// metal: a pistola do site usa metalicidade moderada (metal puro fica preto sem reflexo de ambiente)
for (const m of root.listMaterials()) if (m.getMetallicFactor() > .5 && !m.getMetallicRoughnessTexture()) m.setMetallicFactor(.35);
await io.write(SAI, doc);
const b2 = getBounds(cena), r = v => v.map(x => +x.toFixed(3));
console.log(SAI.split(/[\\/]/).pop(), '| boca (antes) x', cx.toFixed(3), 'y', cy.toFixed(3), '| caixa nova', r(b2.min), r(b2.max), '| boca do cano em z =', b2.min[2].toFixed(3));
