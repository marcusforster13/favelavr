# teste: assa um objeto em baixa qualidade para ver se sai preto
import bpy, sys
a=sys.argv[sys.argv.index('--')+1:]; nome, saida, tam, amostras = a[0], a[1], int(a[2]), int(a[3])
s=bpy.context.scene; s.render.engine='CYCLES'; s.cycles.samples=amostras; s.cycles.device='GPU'
im=bpy.data.images.new('T',tam,tam,alpha=False,float_buffer=True); im.colorspace_settings.name='Linear Rec.709'
ob=bpy.data.objects[nome]
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob
for m in ob.data.materials:
    n=m.node_tree.nodes.get('FULL_VR_TARGET') or m.node_tree.nodes.new('ShaderNodeTexImage'); n.name='FULL_VR_TARGET'; n.image=im; m.node_tree.nodes.active=n
print('MATS_USERS',[(m.name,m.users) for m in ob.data.materials])
bpy.ops.object.bake(type='COMBINED',pass_filter={'DIRECT','INDIRECT','DIFFUSE','EMIT','COLOR'},uv_layer='UV_Bake',use_clear=True,margin=8)
s.render.image_settings.file_format='PNG'; s.render.image_settings.color_depth='8'; s.render.image_settings.color_mode='RGB'
im.save_render(saida,scene=s); print('REBAKE_OK',saida)
