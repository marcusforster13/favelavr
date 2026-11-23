// Converte todas as texturas de um GLB para JPEG (pedido do autor para as armas). Cor: qualidade 90; relevo e
// metal/rugosidade: qualidade 95 (mapas de dados sofrem mais com a compressao). Tamanho maximo: 1024 px.
// Uso: node texturas_jpeg.mjs entrada.glb saida.glb
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [, , ENT, SAI] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(ENT), root = doc.getRoot();
const cor = new Set(root.listMaterials().map(m => m.getBaseColorTexture()).filter(Boolean));
for (const t of root.listTextures()) {
  const q = cor.has(t) ? 90 : 95;
  const img = await sharp(t.getImage()).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#808080' }).jpeg({ quality: q, chromaSubsampling: cor.has(t) ? '4:2:0' : '4:4:4' }).toBuffer();
  t.setImage(new Uint8Array(img)).setMimeType('image/jpeg');
  if (t.getURI()) t.setURI(t.getURI().replace(/\.\w+$/, '.jpg'));
}
await io.write(SAI, doc);
console.log(SAI.split(/[\\/]/).pop(), root.listTextures().map(t => `${t.getName()} ${t.getMimeType()} ${(t.getImage().byteLength / 1024 | 0)}KB`).join(' | '));
