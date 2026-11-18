import bpy, collections, bmesh
obs=[o for o in bpy.data.objects if o.name.startswith('R26 Arvore')]
print('ARV',len(obs))
c=collections.Counter()
for o in obs: c[(len(o.data.polygons),tuple(round(d,1) for d in o.dimensions))]+=1
print('VARIANTES',len(c),c.most_common(8))
o=obs[0]
print('MATS',[m.name for m in o.data.materials],'UV',[u.name for u in o.data.uv_layers],'SCALE',o.scale[:],'ROT',o.rotation_euler[:],'LOC',o.location[:],'PARENT',o.parent)
bm=bmesh.new();bm.from_mesh(o.data)
import itertools
# count loose parts
seen=set();parts=0
for v in bm.verts:
  if v in seen: continue
  parts+=1;st=[v]
  while st:
    x=st.pop()
    if x in seen: continue
    seen.add(x);st.extend(e.other_vert(x) for e in x.link_edges)
print('PARTES',parts,'VERTS',len(bm.verts))
for m in o.data.materials:
  print(m.name,[ (n.type,getattr(n,'image',None) and n.image.filepath) for n in m.node_tree.nodes])
