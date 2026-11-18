# Separa do bake as pecas que o jogador pega, apreende ou abre (pacotes, balanca, maleta, portas...).
# Cada peca vira um .glb proprio em web/interativos/, com a MESMA luz do bake: o pedaco do atlas que ela usa e
# recortado e a UV e refeita para o recorte. Os setores onde elas estavam sao reexportados sem elas.
# Uso: blender -b --python separar_interativos.py -- <Favela_Completa_VR> <pasta setores (02_)> <pasta web>
import bpy, os, sys, json, struct, math
import numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
ROOT, SETORES, WEB = a[0], a[1], a[2]
SAIDA = WEB + '/interativos'; os.makedirs(SAIDA, exist_ok=True); os.makedirs(SAIDA + '/_tex', exist_ok=True)

# chave -> objetos do modelo do autor
ITENS = {
    # deposito (terreo da Casa 67)
    'dep_pacotes':  ['R32 Pacote ficticio %d' % i for i in range(1, 6)],
    'dep_balanca':  ['R32 Balanca bancada'],
    'dep_bolsa':    ['R33 Bolsa lona aberta com dobras', 'R33 Bolsa costuras ziper e alcas', 'R33 Tecido no fundo bolsa'],
    'dep_caderno':  ['R32 Caderno e caneta', 'R33 Anotacoes ficticias caderno'],
    'dep_celular':  ['R32 Celular mesa'],
    'dep_radio':    ['R32 Radio mesa'],
    'dep_recibos':  ['R33 Recibo ficticio 1', 'R33 Recibo ficticio 2', 'R33 Recibo ficticio 3', 'R32 Papel cenografico 0', 'R32 Papel cenografico 1'],
    'dep_porta_1':  ['R32 Porta aberta folha 1'],
    'dep_porta_2':  ['R32 Porta aberta folha 2'],
    # bar da praca
    'bar_pacotes':  ['R31 Fita pacote %d' % i for i in range(1, 7)],
    'bar_dinheiro': ['R31 Maco papel cenografico %d' % i for i in range(1, 4)],
    'bar_radios':   ['R31 Radio portatil 1', 'R31 Radio portatil 2'],
    'bar_celulares': ['R31 Celular 1', 'R31 Celular 2'],
    # oficina
    'ofi_maleta':   ['R36 Maleta base', 'R36 Celular maleta A', 'R36 Celular maleta B'],
    'ofi_tampa':    ['R36 Maleta tampa'],
    'ofi_documentos': ['R35 Documentos ficticios oficina'],
    'ofi_portao':   ['R36 Folha movel portao'],
    # residencia
    'res_porta_servico': ['R43 Porta servico folha aberta'],
    'res_porta_casal':   ['R43 Folha Quarto casal'],
    'res_porta_solteiro': ['R43 Folha Quarto solteiro'],
}
# pecas que estao dentro de um objeto maior: separa as partes soltas cujo centro cai na caixa (coordenadas do site:
# x, y altura, z) e junta ao item. Ex.: as caixas de pacote e o corpo da balanca fazem parte de "V14 Objetos de cena no balcao"
PARTES = {
    'bar_pacotes': ('V14 Objetos de cena no balcao', (12.40, 10.55, 13.68), (13.02, 10.85, 14.02)),
    'bar_balanca': ('V14 Objetos de cena no balcao', (13.92, 10.55, 13.98), (14.34, 10.80, 14.34)),
}
ITENS['bar_balanca'] = ['R31 Balança botoes e pes']

mf = json.load(open(ROOT + '/Blender/manifesto.json'))
grupo = {o: g['id'] for g in mf['groups'] for o in g['objects']}
bpy.ops.wm.open_mainfile(filepath=ROOT + '/Blender/Favela_Completa_Fonte_Bake.blend')

