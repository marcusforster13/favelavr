# Confere animacoes do Mixamo: malha junto (With/Without Skin), quadros, fps, esqueleto e se o quadril anda (In Place).
# Uso: blender -b --python inspecionar_mixamo.py -- arquivo1.fbx arquivo2.fbx ...
import bpy, sys, os
arqs = sys.argv[sys.argv.index('--') + 1:]
for f in arqs:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f)
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    malhas = [o for o in bpy.data.objects if o.type == 'MESH']
    if not arm or not arm[0].animation_data or not arm[0].animation_data.action:
        print('MX', os.path.basename(f), '| SEM ANIMACAO'); continue
    a = arm[0]; act = a.animation_data.action
    f0, f1 = act.frame_range
    ossos = [b.name for b in a.data.bones]
    quadril = next((b for b in ossos if b.endswith('Hips')), None)
    sc = bpy.context.scene; sc.frame_set(int(f0))
    pb = a.pose.bones[quadril]
    def pos(fr): sc.frame_set(int(fr)); return (a.matrix_world @ pb.head).copy()
    p0, p1 = pos(f0), pos(f1)
    ys = [pos(fr).z for fr in range(int(f0), int(f1) + 1, 2)]
    escala = a.scale[0] * (1 if max(a.dimensions) < 10 else .01)
    print('MX', os.path.basename(f), '| malha:', len(malhas), '| quadros', int(f0), '-', int(f1), '| fps', sc.render.fps,
          '| ossos', len(ossos), quadril, '| quadril anda (m):', round(((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2) ** .5 * (escala if escala < 1 else 1), 2),
          '| altura do quadril min/max:', round(min(ys), 2), round(max(ys), 2))
