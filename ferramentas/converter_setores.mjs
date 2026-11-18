// Converte os setores assados no Blender (Exportacoes/*.glb, textura PNG 4096) para o site:
//  - textura reduzida e comprimida em KTX2 (formato que a placa de video do Quest le direto, sem estourar a memoria)
//  - geometria soldada, quantizada e comprimida com meshopt
// Uso: node converter_setores.mjs <pasta Exportacoes> <pasta de saida> [tamanho=2048] [etc1s|uastc] [filtro]
// So refaz o setor se o .glb de origem for mais novo que o de saida.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, weld, quantize, prune, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { ktx2 } from 'ktx2-encoder/gltf-transform';

const [, , ORIG, SAIDA, TAM = '2048', MODO = 'etc1s', FILTRO = ''] = process.argv;
const tam = +TAM;
fs.mkdirSync(SAIDA, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const imageDecoder = async buf => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

const arquivos = fs.readdirSync(ORIG).filter(f => f.endsWith('.glb') && f.includes(FILTRO)).sort();
let n = 0, total = 0;
const t0 = Date.now();
for (const f of arquivos) {
  const ori = path.join(ORIG, f), dst = path.join(SAIDA, f);
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs > fs.statSync(ori).mtimeMs) { total += fs.statSync(dst).size; n++; continue; }
  const t = Date.now();
  const doc = await io.read(ori);
  // textura: reduz para o tamanho pedido (Lanczos) antes de comprimir
  for (const tex of doc.getRoot().listTextures()) {
    const img = tex.getImage();
    const meta = await sharp(img).metadata();
    if (meta.width > tam) tex.setImage(new Uint8Array(await sharp(img).resize(tam, tam, { kernel: 'lanczos3' }).png({ compressionLevel: 1 }).toBuffer()));
  }
  await doc.transform(
    dedup(), weld(), prune(),
    reorder({ encoder: MeshoptEncoder }),
    quantize({ quantizePosition: 16, quantizeTexcoord: 14, quantizeNormal: 8 }),
    ktx2(MODO === 'uastc'
      ? { isUASTC: true, generateMipmap: true, enableRDO: true, rdoQualityLevel: 1, needSupercompression: true, imageDecoder }
      : { isUASTC: false, generateMipmap: true, qualityLevel: 230, compressionLevel: 2, imageDecoder }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(dst, doc);
  const s = fs.statSync(dst).size; total += s; n++;
  console.log(`${n}/${arquivos.length} ${f}  ${(fs.statSync(ori).size / 1e6).toFixed(1)} MB -> ${(s / 1e6).toFixed(2)} MB  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
}
// indice para o site: caixa de cada setor (coordenadas do site, y para cima) e tamanho do arquivo (barra de progresso)
const mapa = path.join(ORIG, 'mapa.json');
if (fs.existsSync(mapa) && !FILTRO) {
  const m = JSON.parse(fs.readFileSync(mapa, 'utf8'));
  const r = n => Math.round(n * 100) / 100;
  const setores = m.sectors.filter(s => fs.existsSync(path.join(SAIDA, s.file))).map(s => ({
    id: s.id, min: s.min.map(r), max: s.max.map(r), bytes: fs.statSync(path.join(SAIDA, s.file)).size }));
  fs.writeFileSync(path.join(SAIDA, 'setores.json'), JSON.stringify({ setores }));
}
console.log(`PRONTO${n} setores, ${(total / 1e6).toFixed(0)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
