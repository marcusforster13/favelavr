# Favela · treinamento VR

Sexto treinamento VR da série (DV, Lei Seca, cassino, busca e apreensão, CIEP). Mesma arquitetura de site
(three.js + WebXR no Vercel, sistema de versão), mas o cenário **não é gerado por script**: é a favela modelada
pelo autor no Blender, já com a luz assada (bake Cycles, 128 amostras, um atlas 4096 por setor de 20 m).

## De onde vem cada coisa

| Pasta | Conteúdo |
|---|---|
| `Desktop\favelazip\Favela_Completa_VR` | fonte do autor (fora do Git): `.blend` do bake, `Texturas/` (atlas PNG/EXR), `Exportacoes/` (148 setores) |
| `02_Setores_Sem_Arvores/` | setores reexportados sem as árvores (fora do Git) |
| `ferramentas/blender/arvores_imagem.py` | grava posição/giro/tamanho das 705 árvores e renderiza 4 árvores como imagem |
| `ferramentas/blender/exportar_sem_arvores.py` | cópia do `exportar_setores.py` do bake que deixa as árvores de fora |
| `ferramentas/converter_setores.mjs` | textura 4096 → 2048 KTX2 (ETC1S) e geometria com meshopt; grava `setores.json` |
| `04_ThreeJS/web/` | o site |

## Refazer tudo

```
cd Desktop\favelazip\Favela_Completa_VR\Blender
blender -b Favela_Completa_Fonte_Bake.blend --python ..\..\..\favelavr\ferramentas\blender\arvores_imagem.py -- C:/Users/marcus.leite/Desktop/favelavr/04_ThreeJS/web
blender -b --python ferramentas\blender\exportar_sem_arvores.py -- <Favela_Completa_VR> <favelavr\02_Setores_Sem_Arvores>
cd ferramentas && npm install && node converter_setores.mjs ../02_Setores_Sem_Arvores ../04_ThreeJS/web/setores 2048 etc1s
python carimbar_versao.py
```
(depois de `arvores_imagem.py`, juntar `_arvore_0..3.png` lado a lado em `arvores.png`.)

## Por que assim

- **Árvores viram imagem**: eram 705 árvores com ~4.500 polígonos cada (85% da cena). Agora são 2 planos
  cruzados por árvore. Cena: de 6,1 milhões para 1,7 milhão de triângulos.
- **Textura comprimida (KTX2)**: nos outros projetos eram ~10 mapas de luz; aqui são 96 atlas. Sem compressão
  ocupariam ~2 GB na memória de vídeo e o Quest fecharia a página. KTX2 funciona no Quest e no PC.
- **Carregamento por distância**: os setores perto do ponto de partida entram primeiro; o resto chega com a
  pessoa já andando.
- **Sem tone mapping no site**: o PNG do bake já sai com a transformação de cor do Blender.

## Terreno e pedras reassados

No bake original o terreno ("Encosta contínua"), as pedras ("Afloramentos rochosos") e a base de contenção do bar
saíram pretos: a UV automática do terreno virou ~132 mil pedacinhos do tamanho de um ponto, e as 73 pedras estavam
com as faces viradas para dentro. `ferramentas/blender/rebake_terreno.py` refaz só essas peças (terreno em 3 × 2
partes com UV projetada de cima, pedras com normais corrigidas), com o mesmo bake (Cycles, 128 amostras, cena inteira),
e grava os setores `Setor_Terreno_*`, `Setor_Pedras` e `Setor_Base_Contencao` no lugar dos antigos.
