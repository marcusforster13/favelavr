# Copia de Scripts/exportar_setores.py (do bake) que deixa as arvores fora dos setores: no site elas viram imagem (arvores_imagem.py).
# Uso: blender -b --python exportar_sem_arvores.py -- <pasta Favela_Completa_VR> <pasta de saida>
import bpy,os,json,struct
from mathutils import Vector
import sys
ROOT=sys.argv[sys.argv.index('--')+1];OUT=sys.argv[sys.argv.index('--')+2];os.makedirs(OUT,exist_ok=True)
ARV=lambda n:n.startswith('R26 Arvore')
mf=json.load(open(ROOT+'/Blender/manifesto.json'))
if any(not os.path.exists(ROOT+'/Texturas/'+g['id']+'.done.json') for g in mf['groups']):raise RuntimeError('Bake incompleto; exportacao interrompida')
bpy.ops.wm.open_mainfile(filepath=ROOT+'/Blender/Favela_Completa_Fonte_Bake.blend')
def unlit(path):
 data=open(path,'rb').read();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);tail=data[20+length:]
 for m in doc.get('materials',[]):
  if not m.get('name','').startswith('BAKED_'):continue
  tex=m.get('emissiveTexture',m.get('pbrMetallicRoughness',{}).get('baseColorTexture'))
  if not tex:raise RuntimeError('Mapa ausente')
  m['pbrMetallicRoughness']={'baseColorFactor':[1,1,1,1],'baseColorTexture':tex,'metallicFactor':0,'roughnessFactor':1}
  m.pop('emissiveTexture',None);m.pop('emissiveFactor',None);m['extensions']={'KHR_materials_unlit':{}}
 doc['extensionsUsed']=list(set(doc.get('extensionsUsed',[])+['KHR_materials_unlit']))
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 open(path,'wb').write(struct.pack('<IIIII',0x46546c67,2,20+len(j)+len(tail),len(j),0x4e4f534a)+j+tail)
result={'complete':True,'source':mf['source'],'sectors':[],'objectCount':len(mf['coverage'])}
for g in mf['groups']:
 g=dict(g,objects=[n for n in g['objects'] if not ARV(n)])
 if not g['objects']:continue
 bpy.ops.object.select_all(action='DESELECT')
 im=bpy.data.images.load(ROOT+'/Texturas/'+g['id']+'.png',check_existing=True)
 mat=bpy.data.materials.new('BAKED_'+g['id']);mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
 out=nodes.new('ShaderNodeOutputMaterial');emit=nodes.new('ShaderNodeEmission');tex=nodes.new('ShaderNodeTexImage');tex.image=im
 mat.node_tree.links.new(tex.outputs['Color'],emit.inputs['Color']);mat.node_tree.links.new(emit.outputs[0],out.inputs['Surface'])
 points=[]
 for name in g['objects']:
  ob=bpy.data.objects[name];ob.hide_set(False);ob.select_set(True)
  points.extend(ob.matrix_world@Vector(v) for v in ob.bound_box)
  ob.data.materials.clear();ob.data.materials.append(mat)
  for p in ob.data.polygons:p.material_index=0
  for uv in list(ob.data.uv_layers):
   if uv.name!='UV_Bake':ob.data.uv_layers.remove(uv)
  ob.data.uv_layers.active=ob.data.uv_layers['UV_Bake'];ob.data.uv_layers.active.active_render=True
 bpy.context.view_layer.objects.active=bpy.data.objects[g['objects'][0]]
 # All source-coordinate shaders have been replaced; joining now is safe.
 bpy.ops.object.join();ob=bpy.context.object;ob.name='VR_'+g['id']
 path=OUT+'/'+g['id']+'.glb'
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
 unlit(path)
 lo=[min(v[k] for v in points) for k in range(3)];hi=[max(v[k] for v in points) for k in range(3)]
 result['sectors'].append(dict(id=g['id'],file=g['id']+'.glb',bytes=os.path.getsize(path),min=[lo[0],lo[2],-hi[1]],max=[hi[0],hi[2],-lo[1]],sourceObjects=len(g['objects'])))
 print('EXPORT_DONE',g['id'],flush=True)
json.dump(result,open(OUT+'/mapa.json','w'),indent=2)
print('EXPORTACAO_COMPLETA',flush=True)
