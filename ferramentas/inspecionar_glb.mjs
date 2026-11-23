// Inspeciona GLBs: caixa envolvente (coordenadas glTF, Y para cima), origem, triangulos, materiais e imagens.
// Uso: node inspecionar_glb.mjs a.glb b.glb ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f), root = doc.getRoot();
  const cena = root.getDefaultScene() || root.listScenes()[0];
  const b = getBounds(cena);
  let tris = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  const r = v => v.map(x => +x.toFixed(3));
  console.log('\n==', f.split(/[\\/]/).pop());
  console.log('caixa min', r(b.min), 'max', r(b.max), 'tamanho', r(b.max.map((x, i) => x - b.min[i])));
  console.log('triangulos', tris, '| nos', root.listNodes().map(n => `${n.getName()} t=${r(n.getTranslation())} r=${r(n.getRotation())} s=${r(n.getScale())}`).join(' ; '));
  console.log('materiais', root.listMaterials().map(m => `${m.getName()} (metal ${m.getMetallicFactor()}, rough ${m.getRoughnessFactor()}, cor ${!!m.getBaseColorTexture()}, normal ${!!m.getNormalTexture()}, mr ${!!m.getMetallicRoughnessTexture()})`).join(' | '));
  console.log('imagens', root.listTextures().map(t => `${t.getName() || t.getURI()} ${t.getMimeType()} ${(t.getImage()?.byteLength / 1024 | 0)}KB ${t.getSize()?.join('x')}`).join(' | '));
}
