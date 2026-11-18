# Reassa o terreno e as pedras, que sairam pretos no bake original: a UV automatica (smart_project) virou
# ~132 mil pedacinhos do tamanho de um ponto. Aqui:
#  - terreno dividido em 3 x 2 partes, UV projetada de cima (o terreno e um morro: as normais apontam para cima)
#  - pedras e base de contencao: vertices soldados e UV automatica de novo, em textura propria
# Bake igual ao original (Cycles, 128 amostras, COMBINED, cena inteira presente). Retoma de onde parou.
# Depois exporta cada parte como setor GLB unlit (mesmo formato do exportar_setores.py) e atualiza o mapa.json.
# Uso: blender -b --python rebake_terreno.py -- <Favela_Completa_VR> <pasta dos setores> <pasta das texturas>
import bpy, bmesh, os, sys, json, math, struct, time
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
ROOT, OUT, TEX = a[0], a[1], a[2]
os.makedirs(TEX, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=ROOT + '/Blender/Favela_Completa_Fonte_Bake.blend')
s = bpy.context.scene
s.render.engine = 'CYCLES'; s.cycles.samples = 128; s.render.bake.target = 'IMAGE_TEXTURES'; s.render.bake.margin = 16

TERRENO = 'Encosta continua com recortes locais'
NX, NY = 3, 2
alvos = []          # (id, objeto, tamanho)

# ---- terreno em partes, UV de cima ----
ter = bpy.data.objects[TERRENO]
mw = ter.matrix_world
pts = [mw @ v.co for v in ter.data.vertices]
x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
for j in range(NY):
    for i in range(NX):
        ax0, ax1 = x0 + (x1 - x0) * i / NX, x0 + (x1 - x0) * (i + 1) / NX
        ay0, ay1 = y0 + (y1 - y0) * j / NY, y0 + (y1 - y0) * (j + 1) / NY
        me = ter.data.copy(); ob = bpy.data.objects.new(f'Terreno_{i}{j}', me)
        for c in ter.users_collection: c.objects.link(ob)
        ob.matrix_world = mw.copy()
        bm = bmesh.new(); bm.from_mesh(me)
        fora = [f for f in bm.faces if not (ax0 <= (mw @ f.calc_center_median()).x < ax1 + (1e-4 if i == NX - 1 else 0)
                                             and ay0 <= (mw @ f.calc_center_median()).y < ay1 + (1e-4 if j == NY - 1 else 0))]
        bmesh.ops.delete(bm, geom=fora, context='FACES')
        uvl = bm.loops.layers.uv['UV_Bake']
        mx, my = (ax1 - ax0) * .006, (ay1 - ay0) * .006      # sobra nas bordas para a margem do bake
        for f in bm.faces:
            for l in f.loops:
                w = mw @ l.vert.co
                l[uvl].uv = ((w.x - ax0 + mx) / (ax1 - ax0 + 2 * mx), (w.y - ay0 + my) / (ay1 - ay0 + 2 * my))
        bm.to_mesh(me); bm.free()
        if len(me.polygons): alvos.append((f'Setor_Terreno_{i}{j}', ob, 4096))
ter.hide_render = True; ter.hide_set(True)          # as partes substituem o original (sem duplicar sombra)

# ---- pedras e base: soldar e desdobrar de novo ----
for nome, sid, tam in [('Afloramentos rochosos', 'Setor_Pedras', 4096), ('V08 Base macica e contencao', 'Setor_Base_Contencao', 1024)]:
    ob = bpy.data.objects[nome]
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)      # as 73 pedras vinham com a face virada para dentro: o bake saia preto
    ob.data.uv_layers.active = ob.data.uv_layers['UV_Bake']
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.002, area_weight=0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    alvos.append((sid, ob, tam))

