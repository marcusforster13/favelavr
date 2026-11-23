// Comprime as texturas dos personagens (Rocketbox) para KTX2: o Quest travava ao decodificar ~35 texturas PNG/JPG de
// 1024 px quando os personagens apareciam. Cor: ETC1S 1024 (rostos nitidos). Relevo (normal): 512 px em UASTC.
// Geometria, esqueleto e animacoes ficam intactos.
// Uso: node comprimir_personagens.mjs <pasta originais> <pasta saida>   (so refaz o que mudou)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
const [, , ORIG, SAIDA] = process.argv;
fs.mkdirSync(SAIDA, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const imageDecoder = async buf => { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), width: info.width, height: info.height }; };
for (const f of fs.readdirSync(ORIG).filter(f => f.endsWith('.glb'))) {
  const ori = path.join(ORIG, f), dst = path.join(SAIDA, f);
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs > fs.statSync(ori).mtimeMs) continue;
  const doc = await io.read(ori), root = doc.getRoot();
  // relevo: 512 px
  const normais = new Set(root.listMaterials().map(m => m.getNormalTexture()).filter(Boolean));
  for (const t of normais) { const m = await sharp(t.getImage()).metadata(); if (m.width > 512) t.setImage(new Uint8Array(await sharp(t.getImage()).resize(512, 512).png({ compressionLevel: 1 }).toBuffer())).setMimeType('image/png'); }
  await doc.transform(
    ktx2({ slots: /normalTexture/, isUASTC: true, generateMipmap: true, enableRDO: true, rdoQualityLevel: 2, needSupercompression: true, imageDecoder }),
    ktx2({ slots: /baseColorTexture|emissiveTexture/, isUASTC: false, generateMipmap: true, qualityLevel: 200, compressionLevel: 2, imageDecoder }),
  );
  await io.write(dst, doc);
  console.log(f, (fs.statSync(ori).size / 1e6).toFixed(1), 'MB ->', (fs.statSync(dst).size / 1e6).toFixed(1), 'MB');
}
