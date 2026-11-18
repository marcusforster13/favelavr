# Ceu do site: converte o HDRI (so ceu, Poly Haven CC0) para JPG com a mesma transformacao de cor do bake (AgX,
# exposicao da cena) e calcula quanto girar a cupula para o sol do HDRI ficar na direcao do sol do bake.
# A iluminacao das casas NAO muda: vem do bake. O ceu e so o fundo.
# Uso: blender -b Favela_Completa_Fonte_Bake.blend --python ceu_hdri.py -- <arquivo.hdr> <pasta web>
import bpy, sys, os, json, math
import numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
HDR, WEB = a[0], a[1]
os.makedirs(WEB + '/ceu', exist_ok=True)
s = bpy.context.scene
im = bpy.data.images.load(HDR)
w, h = im.size
px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)   # linha 0 = embaixo
lum = px[..., 0] * .2126 + px[..., 1] * .7152 + px[..., 2] * .0722
y, x = np.unravel_index(np.argmax(lum), lum.shape)
u, v = (x + .5) / w, (y + .5) / h
# equiretangular (convencao do three.js com a esfera vista de dentro): azimute no plano xz, elevacao pela linha
elev_hdri = (v - .5) * math.pi
az_hdri = u * 2 * math.pi                 # angulo do sol ao longo da imagem
# sol do bake: a luz anda em -Z local; o sol fica na direcao oposta
sol = [o for o in bpy.data.objects if o.type == 'LIGHT' and o.data.type == 'SUN'][0]
d = sol.matrix_world.to_3x3() @ Vector((0, 0, 1))          # direcao para o sol (Blender, z para cima)
dx, dy, dz = d.x, d.z, -d.y                                 # site: (x, z, -y)
elev_bake = math.asin(max(-1, min(1, dy)))
print('CEU sol HDRI u,v', round(u, 4), round(v, 4), 'elev', round(math.degrees(elev_hdri), 1),
      '| sol bake elev', round(math.degrees(elev_bake), 1), 'dir', round(dx, 3), round(dy, 3), round(dz, 3))
# JPG com a transformacao de cor do bake
s.render.image_settings.file_format = 'JPEG'; s.render.image_settings.quality = 90; s.render.image_settings.color_mode = 'RGB'
im.save_render(WEB + '/ceu/ceu.jpg', scene=s)
json.dump({'sol_u': u, 'sol_v': v, 'sol_bake': [dx, dy, dz]}, open(WEB + '/ceu/ceu.json', 'w'))
print('CEU_OK', s.view_settings.view_transform, s.view_settings.exposure)