import bmesh
for chave, (fonte, lo, hi) in PARTES.items():
    ob = bpy.data.objects[fonte]
    bpy.ops.object.select_all(action='DESELECT'); ob.hide_set(False); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(ob.data); bm.faces.ensure_lookup_table()
    for f in bm.faces: f.select = False
    vistos, n = set(), 0
    for f0 in bm.faces:
        if f0.index in vistos: continue
        ilha, pilha = [], [f0]
        while pilha:
            f = pilha.pop()
            if f.index in vistos: continue
            vistos.add(f.index); ilha.append(f)
            pilha.extend(g for e in f.edges for g in e.link_faces if g.index not in vistos)
        c = ob.matrix_world @ (sum((f.calc_center_median() for f in ilha), Vector()) / len(ilha))
        s = (c.x, c.z, -c.y)
        if all(lo[i] <= s[i] <= hi[i] for i in range(3)):
            for f in ilha: f.select = True
            n += 1
    bmesh.update_edit_mesh(ob.data)
    antes = set(bpy.data.objects.keys())
    if n: bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    novos = [k for k in bpy.data.objects.keys() if k not in antes]
    if not novos: raise RuntimeError('Nenhuma parte separada para ' + chave)
    nv = bpy.data.objects[novos[0]]; nv.name = 'PARTE ' + chave
    grupo[nv.name] = grupo[fonte]; ITENS.setdefault(chave, []).append(nv.name)
    print('PARTES', chave, n, 'ilhas', flush=True)
SEP = {o for v in ITENS.values() for o in v}
falta = [o for o in SEP if o not in bpy.data.objects]
if falta: raise RuntimeError('Objetos nao encontrados: %s' % falta)

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

def mat_baked(nome, imagem):
    mat = bpy.data.materials.new('BAKED_' + nome); mat.use_nodes = True; nd = mat.node_tree.nodes; nd.clear()
    o = nd.new('ShaderNodeOutputMaterial'); e = nd.new('ShaderNodeEmission'); t = nd.new('ShaderNodeTexImage'); t.image = imagem
    mat.node_tree.links.new(t.outputs['Color'], e.inputs['Color']); mat.node_tree.links.new(e.outputs[0], o.inputs['Surface'])
    return mat

def so_uv_bake(ob):
    for uv in list(ob.data.uv_layers):
        if uv.name != 'UV_Bake': ob.data.uv_layers.remove(uv)
    ob.data.uv_layers.active = ob.data.uv_layers['UV_Bake']; ob.data.uv_layers.active.active_render = True

def exportar(path, obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_animations=False, export_cameras=False, export_lights=False)
    unlit(path)

# ---- 1) pecas separadas: UV compacta propria e a cor/luz do atlas copiada para uma textura pequena ----
# (bake EMIT de um material que le o atlas pela UV_Bake e grava na UV nova: so transfere, nao recalcula luz)
s = bpy.context.scene; s.render.engine = 'CYCLES'; s.cycles.samples = 1; s.render.bake.margin = 4
imgs_atlas = {}
def atlas_de(gid):
    if gid not in imgs_atlas: imgs_atlas[gid] = bpy.data.images.load(ROOT + '/Texturas/' + gid + '.png', check_existing=True)
    return imgs_atlas[gid]
