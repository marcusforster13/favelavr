// Favela - gera as vozes dos personagens no ElevenLabs (mesmo esquema do Cassino e do CIEP), em portugues do Brasil.
//
//   node 06_Audio/gerar_vozes_elevenlabs.js --listar   (so lista as falas e quantos caracteres vao ser gastos)
//   node 06_Audio/gerar_vozes_elevenlabs.js            (gera so o que falta)
//
// Chave: 06_Audio/chave_elevenlabs.txt (fora do GitHub), ou a do Busca e Apreensao, ou ELEVENLABS_API_KEY.
// As falas saem do cenario (05_Treinamento/cenario_favela_01.json) e de algumas frases fixas do motor (missoes.js).
// O site acha o audio pelo TEXTO exato da fala (catalogo vozes.falas gravado no cenario).
const fs = require('fs'), path = require('path');
const AQUI = __dirname, RAIZ = path.join(AQUI, '..');
const BRUTOS = path.join(AQUI, 'brutos'), WEB_AUDIO = path.join(RAIZ, '04_ThreeJS', 'web', 'audio');
const CENARIOS = [path.join(RAIZ, '05_Treinamento', 'cenario_favela_01.json'), path.join(RAIZ, '04_ThreeJS', 'web', 'treinamento', 'cenario_favela_01.json')];
const API = 'https://api.elevenlabs.io/v1', MODELO = 'eleven_multilingual_v2';

// todas vozes brasileiras da conta. Radio, parceiro e apoio: as mesmas da serie (a equipe e a mesma).
// Personagens de missoes diferentes nunca aparecem juntos, entao podem repetir voz entre missoes.
const VOZ = {
  radio: 'FhdOWgf0bSw3HKWefhlq', parceiro: 'czvzJwIVS2asEKnthV40', apoio: 'blPx0tvsvee8CuFd63lX',
  olheiro: 'lvkgCBi6spByiTZMPJEK', crianca: 'lvkgCBi6spByiTZMPJEK', moradora: '7eUAxNOneHxqfyRS77mW',
  vigia: 'hwnuNyWkl9DjdTFykrN6', vendedor: 'hwnuNyWkl9DjdTFykrN6', dono_oficina: 'Qrdut83w0Cr152Yb4Xn3',
  dono_bar: 'bJrNspxJVFovUxNBQ0wh', frequentador_a: 'qPfM2laM0pRL4rrZtBGl', frequentador_b: 'cyD08lEy76q03ER1jZ7y',
  morador: 'Qrdut83w0Cr152Yb4Xn3', mulher: 'cyD08lEy76q03ER1jZ7y'
};
const ESTILO = {
  radio: { stability: .7, similarity_boost: .8, style: .05 }, parceiro: { stability: .6, similarity_boost: .8, style: .1 }, apoio: { stability: .6, similarity_boost: .8, style: .1 },
  olheiro: { stability: .3, similarity_boost: .8, style: .55 }, crianca: { stability: .4, similarity_boost: .8, style: .4 }, moradora: { stability: .5, similarity_boost: .8, style: .25 },
  vigia: { stability: .3, similarity_boost: .8, style: .55 }, vendedor: { stability: .3, similarity_boost: .8, style: .55 }, dono_oficina: { stability: .45, similarity_boost: .8, style: .3 },
  dono_bar: { stability: .55, similarity_boost: .75, style: .15 }, frequentador_a: { stability: .5, similarity_boost: .8, style: .2 }, frequentador_b: { stability: .5, similarity_boost: .8, style: .2 },
  morador: { stability: .4, similarity_boost: .8, style: .4 }, mulher: { stability: .35, similarity_boost: .8, style: .45 }
};
const NOME = { radio: 'Sala de operações (rádio)', parceiro: 'Policial parceiro', apoio: 'Policial de apoio', olheiro: 'Rapaz na laje', crianca: 'Criança', moradora: 'Moradora',
  vigia: 'Homem no depósito', vendedor: 'Homem no balcão', dono_oficina: 'Dono da oficina', dono_bar: 'Dono do bar', frequentador_a: 'Frequentador', frequentador_b: 'Frequentadora',
  morador: 'Morador', mulher: 'Mulher do morador' };

