import bpy, numpy as np
for n in ['Encosta continua com recortes locais','Afloramentos rochosos','V08 Base macica e contencao','Casa 30']:
    o=bpy.data.objects[n]; me=o.data
    uv=me.uv_layers['UV_Bake']; a=np.empty(len(me.loops)*2); uv.data.foreach_get('uv',a); a=a.reshape(-1,2)
    print('UVINFO',n,'loops',len(me.loops),'min',a.min(0).round(3),'max',a.max(0).round(3),'mats',[ (m.name, [x.type for x in m.node_tree.nodes][:8]) for m in me.materials][:3], 'hide_render',o.hide_render, 'vis', o.visible_get())
