import bpy
from mathutils import Vector
ob=bpy.data.objects['Encosta continua com recortes locais']
for m in ob.data.materials:
    out=[n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL']
    b=[n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'][0]
    print('MAT',m.name,'outputs',[(o.name,o.is_active_output,o.target,[l.from_node.type for l in o.inputs[0].links]) for o in out],'base',tuple(b.inputs['Base Color'].default_value),[l.from_node.type for l in b.inputs['Base Color'].links],'alpha',b.inputs['Alpha'].default_value)
print('MOD',[x.type for x in ob.modifiers],'scale',ob.scale[:],'polys',len(ob.data.polygons))
import numpy as np
n=np.empty(len(ob.data.polygons)*3);ob.data.polygons.foreach_get('normal',n);n=n.reshape(-1,3)
print('NORMAL_Z media',n[:,2].mean().round(3),'frac z<0',(n[:,2]<0).mean().round(3))
# ray straight down from above at the terrain center: what is hit first?
dg=bpy.context.evaluated_depsgraph_get()
for x,y in [(0,0),(20,30),(-30,10),(50,-20)]:
    r=bpy.context.scene.ray_cast(dg,Vector((x,y,200)),Vector((0,0,-1)))
    print('RAY',x,y,r[0],r[4].name if r[4] else None, tuple(round(v,2) for v in r[1]))
s=bpy.context.scene; print('WORLD',s.world and s.world.name, 'lights',[(o.name,o.data.type,o.data.energy,o.hide_render) for o in bpy.data.objects if o.type=='LIGHT'])
