"""
Favela - animacoes de arma dos bandidos (Mixamo) no esqueleto Rocketbox, num arquivo so: 04_ThreeJS/web/personagens/armas_anim.glb
(so esqueleto + animacoes, como o quedas.glb). O site copia as animacoes para cada personagem, na escala do quadril dele.

Usa o conversor do CIEP (novovr/07_Personagens/converter_personagens.py), que ja redireciona Mixamo -> Rocketbox osso a osso,
trocando so: o personagem (um adulto), a pasta dos FBX do Mixamo, a saida e o que e exportado (sem malha).

Uso:  blender -b --factory-startup --python 07_Personagens/converter_animacoes_armas.py
"""
import os
AQUI = os.path.dirname(os.path.abspath(__file__))
CIEP = r"C:\Users\marcus.leite\Desktop\novovr\07_Personagens"
WEB = os.path.normpath(os.path.join(AQUI, "..", "04_ThreeJS", "web", "personagens"))

# nome no site -> arquivo em 07_Personagens/mixamo (todas "no lugar": o site move o personagem)
ANIMS = {
    "fuzil_mirando": "mx:mx_fuzil_mirando", "fuzil_atirando": "mx:mx_fuzil_atirando", "fuzil_andando": "mx:mx_fuzil_andar_parar",
    "fuzil_ajoelhado": "mx:mx_fuzil_ajoelhado_mirar",
    "pistola_parado": "mx:mx_pistola_parado", "pistola_andando": "mx:mx_pistola_andando", "pistola_correndo": "mx:mx_pistola_correndo",
    "pistola_ajoelhado": "mx:mx_pistola_ajoelhado",
    "agachar": "mx:mx_agachar", "atingido_em_pe": "mx:mx_atingido_em_pe", "atingido_agachado": "mx:mx_atingido_agachado", "atingido_andando": "mx:mx_atingido_andando",
}

src = open(os.path.join(CIEP, "converter_personagens.py"), encoding="utf-8").read()
def troca(a, b):
    global src
    if a not in src: raise SystemExit("conversor do CIEP mudou: nao achei " + a[:60])
    src = src.replace(a, b, 1)
troca('AQUI = os.path.dirname(os.path.abspath(__file__))', 'AQUI = %r' % CIEP)
troca('WEB = os.path.normpath(os.path.join(AQUI, "..", "04_ThreeJS", "web", "personagens"))', 'WEB = %r' % WEB)
troca('FORCAR = "--forcar" in sys.argv', 'FORCAR = True')
troca('REF_TPOSE = "Female_Adult_08"', 'PAPEIS = {"armas_anim": ("Male_Adult_01", %r)}\nREF_TPOSE = "Female_Adult_08"' % ANIMS)
troca('MX = os.path.join(AQUI, "mixamo")', 'MX = %r' % os.path.join(AQUI, "mixamo"))
troca('o.select_set(o == arm or o.parent == arm or o in malhas)', 'o.select_set(o == arm)')          # so esqueleto e animacoes
troca('    tris = sum(len(o.data.polygons) for o in malhas)', '    tris = 0')
troca('with open(os.path.join(WEB, "manifest.json"), "w", encoding="utf-8") as f:', 'with open(os.path.join(TMP, "manifest_armas.json"), "w", encoding="utf-8") as f:')      # nao mexe no manifest do site
exec(compile(src, os.path.join(CIEP, "converter_personagens.py"), "exec"), {"__name__": "__main__", "__file__": os.path.join(CIEP, "converter_personagens.py")})
