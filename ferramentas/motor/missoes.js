
  /* ================= FAVELA: locais, pecas interativas e personagens ================= */
  const ALT = (x, z, y) => ctx.alturaChao(x, z, y) ?? y;
  const PT = (x, y, z) => new THREE.Vector3(x, ALT(x, z, y), z);          // y = altura aproximada do piso
  const olharPara = (dx, dz) => Math.atan2(dx, dz);                       // giro para o personagem (frente +Z) olhar para (dx, dz)
  const PARTIDA = [0, 40], OLHAR_PARTIDA = -Math.PI / 3;
  // destino de cada missao (x, y do piso, z) e raio de chegada
  const LOC = {
    deposito:   { alvo: [55.4, 18.0, -7.4], nome: 'Depósito (térreo da Casa 67, Escadaria 5)', raio: 6 },
    residencia: { alvo: [37.0, 19.0, -6.4], nome: 'Residência (acesso pela escadaria)', raio: 6 },
    bar:        { alvo: [10.0, 9.5, 16.0], nome: 'Bar da praça', raio: 8 },
    oficina:    { alvo: [-31.8, -.8, 36.6], nome: 'Oficina (Caminho inferior, Casa 28)', raio: 7 },
    sniper:     { alvo: [-35, 17.2, 7], nome: 'Laje de observação (cobertura da praça)', raio: 4 },
    carga:      { alvo: [55.4, 18.0, -7.4], nome: 'Depósito da carga (Casa 67, Escadaria 5)', raio: 6 }
  };
  // rotas de fuga (correndo, seguindo o chao)
  const FUGA = {
    deposito: [[55.6, -7.6], [57.6, -8.5], [58.2, -13], [58.0, -18], [57.0, -24]],
    bar: [[10.5, 16.2], [7.0, 17.6], [4.6, 18.4], [3.5, 21.0], [2.5, 25.0]],
    oficina: [[-31.8, 35.2], [-31.8, 37.2], [-26, 39], [-20, 39.5], [-14, 40]]
  };
  // eventos do caminho: lado leste (deposito, residencia, bar) ou oeste (oficina)
  const EVENTO = {
    leste: { olheiro: [15, 3.1, 31, olharPara(-1, .6)], moradora: [12, -2, 37.5, olharPara(-1, .2)], crianca: [9, -2.6, 38.0, olharPara(-1, 0)] },
    oeste: { olheiro: [-20, 7.7, 28, olharPara(1, .6)], moradora: [-12, -1.6, 40, olharPara(1, 0)], crianca: [-14, -1.6, 40.2, olharPara(1, 0)] }
  };
  const invisivelM = () => new THREE.MeshBasicMaterial({ visible: false });

  // pecas separadas do bake (web/interativos): mesma luz do cenario. As de apreensao recebem uma area de clique.
  const ITEM = {
    dep_pacotes: { nome: 'Pacotes', tipo: 'droga', texto: 'Cinco pacotes embalados com fita, sobre a mesa.' },
    dep_balanca: { nome: 'Balança de precisão', tipo: 'prova', texto: 'Balança de bancada, com resíduo de pó.' },
    dep_bolsa: { nome: 'Bolsa de lona', tipo: 'droga', texto: 'Bolsa de lona aberta, com mais pacotes no fundo.' },
    dep_caderno: { nome: 'Caderno de anotações', tipo: 'prova', texto: 'Caderno com nomes, valores e datas (contabilidade).' },
    dep_celular: { nome: 'Celular', tipo: 'celular', texto: 'Celular sobre a mesa, com mensagens chegando.' },
    dep_radio: { nome: 'Rádio comunicador', tipo: 'prova', texto: 'Rádio portátil ligado na frequência dos olheiros.' },
    dep_recibos: { nome: 'Recibos e anotações', tipo: 'prova', texto: 'Recibos e papéis com anotações.' },
    bar_pacotes: { nome: 'Pacotes no balcão', tipo: 'droga', texto: 'Seis pacotes pequenos com fita, prontos para venda.' },
    bar_balanca: { nome: 'Balança', tipo: 'prova', texto: 'Balança pequena no balcão.' },
    bar_dinheiro: { nome: 'Maços de dinheiro', tipo: 'dinheiro', texto: 'Maços de notas trocadas, típicos de venda a varejo.' },
    bar_radios: { nome: 'Rádios portáteis', tipo: 'prova', texto: 'Dois rádios portáteis ligados.' },
    bar_celulares: { nome: 'Celulares', tipo: 'celular', texto: 'Dois celulares no balcão.' },
    ofi_maleta: { nome: 'Maleta com celulares', tipo: 'celular', texto: 'Maleta com dois celulares sem nota.' },
    ofi_documentos: { nome: 'Documentos da moto', tipo: 'documento', texto: 'Documento de registro e nota de serviço.' }
  };
  const itens = {}, hitsItem = [];
  const decor = [];                                                       // portas e portao (so cenario)
  let infoInt = {};
  const itensProntos = fetch(HQ('interativos/interativos.json')).then(r => r.json()).then(info => {
    infoInt = info;
    return Promise.all(Object.keys(info).map(k => ctx.loaderGLB.loadAsync(HQ('interativos/' + k + '.glb')).then(g => {
      g.scene.traverse(o => { if (o.isMesh) { o.material.side = THREE.DoubleSide; o.material.fog = true; } });
      scene.add(g.scene);
      if (!ITEM[k]) { decor.push(g.scene); return; }
      const [x0, y0, z0] = info[k].min, [x1, y1, z1] = info[k].max;
      const h = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.3, x1 - x0 + .12), Math.max(.25, y1 - y0 + .12), Math.max(.3, z1 - z0 + .12)), invisivelM());
      h.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); h.userData.item = k; scene.add(h); h.updateMatrixWorld(true);
      itens[k] = { o: g.scene, h, ...ITEM[k] }; hitsItem.push(h);
    }).catch(e => console.warn('peca nao carregou', k, e))));
  }).catch(() => { });
  // arma da residencia, sobre a cama do casal. Revolver e fuzil do autor (modelos/revolver.glb e fuzil.glb, ja na
  // convencao da pistola: cano para -Z, eixo do cano em y = 0, origem na empunhadura; ver ferramentas/normalizar_arma.mjs)
  const armaCasa = new THREE.Group(); armaCasa.visible = false; scene.add(armaCasa);
  gl.loadAsync(HQ('modelos/arma.glb')).then(g => armaCasa.add(prep(g.scene.clone()))).catch(() => { });
  const hitArmaCasa = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .5), invisivelM()); hitArmaCasa.userData.item = 'arma_casa'; armaCasa.add(hitArmaCasa);
  const POS_ARMA_CASA = [48.5, 19.9, -4.9];      // sobre o colchao da cama do casal (topo a 19,6 m)
  const BOCA_ARMA = { pistola: -.2, revolver: -.24, fuzil: -.71 };                 // onde sai o clarao (um pouco a frente da boca)
  // armas dos suspeitos (modelos do autor): pistola 9 mm para todos; revolver e fuzil so na residencia.
  // O modelo antigo (arma.glb, sem marca de tipo) continua so na mao do policial e como reserva enquanto carrega.
  const GRUPOS_TIPO = { pistola9: [armaNPC, armaNPC2, armaNPC3, armaSolta, armaSolta2, armaSolta3, armaCasa], revolver: [armaCasa, armaNPC3, armaSolta3], fuzil: [armaCasa, armaNPC3, armaSolta3] };
  const tipoGrupo = new Map([[armaNPC, 'pistola'], [armaNPC2, 'pistola'], [armaSolta, 'pistola'], [armaSolta2, 'pistola'], [armaNPC3, 'pistola'], [armaSolta3, 'pistola'], [armaCasa, 'pistola']]);
  for (const [arq, grupos] of Object.entries(GRUPOS_TIPO)) gl.loadAsync(HQ('modelos/' + arq + '.glb')).then(g => {
    const tipo = arq === 'pistola9' ? 'pistola' : arq;
    for (const grp of grupos) { const m = prep(g.scene.clone()); m.userData.tipo = tipo; m.visible = false; grp.add(m); mostrarTipo(grp, tipoGrupo.get(grp)); }
  }).catch(() => { });
  // mostra so o modelo do tipo pedido (sem o modelo novo carregado, a pistola usa o antigo); nao mexe no clarao nem na area de clique
  function mostrarTipo(grp, tipo) {
    tipoGrupo.set(grp, tipo); grp.userData.fuzil = tipo === 'fuzil';
    const temNovo = grp.children.some(c => c.userData.tipo === tipo);
    for (const c of grp.children) if (!c.userData.luz && !(c.isMesh && c.material?.visible === false))
      c.visible = temNovo ? c.userData.tipo === tipo : (tipo === 'pistola' && !c.userData.tipo);
    if (grp.userData.flash) grp.userData.flash.position.z = BOCA_ARMA[tipo];
  }
  function escolherArma(var_) {
    const tipo = var_ === 'revolver' || var_ === 'fuzil' ? var_ : 'pistola';
    for (const grp of [armaCasa, armaNPC3, armaSolta3]) mostrarTipo(grp, tipo);
    hitArmaCasa.scale.set(1, 1, tipo === 'fuzil' ? 2.2 : 1);
  }

  /* ---- pose de fuzil: coronha no ombro direito, cano para o policial; os bracos alcancam a arma por IK (dois ossos) ---- */
  const IKV = { s: new THREE.Vector3(), e: new THREE.Vector3(), w: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3(), p: new THREE.Vector3(), n: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() };
  const IKQ = { q: new THREE.Quaternion(), pq: new THREE.Quaternion(), wq: new THREE.Quaternion() };
  function alinharOsso(osso, de, para) {                      // gira o osso (no mundo) para o vetor 'de' virar 'para'
    IKQ.q.setFromUnitVectors(IKV.a.copy(de).normalize(), IKV.b.copy(para).normalize());
    osso.parent.getWorldQuaternion(IKQ.pq); osso.getWorldQuaternion(IKQ.wq);
    osso.quaternion.copy(IKQ.pq.invert().multiply(IKQ.q.multiply(IKQ.wq))); osso.updateMatrixWorld(true);
  }
  function ikBraco(m, lado, alvo, polo) {
    const up = m.getObjectByName(`Bip01_${lado}_UpperArm`), fo = m.getObjectByName(`Bip01_${lado}_Forearm`), ha = m.getObjectByName(`Bip01_${lado}_Hand`);
    if (!up || !fo || !ha) return;
    const { s, e, w, t, u, p } = IKV;
    up.getWorldPosition(s); fo.getWorldPosition(e); ha.getWorldPosition(w);
    const a = s.distanceTo(e), b = e.distanceTo(w);
    t.copy(alvo); let d = s.distanceTo(t); d = Math.min(Math.max(d, Math.abs(a - b) + 1e-3), a + b - 1e-3);
    u.copy(t).sub(s).normalize(); t.copy(s).addScaledVector(u, d);
    const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    p.copy(polo).addScaledVector(u, -polo.dot(u)).normalize();
    const cotovelo = IKV.n.copy(s).addScaledVector(u, a * cosA).addScaledVector(p, a * sinA);
    alinharOsso(up, e.clone().sub(s), cotovelo.clone().sub(s));
    fo.getWorldPosition(e); ha.getWorldPosition(w);
    alinharOsso(fo, w.clone().sub(e), t.clone().sub(e));
  }
  const FZ = { ombro: new THREE.Vector3(), alvo: new THREE.Vector3(), dir: new THREE.Vector3(), lado: new THREE.Vector3(), cima: new THREE.Vector3(0, 1, 0), mR: new THREE.Vector3(), mL: new THREE.Vector3() };
  function poseFuzil() {
    for (const n of Object.values(npcs)) {
      const u = n.userData, g = u.arma; if (!g?.visible || !g.userData.fuzil || !n.visible || u.caido) continue;
      const m = u.modelo, om = m?.getObjectByName('Bip01_R_UpperArm'); if (!om) continue;
      n.updateMatrixWorld(true);
      om.getWorldPosition(FZ.ombro); camera.getWorldPosition(FZ.alvo);
      FZ.dir.copy(FZ.alvo).sub(FZ.ombro).normalize();
      FZ.lado.crossVectors(FZ.dir, FZ.cima).normalize();       // para a direita de quem segura
      // coronha (z = +0,28 na arma) encostada no ombro, um pouco para dentro do peito; a arma aponta para o policial
      g.position.copy(FZ.ombro).addScaledVector(FZ.dir, .24).addScaledVector(FZ.lado, -.06).addScaledVector(FZ.cima, .02);
      g.lookAt(FZ.alvo); g.rotateY(Math.PI); g.updateMatrixWorld(true);
      FZ.mR.set(0, -.07, .02).applyMatrix4(g.matrixWorld);   // mao direita na empunhadura
      FZ.mL.set(0, -.05, -.33).applyMatrix4(g.matrixWorld);  // mao esquerda no guarda-mao
      ikBraco(m, 'R', FZ.mR, FZ.lado.clone().add(new THREE.Vector3(0, -1, 0)));
      ikBraco(m, 'L', FZ.mL, FZ.lado.clone().negate().add(new THREE.Vector3(0, -1.2, 0)));
    }
  }

  /* ---- mira tipo luneta (sniper) no fuzil do policial ----
     Quest: a lente da luneta mostra a imagem ampliada (uma camera estreita alinhada ao cano, desenhada numa textura so
     quando o fuzil esta na mao). Computador: botao direito (ou Z) olha pela luneta: aproxima, mostra a cruz e o clique
     atira no centro. Com a pistola, o mesmo botao so aproxima um pouco. */
  const luneta = new THREE.Group(); luneta.visible = false;
  const rtMira = new THREE.WebGLRenderTarget(320, 320);
  const camMira = new THREE.PerspectiveCamera(5, 1, .1, 900);
  {
    const metal = ctx.iluminar(new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: .45, metalness: .25 }));
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .2, 20, 1, true).rotateX(Math.PI / 2), metal);
    const ocular = new THREE.Mesh(new THREE.CylinderGeometry(.024, .021, .05, 20, 1, true).rotateX(Math.PI / 2), metal); ocular.position.z = .11;
    const objetiva = new THREE.Mesh(new THREE.CylinderGeometry(.026, .02, .05, 20, 1, true).rotateX(Math.PI / 2), metal); objetiva.position.z = -.11;
    const base = new THREE.Mesh(new THREE.BoxGeometry(.012, .03, .12), metal); base.position.set(0, -.03, 0);
    // lente: imagem ampliada + cruz e bordas escuras (desenhadas por cima no proprio shader)
    const lente = new THREE.Mesh(new THREE.CircleGeometry(.022, 32), new THREE.ShaderMaterial({
      uniforms: { mapa: { value: rtMira.texture } }, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D mapa; varying vec2 vUv;
        void main(){ vec2 p = vUv - .5; float r = length(p);
          vec3 c = texture2D(mapa, vUv).rgb * smoothstep(.5, .36, r);                       // borda escura do tubo
          float cruz = (step(abs(p.x), .004) + step(abs(p.y), .004)) * step(.06, r) * step(r, .42);   // cruz (com o centro livre)
          float ponto = step(r, .012);
          c = mix(c, vec3(0.), clamp(cruz + ponto, 0., 1.));
          gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`
    }));
    lente.position.z = .136; lente.rotation.y = 0;                // olhando para tras (para o olho de quem segura)
    luneta.add(tubo, ocular, objetiva, base, lente);
    luneta.userData.tubo = [tubo, ocular, objetiva, base];
    camMira.position.set(0, 0, -.14); luneta.add(camMira);           // a camera olha para -Z, junto com o cano
    luneta.userData.lente = lente;
  }
  luneta.position.set(0, .115, .02);                                 // sobre o trilho do fuzil, alinhada ao eixo do cano
  arma.add(luneta);
  let mirando = false, fovNormal = camera.fov;
  const mira = document.createElement('div');
  Object.assign(mira.style, { position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none', display: 'none',
    background: 'radial-gradient(circle at 50% 50%, transparent 0 34vh, #000 34.5vh)' });
  mira.innerHTML = '<div style="position:absolute;left:50%;top:16vh;bottom:16vh;width:2px;margin-left:-1px;background:#000"></div><div style="position:absolute;top:50%;left:calc(50% - 34vh);right:calc(50% - 34vh);height:2px;margin-top:-1px;background:#000"></div><div style="position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#c00"></div>';
  document.body.appendChild(mira);
  const pontoPistola = document.createElement('div');
  Object.assign(pontoPistola.style, { position: 'fixed', left: '50%', top: '50%', width: '6px', height: '6px', margin: '-3px', borderRadius: '50%', background: '#f33', zIndex: 4, pointerEvents: 'none', display: 'none' });
  document.body.appendChild(pontoPistola);
  function mirar(on) {
    if (renderer.xr.isPresenting) return;                           // no Quest a luneta e olhar pela lente
    if (on && !S.armaNaMao) sacar(true);
    mirando = on && S.armaNaMao;
    const luneta_ = mirando && S.armaTipo === 'sniper';                // luneta so no fuzil de precisao
    camera.fov = mirando ? (luneta_ ? 6 : S.armaTipo === 'fuzil' ? 38 : 45) : fovNormal; camera.updateProjectionMatrix();
    mira.style.display = luneta_ ? 'block' : 'none'; pontoPistola.style.display = mirando && !luneta_ ? 'block' : 'none';
    arma.visible = S.armaNaMao && !luneta_;
  }
  function renderizarMira() {
    const ver = S.armaNaMao && S.armaTipo === 'sniper' && renderer.xr.isPresenting;
    luneta.visible = S.armaTipo === 'sniper';
    if (!ver) return;
    const xr = renderer.xr.enabled, ant = renderer.getRenderTarget();
    luneta.userData.lente.visible = false;
    renderer.xr.enabled = false; renderer.setRenderTarget(rtMira); renderer.render(scene, camMira);
    renderer.setRenderTarget(ant); renderer.xr.enabled = xr;
    luneta.userData.lente.visible = true;
  }
  addEventListener('contextmenu', e => { if (e.target === renderer.domElement) e.preventDefault(); });
  renderer.domElement.addEventListener('pointerdown', e => { if (e.button === 2) mirar(true); });
  addEventListener('pointerup', e => { if (e.button === 2) mirar(false); });

  /* ---- recuo: pistola pula para cima e volta; fuzil da coice para tras (ombro), o cano sobe pouco e, na rajada,
     vai subindo e abrindo (os tiros se espalham). No computador a mira sobe junto (puxe o mouse para baixo). ---- */
  const REC = { calor: 0, ult: 0 };
  function recuo(ray) {
    const agora = performance.now();
    if (S.armaTipo === 'pistola') { const rx = arma.rotation.x; arma.rotation.x = rx + .22; setTimeout(() => { arma.rotation.x = rx; }, 130); return; }
    if (S.armaTipo === 'sniper') {                                     // ferrolho: um tiro, coice forte, volta devagar
      const z0 = arma.position.z, rx = arma.rotation.x;
      arma.position.z = z0 + .09; arma.rotation.x = rx + .14;
      suave(.45, e => { arma.position.z = z0 + .09 * (1 - e); arma.rotation.x = rx + .14 * (1 - e); });
      if (!renderer.xr.isPresenting) ctx.chutarMira?.(.035, (Math.random() - .5) * .01);
      setTimeout(() => window.__som?.tocar('recarregar_pistola', null, false, { vol: .3 }), 500);      // som do ferrolho
      return;
    }
    REC.calor = agora - REC.ult < 220 ? Math.min(1, REC.calor + .1) : 0; REC.ult = agora;
    // espalhamento: cresce com a rajada (ate ~1,5 grau), sempre um pouco para cima
    if (ray) {
      const a = .004 + REC.calor * .022, d = ray.ray.direction;
      const lado = new THREE.Vector3().crossVectors(d, UP).normalize(), cima = new THREE.Vector3().crossVectors(lado, d).normalize();
      d.addScaledVector(lado, (Math.random() - .5) * a).addScaledVector(cima, Math.random() * a * .8).normalize();
    }
    const z0 = arma.position.z, rx = arma.rotation.x, ry = arma.rotation.y;
    arma.position.z = z0 + .04;                                          // coice para tras
    arma.rotation.x = rx + .045 + REC.calor * .04; arma.rotation.y = ry + (Math.random() - .5) * .03;
    setTimeout(() => { arma.position.z = z0; arma.rotation.x = rx; arma.rotation.y = ry; }, 65);
    if (!renderer.xr.isPresenting) ctx.chutarMira?.(.007 + REC.calor * .008, (Math.random() - .5) * .007);
  }

  /* ---- rajada do fuzil: enquanto o gatilho (Quest) ou o botao esquerdo (computador) estiver apertado ---- */
  const rajada = { pc: false, ndc: new THREE.Vector2(), ray: new THREE.Raycaster(), engoliClique: false };
  const naRajada = () => S.armaNaMao && S.armaTipo === 'fuzil' && !paineis.some(p => p.mesh.visible);
  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.button !== 0 || renderer.xr.isPresenting || !naRajada()) return;
    rajada.pc = true; rajada.engoliClique = true; rajada.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); atirarRajada();
  });
  renderer.domElement.addEventListener('pointermove', e => { if (rajada.pc) rajada.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
  addEventListener('pointerup', e => { if (e.button === 0) rajada.pc = false; });
  function atirarRajada(c) {
    if (c) { rajada.ray.ray.origin.setFromMatrixPosition(c.matrixWorld); rajada.ray.ray.direction.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion())); }
    else rajada.ray.setFromCamera(mirando ? new THREE.Vector2(0, 0) : rajada.ndc, camera);
    disparar(rajada.ray);                                         // o proprio disparo respeita a cadencia e recarrega sozinho
  }
  function rajadaQuadro() {
    if (!naRajada()) { rajada.pc = false; return; }
    if (rajada.pc) atirarRajada();
    for (const c of ctx.controles || []) if (c.userData.apertado && c.userData.mao !== 'left') atirarRajada(c);
  }

  /* ---- armas do policial: pistola (modelos/arma.glb), fuzil e sniper do autor; X (Quest), 1/2/3 ou X (computador) troca ---- */
  const CAP = { pistola: 15, fuzil: 30, sniper: 5 }, MUN = { pistola: 15, fuzil: 30, sniper: 5 };
  const NOME_ARMA = { pistola: 'Pistola', fuzil: 'Fuzil', sniper: 'Fuzil de precisão' }, ORDEM_ARMAS = ['pistola', 'fuzil', 'sniper'];
  // posicao de cada arma: clarao na boca, luneta (lente e camera de aumento) e lugar na tela do computador
  const POS_ARMA = {
    pistola: { boca: -.2, tela: [.17, -.13, -.38] },
    fuzil: { boca: -.71, tela: [.16, -.2, -.28] },                   // sem luneta (pedido do autor): mira leve
    sniper: { boca: -.84, tela: [.15, -.21, -.24], luneta: [0, .091, -.105], fov: 3.5, raio: .95, tubo: false }      // lente na ocular da luneta do modelo (z = 0,03)
  };
  S.armaTipo = 'pistola';
  for (const tipo of ['fuzil', 'sniper']) gl.loadAsync(HQ('modelos/' + tipo + '.glb')).then(g => { const m = prep(g.scene.clone()); m.userData.tipo = tipo; m.visible = false; arma.add(m); mostrarArmaPolicial(); }).catch(() => { });
  function mostrarArmaPolicial() {
    const t = S.armaTipo, P = POS_ARMA[t];
    for (const c of arma.children) if (c !== clarao && c !== luneta) c.visible = (c.userData.tipo || 'pistola') === t;
    luneta.visible = !!P.luneta;
    if (P.luneta) { luneta.position.fromArray(P.luneta); camMira.fov = P.fov; camMira.updateProjectionMatrix(); luneta.userData.lente.scale.setScalar(P.raio); for (const p of luneta.userData.tubo) p.visible = P.tubo; }
    clarao.position.z = P.boca;                                    // clarao na boca de cada arma
    if (arma.parent === camera) arma.position.fromArray(P.tela);
  }
  function trocarArma(tipo) {
    if (S.recarregando) return;
    const novo = tipo || ORDEM_ARMAS[(ORDEM_ARMAS.indexOf(S.armaTipo) + 1) % ORDEM_ARMAS.length]; if (novo === S.armaTipo) { if (!S.armaNaMao) sacar(true); return; }
    MUN[S.armaTipo] = S.municao ?? CAP[S.armaTipo];
    S.armaTipo = novo; CARREGADOR = CAP[novo]; S.municao = MUN[novo];
    if (mirando) mirar(false); sacar(true); window.__som?.tocar('recarregar_pistola', null, false, { vol: .25 });
    legenda('Equipamento', `${NOME_ARMA[novo]} na mão (${S.municao}/${CAP[novo]}).`, 2); status();
  }

  // marcador do destino (modo treino): coluna de luz ambar que se ve de longe
  const marcador = new THREE.Group(); marcador.visible = false; scene.add(marcador);
  {
    const m = new THREE.MeshBasicMaterial({ color: 0xf0a340, transparent: true, opacity: .28, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 30, 16, 1, true), m); col.position.y = 15; marcador.add(col);
    const anel = new THREE.Mesh(new THREE.RingGeometry(.9, 1.1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf0a340, transparent: true, opacity: .8, depthWrite: false, fog: false }));
    anel.position.y = .05; marcador.add(anel);
  }

  /* ================= variacoes ================= */
  function derivar(v) {
    v.lado = v.missao === 'oficina' ? 'oeste' : 'leste';
    if (v.missao === 'sniper' || v.missao === 'carga') v.evento = 'nenhum';
    if (v.missao === 'carga') v.suspeito = 'atira';
    v.ferido = 'nao';
    if (v.missao === 'residencia' && v.morador !== 'tranca') v.suspeito = 'rende';
    if (v.missao === 'oficina') v.suspeito = v.dono_oficina === 'foge' ? 'foge' : 'rende';
    return v;
  }
  function sortear() {
    const forc = Object.fromEntries((new URLSearchParams(location.search).get('v') || '').split(',').filter(Boolean).map(p => p.split(':')));
    const v = {};
    for (const [k, ops] of Object.entries(CEN.variacoes)) v[k] = forc[k] && ops.includes(forc[k]) ? forc[k] : ops[Math.floor(Math.random() * ops.length)];
    return derivar(v);
  }

  /* ================= personagens ================= */
  // chave -> [papel do manifest, nome na tela, voz, altura]
  const PAPEL = {
    parceiro: ['pm_parceiro', 'Policial parceiro', 'm', 1.8], apoio: ['pm_apoio', 'Policial de apoio', 'm', 1.8],
    vigia: ['vigia', 'Homem no depósito', 'm', 1.8], vendedor: ['vendedor', 'Homem no balcão', 'm', 1.8],
    dono_bar: ['dono_bar', 'Dono do bar', 'm', 1.75], frequentador_a: ['frequentador_a', 'Frequentador', 'm', 1.78],
    frequentador_b: ['frequentador_b', 'Frequentadora', 'f', 1.68], morador: ['morador', 'Morador', 'm', 1.8],
    mulher: ['mulher', 'Mulher do morador', 'f', 1.66], filho: ['crianca', 'Criança', 'c', 1.3],
    dono_oficina: ['dono_oficina', 'Dono da oficina', 'm', 1.78],
    olheiro: ['olheiro', 'Rapaz na laje', 'm', 1.75], comparsa: ['vigia', 'Homem armado', 'm', 1.8],
    moradora: ['senhora', 'Moradora', 'f', 1.62], crianca_rua: ['crianca', 'Criança', 'c', 1.3]
  };
  const SUSPEITO = { deposito: 'vigia', bar: 'vendedor', oficina: 'dono_oficina', residencia: 'morador', sniper: 'vendedor', carga: null };
  function limparNPCs() { Object.values(npcs).forEach(n => scene.remove(n)); for (const k in npcs) delete npcs[k]; }
  function novoNPC(chave, x, y, z, giro) {
    const [papel, nome, voz, alt] = PAPEL[chave];
    const n = personagem(papel, nome, 0x3d4045, alt);
    n.userData.modelo?.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => ctx.iluminar(m.clone())) : ctx.iluminar(o.material.clone()); });
    Object.assign(n.userData, { chave, voz, fig: true, giroBase: giro, altura: alt });
    n.position.copy(PT(x, y, z)); n.rotation.y = giro; scene.add(n); npcs[chave] = n;
    return n;
  }
  function papeisDaMissao(v) {
    if (v.missao === 'sniper') return ['parceiro', 'apoio', 'vendedor', 'dono_bar', 'frequentador_a', 'frequentador_b', ...PAPEIS_ATIR, ...(v.sniper_cena === 'dois' ? ['comparsa'] : [])];
    if (v.missao === 'carga') return ['parceiro', 'apoio', 'dono_bar', 'frequentador_a', 'frequentador_b', ...PAPEIS_ATIR];
    const L = ['parceiro', 'apoio', v.evento === 'crianca' ? 'crianca_rua' : v.evento];
    if (v.missao === 'deposito') L.push('vigia');
    if (v.missao === 'bar') L.push('vendedor', 'dono_bar', 'frequentador_a', 'frequentador_b');
    if (v.missao === 'oficina') L.push('dono_oficina');
    if (v.missao === 'residencia') { L.push('morador'); if (v.familia === 'mulher_crianca') L.push('mulher', 'filho'); }
    return L;
  }
  function criarNPCs(v) {
    limparNPCs();
    for (const g of ARMAS_NPC) g.visible = false;
    if (v.missao === 'sniper') return criarSniper(v);
    novoNPC('parceiro', PARTIDA[0] + 1.2, -2.5, PARTIDA[1] + .8, OLHAR_PARTIDA);
    const ap = novoNPC('apoio', PARTIDA[0], -2.5, PARTIDA[1], 0); ap.visible = false;
    if (v.missao === 'carga') {                                    // so a equipe, os civis do bar e os atiradores escondidos
      criarAtacantes();
      novoNPC('dono_bar', 15.9, 9.5, 15.1, olharPara(-1, .3));
      novoNPC('frequentador_a', 8.5, 9.5, 16.3, olharPara(1, -.4)); novoNPC('frequentador_b', 7.4, 9.5, 15.2, olharPara(1, 0));
      return;
    }
    // evento do caminho
    const ev = EVENTO[v.lado][v.evento], ke = v.evento === 'crianca' ? 'crianca_rua' : v.evento;
    const ne = novoNPC(ke, ev[0], ev[1], ev[2], ev[3]); ne.userData.evento = true;
    if (ke === 'crianca_rua') { ne.userData.base = 'fut_parado'; animar(ne, 'fut_parado', 1e6, 0); }
    if (ke === 'olheiro') { ne.userData.base = 'parada'; }
    if (v.missao === 'deposito') { const n = novoNPC('vigia', 52.7, 18.1, -7.6, olharPara(1, 0)); n.userData.arma = armaNPC; }
    if (v.missao === 'bar') {
      const n = novoNPC('vendedor', 11.2, 9.5, 15.0, olharPara(0, 1)); n.userData.arma = armaNPC2;
      novoNPC('dono_bar', 15.9, 9.5, 15.1, olharPara(-1, .3));
      novoNPC('frequentador_a', 8.5, 9.5, 16.3, olharPara(1, -.4)); novoNPC('frequentador_b', 7.4, 9.5, 15.2, olharPara(1, 0));
    }
    if (v.missao === 'oficina') novoNPC('dono_oficina', -32.6, -.8, 33.2, olharPara(0, 1));
    if (v.missao === 'residencia') {
      // saiu ao patamar para atender, de frente para a escada
      const n = novoNPC('morador', 37.25, 18.9, -7.45, olharPara(-.3, 1)); n.userData.arma = armaNPC3;
      if (v.familia === 'mulher_crianca') { novoNPC('mulher', 41.5, 18.9, -5.8, olharPara(-1, -.3)); novoNPC('filho', 42.2, 18.9, -5.3, olharPara(-1, -.3)); }
    }
  }
  const rota = (n, pts, vel, anim, aoChegar) => {
    const u = n.userData; u.rota = pts.map(([x, z]) => new THREE.Vector3(x, n.position.y, z)); u.destino = null; u.vel = vel;
    u.aoChegar = () => { animar(n, u.base || 'parada', 1e6, .3); aoChegar?.(); };
    animar(n, u.acoes?.[anim] ? anim : 'andando', 1e6, .25);
  };
  const diz = (n, texto, gesto = 'falando') => n ? dizer(n, n.userData.nome, { texto, gesto }, n.userData.voz) : Promise.resolve();
  const F = k => CEN.falas[k] || '';

  /* ================= paineis de opcoes ================= */
  const fechar = () => dialogo.esconder();
  function dica(texto, seg = 6) { if (S.modo !== 'avaliacao' && S.ativo) legenda('Dica do instrutor', texto, seg); }
  function painelOpc(tag, titulo, lista, aoEscolher, texto = '', voltar = true) {
    fecharPaineis();
    dialogo.mostrar({ tag, titulo, texto, botoes: [...lista.map(op => ({ label: op.fala, acao: () => {
      fechar();
      if (op.acao) registrar(op.acao);
      if (op.erro) registrar(op.erro);
      if (op.falha) registrar(op.falha);
      if (op.feedback && S.modo === 'treino') setTimeout(() => legenda('Instrutor', op.feedback, 7), 2400);
      aoEscolher?.(op);
    } })), ...(voltar ? [{ label: 'Voltar', acao: fechar }] : [])] });
  }

  /* ================= suspeito: rende, foge ou atira ================= */
  function renderNPC(n, largou) {
    const u = n.userData; if (u.caido) return;
    u.ameaca = false; u.atira = false; u.fugindo = false; u.rendido = true; u.rota = []; u.destino = null; u.aoChegar = null;
    if (u.arma?.visible) { u.arma.visible = false; if (largou) armaChao(n.position, u.chave); }
    u.base = 'rendido'; animar(n, 'rendido', 1e6, .25); sincAmeaca(); status();
  }
  function reagir(n) {                                         // reacao do suspeito quando a policia se anuncia
    const u = n?.userData, v = S.variacao; if (!n || u.reagiu || u.caido) return; u.reagiu = true;
    if (v.suspeito === 'rende') { diz(n, F(u.chave + '_rende') || F('vigia_rende')).then(() => renderNPC(n)); return; }
    if (v.suspeito === 'foge') {
      A.resistiu = true; legenda(n.userData.nome, F(u.chave + '_foge') || '(sai correndo)', 3);
      if (u.chave === 'dono_oficina' && itens.ofi_maleta) { itens.ofi_maleta.o.visible = false; itens.ofi_maleta.h.visible = false; A.levouMaleta = true; }
      u.fugindo = true; u.base = 'parada';
      rota(n, FUGA[v.missao] || [], 3.6, 'correndo', () => { if (u.rendido || u.caido) return; n.visible = false; u.fugiu = true; u.fugindo = false; A.fugiu = true;
        legenda('Instrutor', 'O suspeito fugiu. Comunique a direção e as características pelo rádio; não se persegue sozinho pelas vielas.', 7); status(); });
      if (S.modo === 'treino') dica('Ele está fugindo, desarmado. Aponte para ele e dê a ordem de parar (gatilho/clique). Não atire em quem foge sem ameaçar.', 7);
      return;
    }
    // atira
    A.resistiu = true; u.ameaca = true; u.atira = true; u.proxTiro = performance.now() + 1300;
    if (u.arma) u.arma.visible = true; u.base = 'apontando'; animar(n, u.acoes?.apontando ? 'apontando' : 'nervoso', 1e6, .2);
    diz(n, F(u.chave + '_atira') || F('vigia_atira'), null);
    S.variacao.armado = 'sim'; sincAmeaca(); status();
    legenda('Alerta', 'Ele sacou uma arma e vai atirar! Abrigue-se e reaja.', 5);
  }
  function ordemVerbal(n) {
    const u = n?.userData; if (!u || u.caido || u.rendido) return false;
    registrar('ordem_verbal'); legenda('Você', 'Parado! Polícia! Larga a arma e mão na cabeça!', 2.5);
    if (u.fugindo) {                                            // perto, ele para e se rende; longe, segue fugindo
      camera.getWorldPosition(V);
      if (V.distanceTo(n.position) < 12) setTimeout(() => { diz(n, 'Tá bom, tá bom, perdi!'); renderNPC(n); }, 700);
      return true;
    }
    if (u.ameaca && !u.ordem) { u.ordem = true; }               // quem esta atirando nao obedece nesta variacao
    return true;
  }
  function menuAlgemas(n) {
    const u = n.userData; if (u.algemado) return legenda(u.nome, 'Algemado, aguardando a condução.', 3);
    const precisa = !!A.resistiu;
    painelOpc('Condução', u.nome, CEN.dialogos.algemas, op => {
      if (op.id === 'algemar_justificado') {
        if (precisa) registrar('algemas_justificadas'); else registrar('algemas_sem_motivo');
        u.algemado = true; window.__som?.tocar('algemas', n.position); u.base = 'algemado'; animar(n, 'algemado', 1e6, .3);
      } else if (!precisa) registrar('algemas_justificadas');
      if (u.arma?.visible === false && (u.chave === S.variacao.suspeitoChave)) A.presoOk = true;
      A.preso = true; status();
    }, precisa ? 'Ele resistiu (fugiu ou estava armado).' : 'Ele se rendeu e está colaborando.');
  }

  /* ================= fluxo da ocorrencia ================= */
  function novaOcorrencia(v, cap) {
    S.variacao = v; S.variacao.suspeitoChave = SUSPEITO[v.missao]; S.feitos = new Map(); S.granadas = 2; S.vida = 3; MUN.pistola = CAP.pistola; MUN.fuzil = CAP.fuzil; MUN.sniper = CAP.sniper; CARREGADOR = CAP[S.armaTipo]; S.municao = CARREGADOR; S.recarregando = false; limparSangue();
    A = { n: HIST.length + 1, fase: 'chegada', titulo: cap?.titulo || `Ocorrência ${HIST.length + 1} · ${CEN.nomes_variacao.missao[v.missao]}`, apreendidos: new Set(), grupos: {}, limpo: {} };
    criarNPCs(v); sacar(false);
    for (const it of Object.values(itens)) { it.o.visible = true; it.h.visible = true; }
    if (v.missao === 'carga') for (const [k, it] of Object.entries(itens)) {      // a carga num dos tres locais; no deposito ficam as pistas
      const vis = k.startsWith('dep_') ? (v.carga_local === 'deposito' || !CARGA.deposito.includes(k)) : CARGA[v.carga_local].includes(k) || (v.carga_local === 'bar' && k.startsWith('bar_'));
      it.o.visible = vis; it.h.visible = vis;
    }
    if (v.missao === 'deposito' && v.deposito_indicios === 'escondidos') for (const k of ['dep_pacotes', 'dep_balanca', 'dep_caderno']) if (itens[k]) { itens[k].o.visible = false; itens[k].h.visible = false; }
    armaCasa.visible = v.missao === 'residencia'; escolherArma(v.arma_casa); armaCasa.position.copy(PT(POS_ARMA_CASA[0], POS_ARMA_CASA[1], POS_ARMA_CASA[2])); armaCasa.position.y += .03; armaCasa.rotation.set(0, .6, Math.PI / 2);      // deitada de lado sobre o colchao
    ctx.pousar(PARTIDA[0], PARTIDA[1]); ctx.setYaw(OLHAR_PARTIDA);
    const L = LOC[v.missao]; marcador.position.copy(PT(L.alvo[0], L.alvo[1], L.alvo[2])); marcador.visible = S.modo === 'treino';
    let abrir = () => radio(CEN.radio.inicio.replace('{denuncia}', CEN.denuncias[v.missao])).then(() => dica(`Destino: ${L.nome}. Fale com o parceiro e informe a chegada pelo rádio (menu: T ou botão Y/B).`, 8));
    if (v.missao === 'sniper') {
      ctx.pousar(L.alvo[0], L.alvo[2]); ctx.setYaw(Math.atan2(-(11 - L.alvo[0]), -(15.5 - L.alvo[2])));
      marcador.visible = false; A.chegou = true; A.chegada = true; A.plano = true; A.eventoFeito = true;
      trocarArma('sniper');
      abrir = () => radio(CEN.radio.sniper_inicio).then(() => dica('Olhe pela luneta (no Quest, leve o fuzil ao olho; no computador, botão direito). Depois informe pelo rádio o que vê (menu).', 9));
      A.tEntrada = setTimeout(() => { if (A && !A.relatou) entradaEquipe(); }, 75000);      // a equipe entra mesmo sem o relato
      A.tAtaque = setTimeout(ataqueLaje, 25000);                                             // os tiros contra a laje comecam cedo
    }
    if (v.missao === 'carga') {
      Object.assign(A, { plano: true, eventoFeito: true, grupos: {}, limpo: {}, ultEmb: performance.now(), posEmb: PT(PARTIDA[0], -2.5, PARTIDA[1]), nEmb: 0 }); delete LOC.pista;
      trocarArma('fuzil');
      abrir = () => radio(CEN.radio.inicio.replace('{denuncia}', CEN.denuncias.carga)).then(() => dica(`Destino: ${L.nome}. Vai ter tiro no caminho: avance de abrigo em abrigo. Informe a chegada pelo rádio (menu).`, 9));
    }
    if (cap) { fecharPaineis(); menu.mostrar({ tag: 'Modo história', titulo: cap.titulo, texto: cap.texto, longe: 1.3, botoes: [{ label: 'Começar', acao: () => { menu.esconder(); abrir(); } }] }); }
    else abrir();
    status();
  }
  function falarRadio(tipo) {
    fecharPaineis();
    if (tipo === 'chegada') { A.chegada = true; registrar('comunicar_chegada'); radio(CEN.radio.chegada); }
    if (tipo === 'apoio') {
      A.apoio = true; radio(CEN.radio.apoio).then(() => setTimeout(() => {
        const n = npcs.apoio; if (!n || !A) return; camera.getWorldPosition(V); n.position.copy(PT(V.x - 2, V.y, V.z + 2)); n.visible = true; n.userData.segue = true; diz(n, F('apoio'));
      }, 8000));
    }
    if (tipo === 'fuga') { A.comunicouFuga = true; radio('Ciente. Viaturas do entorno avisadas. Não persigam sozinhos.'); }
    status();
  }
  function menuParceiro() {
    const p = npcs.parceiro;
    if (A.plano) return diz(p, F('parceiro'));
    painelOpc('Parceiro', 'Como vamos subir?', CEN.dialogos.parceiro, op => { A.plano = true; if (op.acao) diz(p, F('parceiro_resposta')); });
  }
  // evento do caminho
  function menuEvento(n) {
    const v = S.variacao, k = v.evento, D = CEN.dialogos[k];
    if (A.eventoFeito) return diz(n, F(k === 'crianca' ? 'crianca' : k));
    painelOpc(k === 'olheiro' ? 'Rapaz com rádio na laje' : k === 'moradora' ? 'Moradora na escadaria' : 'Criança no caminho', 'O que fazer', D, op => {
      A.eventoFeito = true;
      if (k === 'olheiro' && op.id === 'comunicar') radio('Ciente. Atenção redobrada: a chegada de vocês foi avisada.');
      if (k === 'crianca' && op.id === 'proteger') { const c = npcs.crianca_rua; diz(c, F('crianca')).then(() => { c.userData.base = 'parada'; rota(c, [[c.position.x - 4, c.position.z - 3]], 3, 'correndo', () => { c.visible = false; }); }); }
      if (k === 'moradora' && op.id === 'cumprimentar') diz(n, F('moradora'));
    });
  }
  function aoChegar() {
    A.chegou = true; marcador.visible = false; status();
    const v = S.variacao;
    if (v.missao === 'bar') dica('Há frequentadores perto do balcão. Antes de agir, afaste-os (clique em qualquer pessoa).', 7);
    if (v.missao === 'deposito') dica('Observe da porta, sem entrar: clique no homem ou na porta.', 6);
    if (v.missao === 'residencia') dica('Fale com o morador na porta.', 5);
    if (v.missao === 'oficina') dica('Fale com o dono da oficina.', 5);
  }
  // ---- deposito
  function menuDeposito() {
    const v = S.variacao, n = npcs.vigia;
    if (!A.anunciou) return painelOpc('Porta do depósito', 'Abordagem', CEN.dialogos.deposito_porta, () => {
      A.anunciou = true; reagir(n);
      setTimeout(() => { if (A && !A.decidiuEntrada) decisaoDeposito(); }, v.suspeito === 'atira' ? 9000 : 3500);
    }, v.deposito_indicios === 'visiveis' ? 'Da porta você vê, sobre a mesa: pacotes embalados com fita, uma balança e um caderno.' : 'Da porta você vê uma mesa vazia, um armário fechado e uma bolsa de lona fechada no chão.');
    if (!A.decidiuEntrada) return decisaoDeposito();
  }
  function decisaoDeposito() {
    const v = S.variacao;
    painelOpc('Depósito', 'Entrar ou não?', CEN.dialogos.deposito_decisao, op => {
      A.decidiuEntrada = true;
      if (op.id === 'cercar') {
        if (v.deposito_indicios === 'escondidos') registrar('nao_entrar_sem_razao');
        A.mandado = true; radio(CEN.radio.mandado); return;
      }
      if (v.deposito_indicios === 'visiveis') { registrar('entrada_flagrante'); A.entrou = true; dica('Entrada legítima. Fotografe, separe e lacre o material (clique em cada item).', 7); }
      else { registrar('invasao_sem_razao'); A.entrou = true; }
    }, v.deposito_indicios === 'visiveis' ? 'O material está à vista da porta.' : 'Nada indica crime à vista; só há a denúncia anônima.', false);
  }
  // ---- residencia
  function menuMorador(n) {
    const v = S.variacao, D = CEN.dialogos;
    if (n.userData.rendido) return menuAlgemas(n);
    if (!A.anunciou) return painelOpc('Porta da residência', 'Primeiro contato', D.residencia_porta, () => {
      A.anunciou = true;
      diz(n, F('morador_porta')).then(() => {
        if (v.morador === 'tranca') return trancar(n);
        painelOpc('Morador', 'Pedido de entrada', D.residencia_pedido, op => {
          if (op.id === 'forcar') { registrar('invasao_sem_razao'); A.entrou = true; return; }
          if (v.morador === 'autoriza') { registrar('consentimento_registrado'); A.entrou = true; A.consentiu = true; diz(n, F('morador_autoriza')); dica('Entrada autorizada e registrada. A arma está no quarto do casal.', 7); familia(); }
          else diz(n, F('morador_recusa')).then(() => painelOpc('Morador recusou', 'E agora?', [
            { id: 'nao_entrar', fala: 'Não entrar: registrar, manter observação e pedir mandado pelo rádio', acao: 'nao_entrar_sem_razao' },
            { id: 'forcar', fala: 'Entrar à força', falha: 'invasao_sem_razao' }], op2 => {
              if (op2.id === 'nao_entrar') { A.mandado = true; radio(CEN.radio.mandado); } else { A.entrou = true; }
            }, '', false));
        }, '', false);
      });
    });
    diz(n, v.morador === 'autoriza' ? 'O armário é no quarto do casal.' : F('morador_recusa'));
  }
  function familia(depois) {
    if (S.variacao.familia !== 'mulher_crianca' || A.familiaFora) return depois?.();
    setTimeout(() => painelOpc('Família', 'Mulher e criança na sala', CEN.dialogos.familia, () => {
      A.familiaFora = true;
      for (const k of ['mulher', 'filho']) { const n = npcs[k]; if (n) rota(n, [[38.3, -7.4], [37.0, -6.6], [36.6, -4.6], [36.0, -2.8]], 1.4, 'andando'); }
      diz(npcs.mulher, F('mulher'));
      if (depois) setTimeout(depois, 2500);
    }, 'Há uma mulher e uma criança na sala.', false), 1500);
  }
  function trancar(n) {
    const u = n.userData; A.resistiu = true;
    diz(n, F('morador_tranca'), null);
    if (u.arma) u.arma.visible = true; u.base = 'apontando'; animar(n, u.acoes?.apontando ? 'apontando' : 'nervoso', 1e6, .2);
    rota(n, [[38.4, -7.6], [40.5, -6.8], [44.6, -4.6], [46.5, -4.4]], 2.6, 'correndo', () => { n.visible = false; u.trancado = true; });
    // primeiro a familia sai (se houver); depois a decisao sobre o morador trancado
    setTimeout(() => familia(() => painelOpc('Morador trancado e armado', 'Decisão', CEN.dialogos.residencia_tranca, op => {
      if (op.id === 'isolar') { A.isolou = true; radio(CEN.radio.crise); } else A.entrou = true;
    }, 'Ele entrou no quarto do casal com uma arma e trancou a porta.', false)), 2500);
  }
  // ---- bar
  function menuBar(n) {
    const v = S.variacao, D = CEN.dialogos, k = n.userData.chave;
    if (!A.afastou && !A.anunciou) return painelOpc('Bar da praça', 'Há frequentadores perto do balcão', D.bar_frequentadores, op => {
      A.anunciou = true;
      if (op.id === 'afastar') {
        A.afastou = true;
        for (const [kk, dest] of [['frequentador_a', [6.2, 17.9]], ['frequentador_b', [5.4, 17.4]]]) { const f = npcs[kk]; if (f) rota(f, [dest], 1.3, 'andando', () => { f.rotation.y = olharPara(1, -1); f.userData.giroBase = f.rotation.y; }); }
        setTimeout(() => reagir(npcs.vendedor), 2200);
      } else reagir(npcs.vendedor);
    });
    if (k === 'vendedor') return n.userData.rendido ? menuAlgemas(n) : ordemVerbal(n);
    if (k === 'dono_bar') return diz(n, F('dono_bar'));
    if (/^frequentador/.test(k)) {
      if (n.userData.conversou) return diz(n, k === 'frequentador_a' && v.frequentador === 'usuario' ? F('frequentador_usuario') : F('frequentador_cidadao'));
      const usuario = k === 'frequentador_a' && v.frequentador === 'usuario';
      return painelOpc('Frequentador', n.userData.nome, D.bar_frequentador, op => {
        n.userData.conversou = true;
        if (op.id === 'revistar' && !usuario) registrar('abordagem_sem_suspeita');
        if (op.id === 'conversar' && usuario) A.viuUsuario = true;
        diz(n, usuario ? F('frequentador_usuario') : F('frequentador_cidadao'));
        if (usuario) A.usuario = true;
      });
    }
  }
  // ---- oficina
  function menuOficina(n) {
    const v = S.variacao, D = CEN.dialogos;
    if (n.userData.rendido) return menuAlgemas(n);
    if (!A.anunciou) return painelOpc('Oficina', 'Abordagem', D.oficina_dono, () => {
      A.anunciou = true;
      if (v.dono_oficina === 'foge') return reagir(n);
      diz(n, F('dono_oficina_' + v.dono_oficina)).then(() => painelOpc('Oficina', 'Conferência', [
        { id: 'chassi', fala: 'Conferir a numeração do chassi e do motor com o documento', acao: 'conferir_documento' },
        { id: 'prender', fala: 'Prender logo: a denúncia basta', erro: 'ameacar_morador' }], op => {
          if (op.id !== 'chassi') return;
          A.conferiu = true;
          legenda('Conferência', v.moto === 'regular' ? 'Chassi e motor batem com o documento. Não há registro de roubo: a denúncia não se confirmou.' : 'O chassi está raspado e a placa não bate com o motor.', 7);
          if (v.moto === 'adulterada') A.resistiu = false;
        }, '', false));
    });
  }
  // ---- apreensao (cadeia de custodia)
  function podeApreender(k) {
    const v = S.variacao;
    if (v.missao === 'carga') return !!A.limpo?.[k?.startsWith('dep_') ? 'deposito' : 'pista'];
    if (v.missao === 'deposito' || v.missao === 'residencia') return !!A.entrou;
    return !!A.anunciou;
  }
  function usarItem(k) {
    const it = itens[k], arma = k === 'arma_casa' || k === 'arma_chao';
    const cg = S.variacao.missao === 'carga' && CARGA[S.variacao.carga_local].includes(k);
    const nome = arma ? 'Arma de fogo' : cg ? it.nome + ' (a carga)' : it.nome;
    const pista = !arma && podeApreender(k) && pistaCarga(k);
    const texto = arma ? 'Arma de fogo carregada.' : cg ? 'Tabletes de droga embalados com fita: é a carga.' : pista ? it.texto + '\n' + pista : it.texto;
    if (!podeApreender(k)) return legenda('Vestígio', texto + ' Sem entrada legítima, não toque em nada.', 5);
    const ops = arma ? [
      { id: 'lacrar', fala: 'Fotografar no lugar, descarregar apontando para local seguro e lacrar', acao: 'arma_segura', tambem: 'apreender_custodia' },
      { id: 'pegar', fala: 'Pegar e conferir na mão, de frente para o parceiro', erro: 'arma_sem_ameaca' }]
      : [
        { id: 'lacrar', fala: 'Fotografar no lugar, separar, lacrar e anotar onde estava e quem achou', acao: 'apreender_custodia', tambem: it.tipo === 'celular' ? 'celular_sem_acessar' : null },
        { id: 'pegar', fala: 'Recolher direto para a viatura', erro: 'pegar_sem_registro' },
        ...(it.tipo === 'celular' ? [{ id: 'ler', fala: 'Ler as mensagens para achar os comparsas', falha: 'acessar_celular' }] : [])];
    painelOpc('Apreensão', nome, ops, op => {
      if (op.tambem) registrar(op.tambem);
      if (op.id === 'ler') return legenda('Instrutor', 'O conteúdo do celular só pode ser acessado com ordem judicial (ou consentimento válido).', 6);
      A.apreendidos.add(k);
      if (k === 'arma_casa') armaCasa.visible = false; else if (k === 'arma_chao') { armaSolta.visible = false; armaSolta2.visible = false; armaSolta3.visible = false; }
      else { it.o.visible = false; it.h.visible = false; }
      legenda('Apreensão', `${nome}: apreendido${op.id === 'lacrar' ? ' e lacrado' : ''}.`, 3); cargaApreendida(k); status();
    }, texto);
  }

  /* ================= missao de sniper: cobertura da praca do bar a partir da laje ================= */
  // tiros de longe: as paredes da praca tambem contam na colisao do tiro (o resto do cenario so perto do policial)
  const caixaPraca = new THREE.Box3(new THREE.Vector3(-2, 5, 8), new THREE.Vector3(22, 20, 26));
  let malhasPraca = null;
  const colisaoBase = ctx.colisao;
  ctx.colisao = () => {
    if (!(A && S.variacao.missao === 'sniper')) return colisaoBase();
    if (!malhasPraca) malhasPraca = ctx.malhas().filter(o => o.userData.caixa?.intersectsBox(caixaPraca));
    return [...colisaoBase(), ...malhasPraca];
  };
  /* ================= atiradores: um grupo de bandidos com fuzil, usado nas duas missoes =================
     Aparecem, atiram, se abaixam e reaparecem. No sniper vem em ondas de pontos fixos (lajes e becos com visada da laje);
     na carga, emboscam pelo caminho em pontos achados na hora (laje ou rua com visada para o policial). */
  const N_ATIR = 12, MODELO_ATIR = ['morador', 'vigia', 'olheiro', 'vendedor', 'dono_oficina'];
  for (let i = 1; i <= N_ATIR; i++) PAPEL['atirador_' + i] = [MODELO_ATIR[(i - 1) % MODELO_ATIR.length], 'Atirador', 'm', 1.8];
  const PAPEIS_ATIR = Array.from({ length: N_ATIR }, (_, i) => 'atirador_' + (i + 1));
  const PONTOS_ATIRADOR = {
    laje: [[-36, 32.5, -20], [-24, 32.5, -20], [-64, 18.5, -12], [-6, 20.8, -8], [-70, 12.1, 8], [-4, 12.1, 24]],
    beco: [[-60, 7, 24], [-36, 5.3, 30], [-24, 5.3, 34], [-10, 5, 34]]
  };
  const armasAtacantes = PAPEIS_ATIR.map(() => {
    const g = new THREE.Group(); g.visible = false; g.userData.fuzil = true; scene.add(g);
    const fl = criarFlash(.28); fl.position.set(0, 0, -.71); g.add(fl); g.userData.flash = fl; return g;
  });
  gl.loadAsync(HQ('modelos/fuzil.glb')).then(gg => { for (const g of armasAtacantes) { const m = prep(gg.scene.clone()); m.userData.tipo = 'fuzil'; g.add(m); } }).catch(() => { });
  const atacantes = () => Object.values(npcs).filter(n => n.userData.atacante);
  const emCena = () => atacantes().filter(n => n.userData.emCena && !n.userData.caido && !n.userData.rendido && !n.userData.saiu);
  const livres = () => atacantes().filter(n => !n.userData.emCena);
  const ameacaPraca = () => ameacando().filter(n => !n.userData.atacante);
  const embaralhar = a => [...a].sort(() => Math.random() - .5);
  function criarAtacantes() {                                     // todos escondidos; cada missao posiciona e solta
    PAPEIS_ATIR.forEach((k, i) => {
      const n = novoNPC(k, PARTIDA[0], -2.5, PARTIDA[1], 0);
      Object.assign(n.userData, { atacante: true, arma: armasAtacantes[i], semVirar: false }); n.visible = false;
    });
  }
  function posicionar(n, p) {
    n.position.set(p[0], p[1], p[2]); camera.getWorldPosition(V);
    n.rotation.y = olharPara(V.x - p[0], V.z - p[2]); n.userData.giroBase = n.rotation.y;
  }
  // visada de verdade (todo o cenario carregado entre os dois pontos, nao so o perto do policial)
  const rayV = new THREE.Raycaster(), caixaV = new THREE.Box3();
  function visadaLivre(a, b) {
    caixaV.setFromPoints([a, b]); const d = a.distanceTo(b);
    rayV.set(a, b.clone().sub(a).normalize()); rayV.far = d - .4;
    return !rayV.intersectObjects(ctx.malhas().filter(o => o.userData.caixa?.intersectsBox(caixaV)), false)[0];
  }
  // ponto de emboscada perto do policial: laje ou rua (a superficie mais alta ali), plana, com visada para a cabeca dele
  function pontoEmboscada(min = 11, max = 24, longeDe = []) {
    camera.getWorldPosition(V); camera.getWorldDirection(V2); const olho = V.clone(), giro = Math.atan2(V2.x, V2.z);
    for (let t = 0; t < 70; t++) {
      const a = giro + (Math.random() - .5) * (t < 45 ? 2.4 : 5.5), r = min + Math.random() * (max - min);
      const x = olho.x + Math.sin(a) * r, z = olho.z + Math.cos(a) * r;
      const y = ctx.alturaChao(x, z, olho.y - 8, 22); if (y == null || y < -3.2 || y > olho.y + 14) continue;
      if ([[.5, 0], [-.5, 0], [0, .5], [0, -.5]].some(([dx, dz]) => Math.abs((ctx.alturaChao(x + dx, z + dz, y, 1.2) ?? -99) - y) > .3)) continue;      // borda ou telhado inclinado
      if (longeDe.some(p => Math.hypot(p[0] - x, p[2] - z) < 4)) continue;
      if (!visadaLivre(new THREE.Vector3(x, y + 1.5, z), olho)) continue;
      return [x, y, z];
    }
    return null;
  }
  function aparecer(n) {
    const u = n.userData; if (!A || A.fase === 'fim' || u.caido || u.rendido || u.saiu || npcs[u.chave] !== n) return;
    camera.getWorldPosition(V);
    if (n.position.distanceTo(V) > (u.limite || 50)) { u.saiu = true; esconderAtirador(n, true); return; }      // o policial ja passou: ele some
    n.visible = true; u.arma.visible = true; u.ameaca = true; u.atira = true; u.emCena = true;
    u.proxTiro = performance.now() + 700 + Math.random() * 700;
    u.base = 'apontando'; animar(n, u.acoes?.apontando ? 'apontando' : 'nervoso', 1e6, .2);
    sincAmeaca(); status();
    clearTimeout(u.tCiclo); u.tCiclo = setTimeout(() => esconderAtirador(n), 4000 + Math.random() * 3500);
  }
  function esconderAtirador(n, deVez) {                         // abaixa atras da mureta / da esquina e volta depois
    const u = n.userData; if (!A || u.caido || u.rendido || npcs[u.chave] !== n) return;
    n.visible = false; u.arma.visible = false; u.ameaca = false; u.atira = false; sincAmeaca(); status();
    if (!deVez) u.tCiclo = setTimeout(() => aparecer(n), 1800 + Math.random() * 2400);
  }
  function soltarAtirador(n, p, opc = {}) {
    const u = n.userData; posicionar(n, p);
    Object.assign(u, { emCena: true, cadencia: 1000, acerto: .12, limite: 35, ...opc });
    setTimeout(() => aparecer(n), opc.atraso || 0);
    return n;
  }

  /* ---- sniper: 8 atiradores em tres ondas (3, 3 e 2) contra a laje; a primeira comeca 25 s depois do inicio ---- */
  function ataqueLaje() {
    if (!A || A.ataqueIniciado) return; A.ataqueIniciado = true;
    const lajes = embaralhar(PONTOS_ATIRADOR.laje), becos = embaralhar(PONTOS_ATIRADOR.beco);
    const pts = [lajes[0], becos[0], lajes[1], lajes[2], becos[1], lajes[3], becos[2], lajes[4]];
    A.ondas = [pts.slice(0, 3), pts.slice(3, 6), pts.slice(6, 8)]; A.onda = -1;
    proximaOnda();
  }
  function proximaOnda() {
    if (!A || A.fase === 'fim') return;
    const k = ++A.onda, pts = A.ondas[k]; if (!pts) return;
    const ns = livres().slice(0, pts.length); A.grupoOnda = ns;
    ns.forEach((n, i) => soltarAtirador(n, pts[i], { onda: k, cadencia: 700, acerto: .15, limite: 70, atraso: 1500 + i * 2500 }));
    radio(k === 0 ? CEN.radio.sniper_ataque : CEN.radio.sniper_onda);
    if (k === 0) dica('Tiros de lajes e becos! Abaixe atrás da mureta, ache o atirador pela luneta e reaja entre um tiro e outro.', 8);
  }

  /* ---- carga: emboscadas no caminho, recepcao a tiro no bar e defesa de cada local ---- */
  const CARGA = { deposito: ['dep_bolsa', 'dep_pacotes'], bar: ['bar_pacotes'], oficina: ['ofi_maleta'] };
  const FIXO = { bar: [11.2, 9.5, 15.0], deposito: [52.7, 18.1, -7.6], oficina: [-32.6, -.8, 33.2] };
  const PISTA = {
    dep_caderno: { bar: 'Última página do caderno: "mercadoria — bar da praça, atrás do balcão".', oficina: 'Última página do caderno: "mercadoria — oficina de baixo, maleta da bancada".' },
    dep_radio: { bar: 'No rádio, uma voz: "Desceu tudo pro balcão do bar da praça!"', oficina: 'No rádio, uma voz: "Leva a maleta pra oficina lá de baixo!"' }
  };
  function emboscada(qtos) {
    const usados = [];
    livres().slice(0, qtos).forEach((n, i) => {
      const p = pontoEmboscada(11, 24, usados); if (!p) return; usados.push(p);
      soltarAtirador(n, p, { grupo: 'rota', atraso: i * 1800 });
    });
    if (usados.length) { A.nEmb = (A.nEmb || 0) + 1; if (A.nEmb === 1) dica('Tiros! Abrigue-se atrás de uma parede, ache o atirador e reaja. Às vezes é um, às vezes dois.', 7); }
    return usados.length;
  }
  function defesa(lugar, qtos, chave = lugar) {
    const ns = livres().slice(0, qtos), usados = [FIXO[lugar]];
    A.grupos[chave] = [];
    ns.forEach((n, i) => {
      let p = i === 0 ? FIXO[lugar] : pontoEmboscada(9, 22, usados); if (!p) return; usados.push(p);
      if (i === 0) { n.position.copy(PT(p[0], p[1], p[2])); p = [n.position.x, n.position.y, n.position.z]; }
      A.grupos[chave].push(soltarAtirador(n, p, { grupo: chave, atraso: 600 + i * 1500 }));
    });
  }
  function civisFogem() {
    for (const k of ['dono_bar', 'frequentador_a', 'frequentador_b']) {
      const n = npcs[k]; if (!n || n.userData.caido || n.userData.fugiu) continue;
      n.userData.fugiu = true;
      rota(n, [[n.position.x - 2, n.position.z + 2], ...FUGA.bar.slice(2)], 3.4, 'correndo', () => { n.visible = false; });
    }
  }
  const reservaCarga = () => (A.barFeito ? 0 : 2) + (A.depFeito ? 0 : 3) + (S.variacao.carga_local !== 'deposito' && !A.pistaFeito ? 3 : 0);
  const VC = new THREE.Vector3();
  function cargaQuadro(agora) {
    const v = S.variacao; camera.getWorldPosition(VC);
    const perto = (L, r) => Math.hypot(VC.x - L[0], VC.z - L[2]) < r && Math.abs(VC.y - 1.6 - L[1]) < 9;
    if (!A.barFeito && perto(LOC.bar.alvo, 20)) { A.barFeito = true; defesa('bar', 2); civisFogem(); radio(CEN.radio.carga_bar); }
    if (!A.depFeito && perto(LOC.carga.alvo, 20)) { A.depFeito = true; defesa('deposito', Math.random() < .5 ? 3 : 2); }
    if (A.pista && !A.pistaFeito && perto(LOC[A.pista].alvo, 20)) { A.pistaFeito = true; registrar('seguir_pista'); defesa(A.pista, Math.random() < .5 ? 3 : 2, 'pista'); }
    for (const g of ['deposito', 'pista']) {
      const gr = A.grupos[g]; if (!gr || A.limpo[g] || !gr.every(n => n.userData.caido || n.userData.rendido || n.userData.saiu)) continue;
      A.limpo[g] = true;
      if (g === 'deposito') { A.entrou = true; registrar('entrada_flagrante'); dica(v.carga_local === 'deposito' ? 'Depósito seguro (flagrante e agressão armada: entrada legítima). Ache a carga e lacre (clique nos objetos).' : 'Depósito seguro. A carga não está à vista: procure pistas nos objetos da mesa (clique neles).', 8); }
      else dica('Local seguro. Ache a carga e lacre (clique nela).', 6);
    }
    if (emCena().length) { A.ultEmb = agora; A.posEmb.copy(VC); return; }
    // emboscadas no caminho: so em deslocamento, fora dos locais, e guardando bandidos para os locais
    if ((A.depFeito && !A.pista) || A.pistaFeito) return;
    const prox = A.pista ? LOC[A.pista].alvo : LOC.carga.alvo;
    if (perto(prox, 30) || perto(LOC.bar.alvo, 26) && !A.barFeito) return;
    const andou = Math.hypot(VC.x - A.posEmb.x, VC.z - A.posEmb.z);
    if (agora - A.ultEmb > (A.nEmb ? 11000 : 4000) && andou > (A.nEmb ? 16 : 5) && livres().length - reservaCarga() > 0) {
      if (!emboscada(Math.min(livres().length - reservaCarga(), Math.random() < .45 ? 2 : 1))) { A.ultEmb = agora - 8000; }      // nenhum ponto bom aqui: tenta de novo logo
    }
  }
  function pistaCarga(k) {                                        // objeto com pista: leva a carga para outro local
    const v = S.variacao; if (v.missao !== 'carga' || !PISTA[k] || v.carga_local === 'deposito') return null;
    if (!A.pista) {
      A.pista = v.carga_local; LOC.pista = LOC[v.carga_local];
      const L = LOC[A.pista]; marcador.position.copy(PT(L.alvo[0], L.alvo[1], L.alvo[2])); marcador.visible = S.modo === 'treino';
      setTimeout(() => radio(CEN.radio.carga_pista), 1500); A.ultEmb = performance.now(); A.posEmb.copy(VC);
    }
    return PISTA[k][v.carga_local];
  }
  function cargaApreendida(k) {
    const v = S.variacao; if (v.missao !== 'carga' || A.cargaOk || !CARGA[v.carga_local].every(c => A.apreendidos.has(c))) return;
    A.cargaOk = true; registrar('carga_recuperada'); radio(CEN.radio.carga_ok); status();
  }
  function avaliarCarga() {
    const sol = atacantes().filter(n => n.userData.emCena), caidos = sol.filter(n => n.userData.caido || n.userData.rendido);
    if (sol.length && caidos.length >= sol.length * .7) registrar('neutralizar_emboscadas');
    if (!S.graves.some(g => /disparo_injustificado|tiro_com_civis/.test(g.id))) registrar('controle_disparos');
  }

  function criarSniper(v) {
    criarAtacantes();
    // equipe esperando no pe da escada da praca
    for (const [k, x, z] of [['parceiro', 4.2, 21.6], ['apoio', 3.4, 22.4]]) { const n = novoNPC(k, x, 9, z, olharPara(1, -1)); n.userData.equipe = true; }
    const vd = novoNPC('vendedor', 11.2, 9.5, 15.0, olharPara(0, 1)); vd.userData.arma = armaNPC2;
    novoNPC('dono_bar', 15.9, 9.5, 15.1, olharPara(-1, .3));
    novoNPC('frequentador_a', 8.5, 9.5, 16.3, olharPara(1, -.4)); novoNPC('frequentador_b', 7.4, 9.5, 15.2, olharPara(1, 0));
    if (v.sniper_cena === 'dois') { const cm = novoNPC('comparsa', 15.0, 9.5, 16.6, olharPara(-1, .5)); cm.userData.arma = armaNPC; }
    mostrarTipo(armaNPC, 'pistola'); mostrarTipo(armaNPC2, 'pistola');
    malhasPraca = null;
    // refem: antes da entrada, o armado agarra a frequentadora e aponta para ela
    if (v.sniper_cena === 'refem') setTimeout(() => {
      if (!A) return; const r = npcs.frequentador_b, n = npcs.vendedor; if (!r || !n) return;
      rota(n, [[7.9, 15.85]], 1.6, 'andando', () => {      // atras e um pouco ao lado da refem: cabeca e ombro expostos para quem esta na laje
        n.userData.arma.visible = true; n.userData.ameaca = true; n.userData.atira = false; n.userData.base = 'apontando'; animar(n, 'apontando', 1e6, .2);
        n.rotation.y = olharPara(r.position.x - n.position.x, r.position.z - n.position.z); n.userData.semVirar = true; n.userData.giroBase = n.rotation.y;
        n.userData.alvoMira = r.position.clone().setY(r.position.y + 1.55);      // aponta para a cabeca da refem
        r.userData.base = 'nervoso'; animar(r, 'nervoso', 1e6, .2); diz(r, F('frequentador_b_refem')); sincAmeaca(); status();
      });
    }, 9000);
  }
  function relatarSniper() {
    const v = S.variacao, certo = { ninguem: 'ninguem', rende: 'um', refem: 'refem', dois: 'dois' }[v.sniper_cena];
    painelOpc('Rádio · atirador', 'O que você vê pela luneta?', CEN.dialogos.relatorio_sniper, op => {
      A.relatou = true;
      if (op.id === certo || (v.sniper_cena === 'refem' && !A.refemVisto && op.id === 'um')) registrar('relatorio_visual'); else registrar('relatorio_errado', op.id);
      radio('Ciente, atirador. Equipe aguardando sua liberação.').then(() => dica('Quando quiser, libere a entrada da equipe pelo rádio (menu).', 6));
    }, 'Olhe com calma: mãos, cintura, quem está perto de quem.');
  }
  function entradaEquipe() {
    if (!A || A.equipeEntrou) return; A.equipeEntrou = true; clearTimeout(A.tEntrada);
    radio(CEN.radio.sniper_entrada); clearTimeout(A.tAtaque); ataqueLaje();
    const dest = { parceiro: [[5.6, 18.6], [8.6, 17.4]], apoio: [[5.0, 19.2], [9.8, 16.9]] };
    let chegaram = 0;
    for (const k of ['parceiro', 'apoio']) { const n = npcs[k]; if (!n) continue; n.userData.base = 'parada'; rota(n, dest[k], 1.9, 'andando', () => { n.userData.base = 'apontando'; animar(n, n.userData.acoes?.apontando ? 'apontando' : 'parada', 1e6, .2); if (++chegaram === 2) reacaoPraca(); }); }
    status();
  }
  function reacaoPraca() {
    const v = S.variacao, n = npcs.vendedor; if (!A || !n) return;
    if (v.sniper_cena === 'ninguem') { animar(n, 'nervoso', 1e6, .2); n.userData.base = 'nervoso'; diz(n, F('vendedor_celular')); setTimeout(() => renderNPC(n), 2500); return; }
    if (v.sniper_cena === 'rende') { diz(n, F('vendedor_rende')).then(() => renderNPC(n)); return; }
    // refem e dois: os armados apontam para a equipe; sem reacao do atirador em ~6 s, um policial e atingido
    const armados = [n, ...(npcs.comparsa ? [npcs.comparsa] : [])];
    for (const a of armados) {
      if (a.userData.caido || a.userData.rendido) continue;
      a.userData.arma.visible = true; a.userData.ameaca = true; a.userData.atira = false; a.userData.semVirar = true;
      a.rotation.y = olharPara(npcs.parceiro.position.x - a.position.x, npcs.parceiro.position.z - a.position.z); a.userData.giroBase = a.rotation.y;
      a.userData.alvoMira = npcs.parceiro.position.clone().setY(npcs.parceiro.position.y + 1.4);      // aponta para a equipe
      a.userData.base = 'apontando'; animar(a, 'apontando', 1e6, .2);
    }
    diz(npcs.comparsa || n, F('comparsa_atira') || F('vendedor_atira'), null); sincAmeaca(); status();
    A.tEquipe = setTimeout(() => {
      if (!A || !ameacaPraca().length) return;
      const p = npcs.parceiro, atirador = ameacaPraca()[0]; somTiro(); if (atirador.userData.arma?.userData.flash) acenderFlash(atirador.userData.arma.userData.flash);
      registrar('equipe_atingida'); radio(CEN.radio.sniper_atingido);
      p.userData.caido = true; cair(p); A.ferido = p; S.variacao.ferido = 'sim';
      setTimeout(() => { for (const a of ameacaPraca()) renderNPC(a, true); }, 1800);      // o apoio contem os armados
      status();
    }, 6500);
  }
  function sniperQuadro() {
    if (A.tEquipe && A.equipeEntrou && !ameacaPraca().length && !A.contido) {          // ameaca neutralizada: equipe avanca e prende
      A.contido = true; clearTimeout(A.tEquipe);
      setTimeout(() => radio('Ameaça contida. Equipe no controle da praça.'), 800);
    }
    if (S.variacao.sniper_cena === 'refem' && npcs.vendedor?.userData.ameaca) A.refemVisto = true;
    if (A.grupoOnda?.length && !A.trocandoOnda && A.grupoOnda.every(n => n.userData.caido || n.userData.rendido || n.userData.saiu)) {
      if (A.onda < A.ondas.length - 1) { A.trocandoOnda = true; setTimeout(() => { if (A) { A.trocandoOnda = false; proximaOnda(); } }, 6000); }
      else if (!A.atiradoresOk) { A.atiradoresOk = true; registrar('neutralizar_atiradores'); radio('Ciente, atirador. Sem mais disparos contra a laje.'); }
    }
  }
  function avaliarSniper() {
    const v = S.variacao, ruins = S.graves.some(g => /disparo_injustificado|tiro_com_civis/.test(g.id));
    const praca = Object.values(npcs).filter(n => !n.userData.atacante && !n.userData.equipe);
    const tiroNaPraca = praca.some(n => n.userData.caido);
    if ((v.sniper_cena === 'refem' || v.sniper_cena === 'dois') && !ruins && praca.filter(n => n.userData.arma).every(n => n.userData.caido || n.userData.rendido) && !S.erros.some(e => e.id === 'equipe_atingida')) registrar('tiro_preciso');
    if ((v.sniper_cena === 'ninguem' || v.sniper_cena === 'rende') && !tiroNaPraca && !ruins) registrar('conter_sem_disparo');
  }

  /* ================= encerramento ================= */
  function certoEnquadramento() {
    const v = S.variacao;
    if (v.missao === 'deposito') return A.entrou && v.deposito_indicios === 'visiveis' ? 'trafico' : 'mandado';
    if (v.missao === 'residencia') return v.morador === 'tranca' ? 'crise' : v.morador === 'recusa' && !A.entrou ? 'mandado' : v.arma_casa === 'fuzil' ? 'posse_16' : 'posse_12';
    if (v.missao === 'bar') return 'trafico';
    if (v.missao === 'carga') return 'trafico';
    if (v.missao === 'sniper') return v.sniper_cena === 'ninguem' ? 'nenhum' : v.sniper_cena === 'rende' ? 'sem_disparo' : 'disparo_legitimo';
    return v.moto === 'regular' ? 'liberar' : 'adulteracao';
  }
  function decidirFinal() {
    const v = S.variacao, certo = certoEnquadramento();
    if (v.missao === 'sniper') avaliarSniper();
    if (v.missao === 'carga') avaliarCarga();
    painelOpc('Rádio · encerramento', 'Enquadramento da ocorrência', CEN.dialogos.enquadramento[v.missao], op => {
      A.decidiu = true;
      if (op.id === certo) registrar('enquadramento_correto');
      else if (op.id === 'todos' || (v.missao === 'oficina' && op.id === 'adulteracao' && certo === 'liberar')) registrar('prisao_indevida');
      else registrar('enquadramento_errado', op.id);
      if (S.modo === 'treino') legenda('Instrutor', op.id === certo ? 'Correto.' : 'O correto aqui: ' + CEN.dialogos.enquadramento[v.missao].find(o => o.id === certo)?.fala, 8);
      setTimeout(() => painelOpc('Encerramento', 'Registro', CEN.dialogos.registro, () => { radio(CEN.radio.final); setTimeout(finalizar, 5000); }, '', false), S.modo === 'treino' ? 4200 : 400);
    }, 'Resumo: ' + CEN.nomes_variacao.missao[v.missao]);
  }
  function finalizar() {
    if (!A || A.fase === 'fim') return;
    A.fase = 'fim'; fecharPaineis();
    if (A.ferido && !A.socorro) registrar('omissao_socorro');
    sacar(false); status(); setTimeout(concluir, 1500);
  }
  function resumo() {
    const fases = [];
    for (const f of CEN.fases) {
      let fp = 0, fo = 0; const its = [];
      for (const a of f.acoes || []) {
        if (!cond(a.condicao)) continue;
        fp += a.pontos; const ok = S.feitos.has(a.id); if (ok) fo += a.pontos;
        its.push({ texto: a.texto, ok, pontos: ok ? a.pontos : 0, base: a.base, atendimento: A.n });
      }
      fases.push({ nome: f.nome, obtidos: fo, possiveis: fp, itens: its });
    }
    return { n: A.n, titulo: A.titulo, variacao: { ...S.variacao }, fases };
  }
  function concluir() {
    if (!A) return;
    HIST.push(resumo()); A = null;
    if (!S.ativo) return;
    if (S.fila.length) {
      const prox = S.fila.shift(), v = derivar({ ...sortear(), ...prox.variacao }), papeis = papeisDaMissao(v).map(k => PAPEL[k][0]);
      carregarPapeis(papeis).then(() => aquecer(papeis)).then(() => setTimeout(() => novaOcorrencia(v, S.historia ? prox : null), 400));
    }
    else encerrar();
  }

  /* ================= inicio, menu e relatorio ================= */
  function aviso() {
    fecharPaineis();
    menu.mostrar({
      tag: 'Treinamento · conteúdo sensível · versão ' + (window.__versao || '?'), titulo: 'Favela · denúncias na comunidade',
      texto: 'Duas missões de confronto. Recuperar a carga: suba até o depósito sob emboscadas, passando pelo bar da praça, e siga as pistas até a droga. Sniper: dê cobertura da laje à equipe que entra no bar, sob tiros de lajes e becos.\n\n' +
        'Há cenas de confronto armado, com disparos e sangue em adultos.\n' +
        'Computador: clique fala/usa · T menu · Q saca ou guarda a arma (com ela na mão, o clique dispara) · R recarrega · E granada · 1/2/3 troca a arma · K checklist.\n' +
        'Quest: gatilho usa/clica · A saca a arma (gatilho direito dispara, apertar o analógico direito recarrega) · X troca a arma · granada pelo menu (segure o gatilho esquerdo, faça o movimento e solte) · Y ou B abre o menu.',
      botoes: [
        { label: 'Missão: recuperar a carga (com dicas)', acao: () => comecar('carga') },
        { label: 'Missão de sniper (cobertura da praça, com dicas)', acao: () => comecar('sniper') },
        { label: 'Modo história (as duas missões em sequência)', acao: () => comecar('historia') },
        { label: 'Modo avaliação (sorteia uma, sem dicas)', acao: () => comecar('avaliacao') },
        { label: S.voz === false ? 'Voz sintética: desligada (só legendas)' : 'Voz sintética: ligada', acao: () => { S.voz = S.voz === false; aviso(); } },
        { label: 'Cancelar', acao: () => menu.esconder() }
      ]
    });
  }
  /* prepara materiais e texturas dos personagens e armas ANTES de aparecerem (no Quest o primeiro quadro com eles
     travava ~0,4 s: compilar os shaders e enviar as texturas para a placa de video). Roda atras da tela de carregamento. */
  async function aquecer(papeis) {
    const tmp = new THREE.Group(); camera.getWorldPosition(V); camera.getWorldDirection(V2); tmp.position.copy(V).addScaledVector(V2, 3);
    for (const p of new Set(papeis)) {
      const b = modelos[p]; if (!b) continue;
      const c = SkeletonUtils.clone(b.scene);
      c.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = Array.isArray(o.material) ? o.material.map(m => ctx.iluminar(m.clone())) : ctx.iluminar(o.material.clone()); } });
      tmp.add(c);
    }
    for (const grp of [...ARMAS_NPC, armaCasa]) for (const c of grp.children) if (c.userData.tipo) { const k = c.clone(); k.visible = true; k.traverse(o => { o.visible = true; o.frustumCulled = false; }); tmp.add(k); }
    tmp.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) renderer.initTexture(m[k]); });
    scene.add(tmp);
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { }
    renderer.render(scene, camera);                             // um quadro com tudo, escondido atras do painel de carregamento
    scene.remove(tmp);
  }
  async function comecar(modo) {
    fecharPaineis();
    Object.assign(S, { historia: modo === 'historia', modo: modo === 'avaliacao' ? 'avaliacao' : 'treino' });
    const v0 = S.historia ? derivar({ ...sortear(), ...CEN.historia[0].variacao }) : modo === 'sniper' || modo === 'carga' ? derivar({ ...sortear(), missao: modo }) : sortear();
    window.__som?.carregarFalas?.(['fala_radio', 'fala_parceiro', 'fala_apoio']);      // vozes so agora (na abertura travava o Quest); radio e equipe primeiro
    menu.mostrar({ tag: 'Treinamento', titulo: 'Carregando personagens…', texto: 'Aguarde alguns segundos.', botoes: [] });
    await Promise.race([Promise.all([carregarPapeis(papeisDaMissao(v0).map(k => PAPEL[k][0])), itensProntos]), new Promise(r => setTimeout(r, 40000))]);
    await aquecer(papeisDaMissao(v0).map(k => PAPEL[k][0]));
    menu.esconder();
    HIST.length = 0;
    Object.assign(S, { ativo: true, inicio: performance.now(), fim: 0, erros: [], graves: [], log: [] });
    S.fila = S.historia ? CEN.historia.slice(1) : [];
    document.getElementById('relatorioHTML')?.setAttribute('hidden', '');
    novaOcorrencia(v0, S.historia ? CEN.historia[0] : null);
  }
  function abrirMenu() {
    if (!S.ativo) return aviso();
    fecharPaineis();
    const b = [], v = S.variacao, susp = A && npcs[S.variacao.suspeitoChave];
    if (A && !A.chegada) b.push({ label: 'Rádio: informar a chegada à comunidade', acao: () => falarRadio('chegada') });
    if (A && v.missao === 'sniper' && !A.relatou) b.unshift({ label: 'Rádio: informar o que vejo pela luneta', acao: relatarSniper });
    if (A && v.missao === 'sniper' && A.relatou && !A.equipeEntrou) b.unshift({ label: 'Rádio: liberar a entrada da equipe', acao: () => { menu.esconder(); entradaEquipe(); } });
    if (A && !A.apoio && v.missao !== 'sniper') b.push({ label: 'Rádio: pedir apoio', acao: () => falarRadio('apoio') });
    if (A?.fugiu && !A.comunicouFuga) b.push({ label: 'Rádio: comunicar a fuga (direção e características)', acao: () => falarRadio('fuga') });
    if (A?.ferido && !A.socorro) b.push({ label: 'Rádio: pedir socorro médico e comunicar o disparo', acao: () => { fecharPaineis(); A.socorro = true; registrar('socorro'); radio(CEN.radio.socorro); } });
    if (A?.chegou && !A.decidiu) b.push({ label: 'Rádio: enquadramento e condução (encerrar a ocorrência)', acao: decidirFinal });
    if (susp?.userData.fugindo) b.unshift({ label: 'Ordenar: "Parado! Polícia!"', acao: () => { menu.esconder(); ordemVerbal(susp); } });
    if (S.armaNaMao) b.push({ label: `Recarregar a arma (${S.municao ?? CARREGADOR}/${CARREGADOR})`, acao: () => { menu.esconder(); recarregar(); } });
    b.push({ label: renderer.xr.isPresenting ? (S.granadaNaMao ? 'Guardar a granada' : `Pegar granada de efeito moral (${S.granadas ?? 2})`) : `Lançar granada de efeito moral (${S.granadas ?? 2}) · tecla E`, acao: () => { menu.esconder(); renderer.xr.isPresenting ? pegarGranada(!S.granadaNaMao) : arremessar(); } });
    b.push({ label: S.armaNaMao ? 'Guardar a arma' : 'Sacar a arma', acao: () => { sacar(!S.armaNaMao); menu.esconder(); } },
      ...ORDEM_ARMAS.filter(t => t !== S.armaTipo).map(t => ({ label: 'Trocar para: ' + NOME_ARMA[t].toLowerCase(), acao: () => { menu.esconder(); trocarArma(t); } })),
      { label: 'Checklist desta ocorrência', acao: abrirChecklist },
      { label: 'Encerrar e ver o relatório', cor: 'rgba(240,80,64,.22)', acao: encerrar },
      { label: 'Fechar', acao: () => menu.esconder() });
    menu.mostrar({ tag: 'Menu', titulo: 'Favela', texto: `Tempo: ${fmt(tempo())} · ${A ? A.titulo : 'aguardando'}` + (A && v ? `\nDestino: ${LOC[v.missao].nome}` : ''), botoes: b });
  }
  function abrirChecklist() {
    fecharPaineis();
    const linhas = CEN.fases.map(f => `${f.nome}: ` + (f.acoes || []).filter(a => cond(a.condicao)).map(a => (S.feitos.has(a.id) ? '✓ ' : '· ') + a.texto).join(' | ')).join('\n');
    menu.mostrar({ tag: 'Checklist', titulo: 'Checklist da ocorrência', texto: (S.modo === 'avaliacao' ? 'No modo avaliação o checklist só aparece no relatório.' : linhas) + `\n\nTempo: ${fmt(tempo())}`, botoes: [{ label: 'Fechar', acao: () => menu.esconder() }], longe: 1.3 });
  }
  function encerrar() {
    if (!S.ativo) return;
    if (A) { if (A.ferido && !A.socorro) registrar('omissao_socorro'); HIST.push(resumo()); A = null; }
    S.fila = []; S.fim = performance.now(); S.ativo = false; fecharPaineis(); sacar(false); marcador.visible = false; status();
    mostrarRelatorio(relatorio());
  }
  function relatorio() {
    let possiveis = 0, obtidos = 0; const fases = [];
    CEN.fases.forEach((f, i) => {
      const fr = { nome: f.nome, obtidos: 0, possiveis: 0, itens: [] };
      for (const h of HIST) { const x = h.fases[i]; fr.obtidos += x.obtidos; fr.possiveis += x.possiveis; fr.itens.push(...x.itens); }
      possiveis += fr.possiveis; obtidos += fr.obtidos; fases.push(fr);
    });
    const desc = S.erros.reduce((s, e) => s + e.pontos, 0) + S.graves.reduce((s, e) => s + e.pontos, 0);
    const nota = possiveis ? Math.max(0, Math.round((obtidos + desc) / possiveis * 100)) : 0;
    const aprovado = nota >= CEN.aprovacao.pontos_minimos && !(CEN.aprovacao.sem_falha_grave && S.graves.length);
    return { cenario: CEN.id, data: new Date().toISOString(), tempo: fmt(tempo()), modo: S.historia ? 'historia' : S.modo, nota, aprovado, obtidos, descontos: desc, possiveis,
      atendimentos: HIST.map(h => ({ n: h.n, titulo: h.titulo, variacao: h.variacao })), fases, erros: S.erros, falhas_graves: S.graves, linha_do_tempo: S.log };
  }
  function mostrarRelatorio(r) {
    const varios = r.atendimentos.length > 1, at = e => varios ? ` [ocorr. ${e.atendimento}]` : '';
    const txtFases = r.fases.map(f => `${f.nome}: ${f.obtidos}/${f.possiveis}`).join('\n');
    const txtErros = [...r.falhas_graves.map(g => '⚠ FALHA GRAVE: ' + g.texto + (g.base ? ` (${g.base})` : '') + at(g)), ...r.erros.map(e => `• ${e.texto} (${e.pontos})${e.feedback ? ' — ' + e.feedback : ''}` + at(e))].join('\n') || 'Nenhum erro registrado.';
    menu.mostrar({
      tag: 'Relatório', titulo: `Nota ${r.nota}/100 · ${r.aprovado ? 'APROVADO' : 'NÃO APROVADO'}`,
      texto: `Tempo: ${r.tempo} · Ocorrências: ${r.atendimentos.length}\n\n${txtFases}\n\n${txtErros}`,
      botoes: [{ label: 'Novo treinamento (outras variações)', acao: () => { fecharPaineis(); cenaExploracao(); aviso(); } }, { label: 'Fechar', acao: () => { menu.esconder(); cenaExploracao(); } }], longe: 1.4
    });
    const el = document.getElementById('relatorioHTML');
    if (el) {
      const NV = CEN.nomes_variacao;
      const nomeVar = v => Object.keys(NV).filter(k => v[k] && (k === 'missao' || k === 'evento' || relevante(k, v))).map(k => NV[k][v[k]]).join(' · ');
      const leis = Object.entries(CEN.base_legal).filter(([k]) => k !== '_nota').map(([k, t]) => `<li><b>${k}</b> — ${t}</li>`).join('');
      el.innerHTML = `<h2>Nota ${r.nota}/100 — ${r.aprovado ? 'aprovado' : 'não aprovado'}</h2>
        <p>Tempo ${r.tempo} · modo ${r.modo}</p>
        <ul>${r.atendimentos.map(a => `<li>${a.titulo} — <em>${nomeVar(a.variacao)}</em></li>`).join('')}</ul>
        ${r.fases.map(f => `<h3>${f.nome} <small>${f.obtidos}/${f.possiveis}</small></h3><ul>${f.itens.map(i => `<li class="${i.ok ? 'ok' : 'nao'}">${i.ok ? '✓' : '✗'} ${i.texto}${varios ? ` [ocorr. ${i.atendimento}]` : ''}${i.base ? ` <em>(${i.base})</em>` : ''}</li>`).join('')}</ul>`).join('')}
        <h3>Erros e falhas graves</h3><ul>${txtErros.split('\n').map(l => `<li>${l}</li>`).join('')}</ul>
        <h3>Base legal</h3><ul>${leis}</ul>
        <p><em>Rascunho para validação com instrutores. Os itens marcados “validar” dependem de norma interna e de jurisprudência atualizada.</em></p>
        <p><button type="button" id="baixarRel">Baixar relatório (JSON)</button> <button type="button" id="fecharRel">Fechar</button></p>`;
      el.hidden = false;
      document.getElementById('baixarRel').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })); a.download = `relatorio_${r.cenario}_${Date.now()}.json`; a.click(); };
      document.getElementById('fecharRel').onclick = () => el.hidden = true;
    }
  }
  function relevante(k, v) {
    const m = v.missao;
    return ({ carga_local: m === 'carga', sniper_cena: m === 'sniper', suspeito: !/residencia|carga|sniper/.test(m), deposito_indicios: m === 'deposito', morador: m === 'residencia', familia: m === 'residencia', arma_casa: m === 'residencia',
      frequentador: m === 'bar', moto: m === 'oficina', dono_oficina: m === 'oficina' })[k];
  }

  /* ================= modo livre (antes de iniciar) ================= */
  function cenaExploracao() {
    limparNPCs(); S.vida = 3; S.municao = CARREGADOR; limparSangue(); marcador.visible = false;
    for (const it of Object.values(itens)) { it.o.visible = true; it.h.visible = true; }
    armaCasa.visible = false; for (const g of ARMAS_NPC) g.visible = false;
  }
  function explorar(ray) {
    const hi = ray.intersectObjects(hitsItem.filter(h => h.visible), false)[0];
    if (hi && hi.distance < 4.5) { const it = itens[hi.object.userData.item]; legenda(it.nome, it.texto, 5); return true; }
    return false;
  }

  /* ================= clique / gatilho ================= */
  const npcVisiveis = () => Object.values(npcs).filter(n => n.visible);
  function usar(ray, c) {
    if (!c && rajada.engoliClique) { rajada.engoliClique = false; return true; }
    if (mirando && !c) ray.setFromCamera(new THREE.Vector2(0, 0), camera);      // olhando pela luneta: o tiro vai para o centro
    for (const p of paineis) if (p.clique(ray)) return true;
    if (S.armaNaMao && (!c || c.userData.mao !== 'left')) {
      // com a arma na mao, clicar em quem foge (ou ameaca) da a ordem verbal primeiro; o segundo clique dispara
      const susp = A && npcs[S.variacao.suspeitoChave];
      if (S.variacao.missao !== 'sniper' && susp?.visible && (susp.userData.fugindo || susp.userData.ameaca) && !susp.userData.ordem && !susp.userData.ordemDada) {
        const h = ray.intersectObject(susp.userData.hit, false)[0];
        if (h && h.distance < 25) { susp.userData.ordemDada = true; ordemVerbal(susp); return true; }
      }
      return disparar(ray);
    }
    if (!S.ativo) return explorar(ray);
    if (!A || A.fase === 'fim') return false;
    const hn = ray.intersectObjects(npcVisiveis().map(n => n.userData.hit), false)[0];
    const alvosI = [...hitsItem.filter(h => h.visible), ...(armaCasa.visible ? [hitArmaCasa] : []), ...(armaSolta.visible || armaSolta2.visible || armaSolta3.visible ? [hitArma] : [])];
    const hi = ray.intersectObjects(alvosI, false)[0];
    if (hn && hn.distance < 25 && (!hi || hn.distance < hi.distance)) {
      const n = Object.values(npcs).find(p => p.userData.hit === hn.object), k = n.userData.chave, u = n.userData;
      if (u.fugindo && hn.distance < 25) return ordemVerbal(n), true;
      if (hn.distance > 5) return false;
      if (u.caido) { painelOpc('Ferido', 'Pessoa baleada', CEN.dialogos.socorro, op => { if (op.acao) { A.socorro = true; radio(CEN.radio.socorro); } }); return true; }
      if (k === 'parceiro') menuParceiro();
      else if (k === 'apoio') diz(n, F('apoio'));
      else if (u.evento) menuEvento(n);
      else if (u.ameaca) ordemVerbal(n);
      else if (k === 'vigia') (u.rendido ? menuAlgemas(n) : menuDeposito());
      else if (k === 'morador') menuMorador(n);
      else if (k === 'mulher' || k === 'filho') (A.familiaFora ? diz(n, F('mulher')) : familia());
      else if (S.variacao.missao === 'bar') menuBar(n);
      else if (k === 'dono_oficina') menuOficina(n);
      return true;
    }
    if (hi && hi.distance < 4) {
      const k = hi.object.userData.item;
      if (k === 'arma') usarItem('arma_chao'); else usarItem(k);
      return true;
    }
    // porta do deposito: clicar perto da porta tambem abre a abordagem
    if (A.chegou && S.variacao.missao === 'deposito' && !A.decidiuEntrada) {
      const h = ray.intersectObjects(ctx.colisao(), false)[0];
      if (h && h.distance < 5 && h.point.distanceTo(new THREE.Vector3(...LOC.deposito.alvo)) < 4) { menuDeposito(); return true; }
    }
    return false;
  }
  function arremessar(c) {                                     // computador: granada sai da altura do peito, na direcao do olhar
    const o = new THREE.Vector3(), d = new THREE.Vector3(), fonte = (c && renderer.xr.isPresenting) ? c : camera;
    fonte.getWorldPosition(o); fonte.getWorldDirection(d); if (fonte !== camera) d.negate();
    if (fonte === camera) o.y -= .15;
    lancarGranada(o, d);
  }
  function botao(mao) { if (mao === 'right') sacar(!S.armaNaMao); else trocarArma(); }

  /* ================= objetivos (modo treino) e status ================= */
  function objetivos() {
    const L = [], v = S.variacao;
    if (!A) return ['Aguarde a próxima ocorrência'];
    if (A.fase === 'fim') return ['Ocorrência concluída'];
    if (A.ameaca) return ['Agressão armada: abrigue-se e reaja de forma proporcional', `Sua condição: ${S.vida ?? 3} de 3`];
    if (A.ferido && !A.socorro) L.push('Peça socorro médico pelo rádio (menu)');
    if (!A.chegada) L.push('Informe a chegada pelo rádio (menu)');
    if (!A.plano) L.push('Combine o deslocamento com o parceiro');
    if (v.missao === 'sniper') {
      if (!A.relatou) L.push('Observe a praça pela luneta e informe pelo rádio o que vê (menu)');
      else if (!A.equipeEntrou) L.push('Libere a entrada da equipe pelo rádio (menu)');
      else if (ameacaPraca().length) L.push('Ameaça contra a equipe: dispare só no armado, sem civil na linha');
      if (atacantes().some(n => n.visible && n.userData.ameaca && !n.userData.caido)) L.push('Tiros contra a laje: abaixe atrás da mureta e ache os atiradores (lajes e becos)');
      if (A.ferido && !A.socorro) L.push('Peça socorro pelo rádio (menu)');
      if (A.equipeEntrou && !ameacando().length && !A.decidiu) L.push('Encerre pelo rádio: enquadramento (menu)');
      return L.slice(0, 6);
    }
    if (v.missao === 'carga') {
      if (emCena().some(n => n.visible)) L.push('Tiros! Abrigue-se, ache o atirador e reaja (sem civil na linha)');
      if (!A.limpo.deposito) L.push(`Suba até: ${LOC.carga.nome}${S.modo === 'treino' ? ' (coluna âmbar)' : ''}`);
      else if (!A.cargaOk) L.push(!A.pista ? (v.carga_local === 'deposito' ? 'Ache a carga no depósito e lacre' : 'A carga não está aqui: procure pistas nos objetos da mesa') : !A.limpo.pista ? `Siga a pista até: ${LOC[A.pista].nome}` : 'Ache a carga e lacre');
      if (A.ferido && !A.socorro) L.push('Peça socorro pelo rádio (menu)');
      if (A.cargaOk && !A.decidiu) L.push('Encerre pelo rádio: enquadramento (menu)');
      return L.slice(0, 6);
    }
    if (!A.chegou) { L.push(`Suba até: ${LOC[v.missao].nome} (coluna âmbar)`); if (!A.eventoFeito) L.push('Atenção às pessoas no caminho'); return L.slice(0, 6); }
    if (v.missao === 'deposito') { if (!A.anunciou) L.push('Observe da porta e anuncie a polícia'); else if (!A.decidiuEntrada) L.push('Decida se pode entrar'); else if (A.entrou) L.push('Apreenda e lacre o material (clique em cada item)'); }
    if (v.missao === 'residencia') { if (!A.anunciou) L.push('Fale com o morador'); else if (A.entrou && armaCasa.visible) L.push('Apreenda a arma no quarto do casal'); if (v.familia === 'mulher_crianca' && !A.familiaFora && A.anunciou) L.push('Tire a mulher e a criança da área de risco'); }
    if (v.missao === 'bar') { if (!A.anunciou) L.push('Afaste os frequentadores e anuncie a polícia'); else L.push('Apreenda o material do balcão'); }
    if (v.missao === 'oficina') { if (!A.anunciou) L.push('Fale com o dono da oficina'); else if (!A.conferiu && v.dono_oficina !== 'foge') L.push('Confira documento e chassi'); }
    const susp = npcs[v.suspeitoChave];
    if (susp?.userData.rendido && !A.preso) L.push('Decida sobre as algemas (clique nele)');
    if (A.fugiu && !A.comunicouFuga) L.push('Comunique a fuga pelo rádio (menu)');
    if (!A.decidiu) L.push('Encerre pelo rádio: enquadramento (menu)');
    return L.slice(0, 6);
  }
  function status() {
    const el = document.getElementById('statusTrein'); if (!el) return;
    el.hidden = !S.ativo || S.modo === 'treino';
    el.innerHTML = `<b>${A ? A.titulo : 'Favela'}</b> · ${fmt(tempo())}<br>Na mão: ${S.armaNaMao ? (S.recarregando ? S.armaTipo + ' (recarregando…)' : `${S.armaTipo} · ${S.municao ?? CARREGADOR}/${CARREGADOR}`) : 'nada'}`;
    mostrarObjetivos();
  }

  /* ================= quadro ================= */
  let ultimo = performance.now();
  const PV = new THREE.Vector3(), PD = new THREE.Vector3();
  function seguir(n, dt) {                                     // parceiro e apoio acompanham o policial, um pouco atras
    const u = n.userData; if (!n.visible || u.caido) return;
    camera.getWorldPosition(PV); camera.getWorldDirection(PD); PD.y = 0; PD.normalize();
    const alvo = PV.clone().addScaledVector(PD, -1.6).add(new THREE.Vector3(-PD.z, 0, PD.x).multiplyScalar(u.chave === 'apoio' ? -1 : 1));
    const d = Math.hypot(alvo.x - n.position.x, alvo.z - n.position.z);
    if (d > 25) { n.position.set(alvo.x, ALT(alvo.x, alvo.z, PV.y - 1.5), alvo.z); return; }      // teleporte do policial no Quest
    if (d > 2.4 && !u.indo) { u.indo = true; animar(n, d > 7 ? 'correndo' : 'andando', 1e6, .25); }
    if (u.indo) {
      u.vel = d > 7 ? 3.8 : 1.7; u.destino = new THREE.Vector3(alvo.x, n.position.y, alvo.z);
      if (d < 1.2) { u.indo = false; u.destino = null; animar(n, 'parada', 1e6, .3); }
    }
  }
  function quadro() {
    const agora = performance.now(), dt = Math.min(.1, (agora - ultimo) / 1000); ultimo = agora;
    if (agora > legAte) { leg.visible = false; const hl = document.getElementById('legendaHTML'); if (hl && !hl.hidden) hl.hidden = true; }
    efeitos(dt); confronto();
    if (renderer.xr.isPresenting) for (const g of ctx.grips || []) { const quer = !(g.userData.mao === 'right' && S.armaNaMao); if (g.visible !== quer) g.visible = quer; }
    camera.getWorldPosition(V);
    if (S.ativo && A && A.fase !== 'fim') {
      const v = S.variacao, L = LOC[v.missao];
      if (!A.chegou && Math.hypot(V.x - L.alvo[0], V.z - L.alvo[2]) < L.raio && Math.abs(V.y - 1.6 - L.alvo[1]) < 4) aoChegar();
      for (const k of ['parceiro', 'apoio']) if (npcs[k] && !npcs[k].userData.equipe) seguir(npcs[k], dt);
      if (v.missao === 'sniper') sniperQuadro();
      if (v.missao === 'carga') cargaQuadro(agora);
      // crianca no caminho: passar perto dela com a arma na mao, sem antes protege-la, e falha grave
      const cr = npcs.crianca_rua;
      if (cr?.visible && !A.eventoFeito && !A.criancaRisco && S.armaNaMao && V.distanceTo(cr.position) < 4) { A.criancaRisco = true; registrar('crianca_na_linha'); }
      // olheiro avisa pelo radio quando o policial se aproxima
      const ol = npcs.olheiro;
      if (ol && !A.olheiroFalou && V.distanceTo(ol.position) < 16) { A.olheiroFalou = true; window.__som?.tocar('radio_chiado', ol.position); diz(ol, F('olheiro')); }
      // a crianca chuta a bola de vez em quando
      if (cr?.visible && !cr.userData.destino && !cr.userData.rota?.length && Math.random() < dt * .25) animar(cr, 'fut_chute', 1.6, .2);
    }
    for (const n of Object.values(npcs)) {
      const u = n.userData;
      u.mixer?.update(dt);
      animarRosto(n, dt, agora);
      if (!u.caido) olhar(n, dt, V);
      ajustarAreaClique(n);
      moverNPC(n, dt);
      camera.getWorldPosition(V);
      if (u.caido || !n.visible) continue;
      const encarar = (u.ameaca && !u.semVirar) || (u.real && !u.destino && !u.semVirar && !u.rota?.length && V.distanceTo(n.position) < 3.2);
      if (encarar) { let d = Math.atan2(V.x - n.position.x, V.z - n.position.z) - n.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.rotation.y += d * Math.min(1, dt * (A?.ameaca ? 6 : 2.5)); }
      else if (u.fig && !u.fala && !u.destino && !u.rota?.length) { let d = u.giroBase - n.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.rotation.y += d * Math.min(1, dt * 1.2); }
    }
    poseFuzil();                                                // fuzil: arma no ombro e bracos por IK (depois da animacao)
    seguirArmaNPC();
    renderizarMira();
    rajadaQuadro();
    if (S.ativo && Math.floor(agora / 1000) !== Math.floor((agora - dt * 1000) / 1000)) status();
  }

  /* ================= entradas ================= */
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.repeat) return;
    if (e.code === 'KeyT') abrirMenu();
    if (e.code === 'KeyK' && S.ativo) abrirChecklist();
    if (e.code === 'KeyQ' && !e.shiftKey) sacar(!S.armaNaMao);
    if (e.code === 'KeyR') recarregar();
    if (e.code === 'Digit1') trocarArma('pistola');
    if (e.code === 'Digit2') trocarArma('fuzil');
    if (e.code === 'Digit3') trocarArma('sniper');
    if (e.code === 'KeyX') trocarArma();
    if (e.code === 'KeyZ') mirar(!mirando);
    if (e.code === 'KeyE') arremessar();
  });
  const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = 'Iniciar treinamento'; bt.id = 'bTrein';
  bt.onclick = aviso; document.getElementById('acoes')?.prepend(bt);

  window.__trein = {
    clique: ray => usar(ray), gatilho: (ray, c) => { if (c) c.userData.apertado = true; return usar(ray, c); }, botao, recarregar,
    soltar: c => { if (c) c.userData.apertado = false; soltar(c); },
    apontar, painelAberto: () => paineis.some(p => p.mesh.visible),
    menu: abrirMenu, quadro, estado: S, relatorio, trocarArma, mirar,
    _t: { comecar, encerrar, objetivos, sortear, derivar, novaOcorrencia, npcs, itens, usarItem, sacar, disparar, falarRadio, menuParceiro, menuEvento, menuDeposito, menuMorador, menuBar, menuOficina,
      decidirFinal, finalizar, reagir, atacantes, ataqueLaje, proximaOnda, emboscada, defesa, pontoEmboscada, emCena, relatarSniper, entradaEquipe, reacaoPraca, trocarArma, mirar, luneta, rtMira, camMira, arma, ordemVerbal, renderNPC, usar, LOC, marcador, armaCasa, aoChegar, carregarPapeis, papeisDaMissao,
      ocorrencia: () => A, historico: HIST, botoes: () => (dialogo.mesh.visible ? dialogo : menu).botoes, painel: () => (dialogo.mesh.visible ? dialogo : menu.mesh.visible ? menu : null) }
  };
  return window.__trein;
}