info = {}
for chave, nomes in ITENS.items():
    copias = []
    for nome in nomes:
        ob = bpy.data.objects[nome]
        c = ob.copy(); c.data = ob.data.copy(); c.name = 'INT_' + chave + '__' + nome
        for col in ob.users_collection: col.objects.link(c)
        copias.append(c)
    # junta as copias do item (uma textura por item) e desdobra uma UV compacta
    bpy.ops.object.select_all(action='DESELECT')
    for c in copias: c.hide_set(False); c.select_set(True)
    bpy.context.view_layer.objects.active = copias[0]
    for c in copias:      # material de leitura: atlas do grupo de cada objeto, lido pela UV_Bake
        src = atlas_de(grupo[c.name.split('__', 1)[1]])
        m = bpy.data.materials.new('LER_' + c.name); m.use_nodes = True; nd = m.node_tree.nodes; nd.clear()
        o = nd.new('ShaderNodeOutputMaterial'); e = nd.new('ShaderNodeEmission'); t = nd.new('ShaderNodeTexImage'); t.image = src
        uvn = nd.new('ShaderNodeUVMap'); uvn.uv_map = 'UV_Bake'
        m.node_tree.links.new(uvn.outputs['UV'], t.inputs['Vector']); m.node_tree.links.new(t.outputs['Color'], e.inputs['Color'])
        m.node_tree.links.new(e.outputs[0], o.inputs['Surface'])
        c.data.materials.clear(); c.data.materials.append(m)
        for p in c.data.polygons: p.material_index = 0
        for uv in list(c.data.uv_layers):
            if uv.name != 'UV_Bake': c.data.uv_layers.remove(uv)
    if len(copias) > 1: bpy.ops.object.join()
    ob = bpy.context.object; ob.name = 'INT_' + chave
    ar = sum(p.area for p in ob.data.polygons) * max(ob.scale) ** 2
    tam = int(min(512, max(64, 2 ** round(math.log2(max(1e-6, math.sqrt(ar)) * 700)))))      # ~7 px por cm
    novo = ob.data.uv_layers.new(name='UV_Item'); ob.data.uv_layers.active = novo
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.02, area_weight=0, correct_aspect=True, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    im = bpy.data.images.new('INT_' + chave, tam, tam, alpha=False)
    for m in ob.data.materials:
        nd = m.node_tree.nodes; n = nd.new('ShaderNodeTexImage'); n.image = im; nd.active = n
    bpy.ops.object.bake(type='EMIT', uv_layer='UV_Item', use_clear=True, margin=4)
    im.filepath_raw = SAIDA + '/_tex/' + chave + '.png'; im.file_format = 'PNG'; im.save()
    ob.data.uv_layers.remove(ob.data.uv_layers['UV_Bake']); ob.data.uv_layers['UV_Item'].name = 'UV_Bake'
    so_uv_bake(ob)
    ob.data.materials.clear(); ob.data.materials.append(mat_baked(ob.name, im))
    for p in ob.data.polygons: p.material_index = 0
    copias = [ob]
    print('TEXTURA', chave, tam, flush=True)
    pts = [c.matrix_world @ Vector(v) for c in copias for v in c.bound_box]
    lo = [min(p[k] for p in pts) for k in range(3)]; hi = [max(p[k] for p in pts) for k in range(3)]
    exportar(SAIDA + '/' + chave + '.glb', copias)
    info[chave] = dict(objetos=nomes, min=[round(lo[0], 3), round(lo[2], 3), round(-hi[1], 3)], max=[round(hi[0], 3), round(hi[2], 3), round(-lo[1], 3)])
    for c in copias: bpy.data.objects.remove(c, do_unlink=True)
    print('ITEM', chave, flush=True)
json.dump(info, open(SAIDA + '/interativos.json', 'w'), indent=1)

# ---- 2) setores afetados, reexportados sem as pecas (mesmo processo do exportar_sem_arvores.py) ----
afetados = sorted({grupo[o] for o in SEP})
mapa = json.load(open(SETORES + '/mapa.json'))
for g in mf['groups']:
    if g['id'] not in afetados: continue
    nomes = [n for n in g['objects'] if not n.startswith('R26 Arvore') and n not in SEP]
    im = bpy.data.images.load(ROOT + '/Texturas/' + g['id'] + '.png', check_existing=True)
    mat = mat_baked(g['id'], im)
    bpy.ops.object.select_all(action='DESELECT')
    for n in nomes:
        ob = bpy.data.objects[n]; ob.hide_set(False); ob.select_set(True)
        ob.data.materials.clear(); ob.data.materials.append(mat)
        for p in ob.data.polygons: p.material_index = 0
        so_uv_bake(ob)
    bpy.context.view_layer.objects.active = bpy.data.objects[nomes[0]]
    bpy.ops.object.join(); ob = bpy.context.object; ob.name = 'VR_' + g['id']
    path = SETORES + '/' + g['id'] + '.glb'
    exportar(path, [ob])
    for s in mapa['sectors']:
        if s['id'] == g['id']: s['bytes'] = os.path.getsize(path)
    print('SETOR', g['id'], flush=True)
json.dump(mapa, open(SETORES + '/mapa.json', 'w'), indent=2)
print('INTERATIVOS_OK', len(ITENS), 'itens,', len(afetados), 'setores', flush=True)
