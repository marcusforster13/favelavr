# Arvores viram imagem: grava a posicao/giro/tamanho de cada arvore (arvores.json) e renderiza 4 arvores
# de fundo transparente (arvores.png, 4 quadros lado a lado) para o site montar planos cruzados.
# Uso: blender -b Favela_Completa_Fonte_Bake.blend --python arvores_imagem.py -- <pasta web>
import bpy, sys, os, json, math
from mathutils import Vector
WEB = sys.argv[sys.argv.index('--') + 1]
os.makedirs(WEB + '/arvores', exist_ok=True)
arv = sorted([o for o in bpy.data.objects if o.name.startswith('R26 Arvore')], key=lambda o: o.name)

def caixa(o):
    pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi

# 4 modelos: as arvores de tamanho tipico, espalhadas na lista
N = 4
mod = [arv[int(len(arv) * (i + .5) / N)] for i in range(N)]
lista = []
for i, o in enumerate(arv):
    lo, hi = caixa(o)
    c = (lo + hi) / 2
    # Blender (z para cima) -> site (y para cima): (x, z, -y)
    lista.append([round(c.x, 2), round(lo.z, 2), round(-c.y, 2), round(o.rotation_euler.z, 3),
                  round(max(hi.x - lo.x, hi.y - lo.y), 2), round(hi.z - lo.z, 2), i % N])
json.dump({'modelos': N, 'arvores': lista}, open(WEB + '/arvores/arvores.json', 'w'), separators=(',', ':'))
print('ARVORES', len(lista))

s = bpy.context.scene
s.render.engine = 'CYCLES'; s.cycles.samples = 64; s.cycles.use_denoising = True
s.render.film_transparent = True
s.render.resolution_x = 512; s.render.resolution_y = 512; s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
for o in bpy.data.objects:
    if o.type in ('MESH', 'CURVE', 'SURFACE', 'META', 'FONT'): o.hide_render = True
cam = bpy.data.objects.new('CamArvore', bpy.data.cameras.new('CamArvore')); s.collection.objects.link(cam)
cam.data.type = 'ORTHO'; s.camera = cam
for i, o in enumerate(mod):
    o.hide_render = False
    lo, hi = caixa(o); c = (lo + hi) / 2
    tam = max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) * 1.04
    cam.data.ortho_scale = tam
    # camera de lado (olhando para +y), na altura do centro; a arvore fica centrada e com a base embaixo
    cam.location = (c.x, c.y - 40, lo.z + tam / 2 - tam * .02); cam.rotation_euler = (math.pi / 2, 0, 0)
    cam.data.clip_end = 100
    s.render.filepath = WEB + f'/arvores/_arvore_{i}.png'
    bpy.ops.render.render(write_still=True)
    o.hide_render = True
    print('RENDER', i, o.name, round(tam, 2))
# por modelo: lado do quadro renderizado e altura da arvore (o site escala cada copia pela altura dela)
json.dump({'quadros': [[round(max(*(caixa(o)[1] - caixa(o)[0])) * 1.04, 3), round((caixa(o)[1] - caixa(o)[0]).z, 3)] for o in mod]},
          open(WEB + '/arvores/_quadros.json', 'w'))
print('ARVORES_OK')