function falasDoCenario() {
  const c = JSON.parse(fs.readFileSync(CENARIOS[0], 'utf8')), F = c.falas, lista = [];
  const add = (quem, t, quando) => { if (typeof t === 'string' && t && !t.startsWith('(')) lista.push({ quem, texto: t, quando }); };      // "(sai correndo)" e so legenda
  // radio: a abertura leva a denuncia de cada missao
  for (const [k, t] of Object.entries(c.radio)) {
    if (k === 'inicio') for (const [m, d] of Object.entries(c.denuncias)) add('radio', t.replace('{denuncia}', d), 'Rádio: denúncia ' + m);
    else add('radio', t, 'Rádio: ' + k);
  }
  add('radio', 'Ciente. Atenção redobrada: a chegada de vocês foi avisada.', 'Rádio: olheiro');      // frases fixas do motor
  add('radio', 'Ciente. Viaturas do entorno avisadas. Não persigam sozinhos.', 'Rádio: fuga');
  // personagens: a chave da fala comeca pelo papel (vigia_rende, morador_recusa, frequentador_usuario...)
  const papel = k => k === 'parceiro_resposta' ? 'parceiro' : k.startsWith('frequentador') ? 'frequentador_a' : k.startsWith('dono_oficina') ? 'dono_oficina' : k.startsWith('dono_bar') ? 'dono_bar' : k.split('_')[0];
  for (const [k, t] of Object.entries(F)) { const q = papel(k); if (VOZ[q]) add(q, t, k); }
  add('vigia', 'Tá bom, tá bom, perdi!', 'Rende após a ordem de parar');
  add('morador', 'O armário é no quarto do casal.', 'Residência');
  return lista;
}
function montarFalas() {
  const cont = {}, visto = new Set(), saida = [];
  for (const f of falasDoCenario()) {
    if (visto.has(f.texto)) continue; visto.add(f.texto);
    cont[f.quem] = (cont[f.quem] || 0) + 1;
    saida.push({ ...f, arquivo: `fala_${f.quem}_${String(cont[f.quem]).padStart(2, '0')}`, personagem: NOME[f.quem] });
  }
  return saida;
}
function chave() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  for (const f of [path.join(AQUI, 'chave_elevenlabs.txt'), 'C:/Users/marcus.leite/Desktop/buscaeapreensao/06_Audio/chave_elevenlabs.txt'])
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  console.error('Falta a chave: crie 06_Audio/chave_elevenlabs.txt.'); process.exit(1);
}
(async () => {
  const falas = montarFalas();
  const faltam = falas.filter(f => !fs.existsSync(path.join(BRUTOS, f.arquivo + '.mp3')));
  const chars = faltam.reduce((a, f) => a + f.texto.length, 0);
  if (process.argv.includes('--listar')) {
    for (const f of falas) console.log(`${f.arquivo.padEnd(24)} ${f.texto}`);
    console.log(`\n${falas.length} falas; faltam ${faltam.length}, que gastam ${chars} caracteres.`); return;
  }
  const KEY = chave(); fs.mkdirSync(BRUTOS, { recursive: true }); fs.mkdirSync(WEB_AUDIO, { recursive: true });
  console.log(`${falas.length} falas; faltam ${faltam.length} (${chars} caracteres).`);
  let feitas = 0, erro = null;
  for (const f of falas) {
    const destino = path.join(BRUTOS, f.arquivo + '.mp3');
    if (!fs.existsSync(destino) && !erro) {
      try {
        const r = await fetch(`${API}/text-to-speech/${VOZ[f.quem]}?output_format=mp3_44100_128`, { method: 'POST',
          headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: f.texto, model_id: MODELO, language_code: 'pt', voice_settings: { ...ESTILO[f.quem], use_speaker_boost: true } }) });
        if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
        fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer())); feitas++; console.log(`  ${f.arquivo}: ${f.texto.slice(0, 60)}`);
      } catch (e) { erro = e; }                              // (cota acabou etc.): para de gerar, mas cataloga o que ja existe
    }
    if (fs.existsSync(destino)) fs.copyFileSync(destino, path.join(WEB_AUDIO, f.arquivo + '.mp3'));
  }
  const gravadas = falas.filter(f => fs.existsSync(path.join(BRUTOS, f.arquivo + '.mp3')));      // so as gravadas entram no catalogo
  const man = path.join(WEB_AUDIO, 'manifest.json');
  const lista = new Set(fs.existsSync(man) ? JSON.parse(fs.readFileSync(man, 'utf8')) : []);
  for (const f of gravadas) lista.add(f.arquivo + '.mp3');
  fs.writeFileSync(man, JSON.stringify([...lista].sort()));
  for (const c of CENARIOS) {
    const cen = JSON.parse(fs.readFileSync(CENARIOS[0], 'utf8'));
    cen.vozes = { _nota: 'Gerado por 06_Audio/gerar_vozes_elevenlabs.js. O site acha o áudio pelo texto exato da fala.', falas: gravadas.map(f => ({ arquivo: f.arquivo, personagem: f.personagem, quando: f.quando || '', texto: f.texto })) };
    fs.writeFileSync(c, JSON.stringify(cen, null, 2) + '\n');
  }
  console.log(`Pronto: ${feitas} audios novos; ${gravadas.length} falas gravadas no catalogo.` + (erro ? `\nParou antes do fim: ${erro.message.slice(0, 200)}` : ''));
})().catch(e => { console.error('Erro:', e.message); process.exit(1); });