# ---- bake ----
for k, (sid, ob, tam) in enumerate(alvos):
    png = TEX + '/' + sid + '.png'
    if os.path.exists(png): print('SKIP', sid, flush=True); continue
    im = bpy.data.images.new('BAKE_' + sid, tam, tam, alpha=False, float_buffer=True); im.colorspace_settings.name = 'Linear Rec.709'
    for m in ob.data.materials:
        nd = m.node_tree.nodes; n = nd.get('FULL_VR_TARGET') or nd.new('ShaderNodeTexImage'); n.name = 'FULL_VR_TARGET'; n.image = im; nd.active = n
    bpy.ops.object.select_all(action='DESELECT'); ob.hide_set(False); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    t = time.time(); print('BAKE_START', k + 1, len(alvos), sid, flush=True)
    bpy.ops.object.bake(type='COMBINED', pass_filter={'DIRECT', 'INDIRECT', 'DIFFUSE', 'EMIT', 'COLOR'}, uv_layer='UV_Bake', use_clear=True, margin=16)
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_depth = '8'; s.render.image_settings.color_mode = 'RGB'
    im.save_render(png + '.tmp.png', scene=s); os.replace(png + '.tmp.png', png)
    bpy.data.images.remove(im)
    print('BAKE_DONE', sid, round(time.time() - t), 's', flush=True)

# ---- exportar como setor (unlit), igual ao exportar_setores.py ----
def unlit(path):
    data = open(path, 'rb').read(); length = struct.unpack_from('<I', data, 12)[0]; doc = json.loads(data[20:20 + length]); tail = data[20 + length:]
    for m in doc.get('materials', []):
        if not m.get('name', '').startswith('BAKED_'): continue
        tex = m.get('emissiveTexture', m.get('pbrMetallicRoughness', {}).get('baseColorTexture'))
        m['pbrMetallicRoughness'] = {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': tex, 'metallicFactor': 0, 'roughnessFactor': 1}
        m.pop('emissiveTexture', None); m.pop('emissiveFactor', None); m['extensions'] = {'KHR_materials_unlit': {}}
    doc['extensionsUsed'] = list(set(doc.get('extensionsUsed', []) + ['KHR_materials_unlit']))
    j = json.dumps(doc, separators=(',', ':')).encode(); j += b' ' * ((-len(j)) % 4)
    open(path, 'wb').write(struct.pack('<IIIII', 0x46546c67, 2, 20 + len(j) + len(tail), len(j), 0x4e4f534a) + j + tail)

mapa = json.load(open(OUT + '/mapa.json'))
ANTIGOS = {'Setor_+000_+001_000', 'Setor_-001_+000_000', 'Setor_+000_-001_001'}
mapa['sectors'] = [x for x in mapa['sectors'] if x['id'] not in ANTIGOS and not x['id'].startswith(('Setor_Terreno', 'Setor_Pedras', 'Setor_Base'))]
for sid, ob, tam in alvos:
    im = bpy.data.images.load(TEX + '/' + sid + '.png')
    mat = bpy.data.materials.new('BAKED_' + sid); mat.use_nodes = True; nd = mat.node_tree.nodes; nd.clear()
    o = nd.new('ShaderNodeOutputMaterial'); e = nd.new('ShaderNodeEmission'); tx = nd.new('ShaderNodeTexImage'); tx.image = im
    mat.node_tree.links.new(tx.outputs['Color'], e.inputs['Color']); mat.node_tree.links.new(e.outputs[0], o.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(mat)
    for p in ob.data.polygons: p.material_index = 0
    for uv in list(ob.data.uv_layers):
        if uv.name != 'UV_Bake': ob.data.uv_layers.remove(uv)
    ob.data.uv_layers.active = ob.data.uv_layers['UV_Bake']; ob.data.uv_layers.active.active_render = True
    bpy.ops.object.select_all(action='DESELECT'); ob.hide_set(False); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    ob.name = 'VR_' + sid
    path = OUT + '/' + sid + '.glb'
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
    unlit(path)
    pw = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    lo = [min(v[k] for v in pw) for k in range(3)]; hi = [max(v[k] for v in pw) for k in range(3)]
    mapa['sectors'].append(dict(id=sid, file=sid + '.glb', bytes=os.path.getsize(path), min=[lo[0], lo[2], -hi[1]], max=[hi[0], hi[2], -lo[1]], sourceObjects=1))
    print('EXPORT_DONE', sid, flush=True)
for sid in ANTIGOS:
    if os.path.exists(OUT + '/' + sid + '.glb'): os.remove(OUT + '/' + sid + '.glb')
json.dump(mapa, open(OUT + '/mapa.json', 'w'), indent=2)
print('REBAKE_COMPLETO', flush=True)
