/* WildQuest AI — interactive Three.js forest scene.
   Uses a CDN build of Three.js. If WebGL/CDN is unavailable, the CSS landscape remains as fallback. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

const canvas = document.querySelector("#forest3d");
const host = document.querySelector("#heroArt");
if (canvas && host) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x102c23, 0.035);
    const camera = new THREE.PerspectiveCamera(42, Math.max(host.clientWidth / host.clientHeight, 0.1), 0.1, 120);
    camera.position.set(0, 4.3, 17);
    camera.lookAt(0, 2.6, 0);

    scene.add(new THREE.HemisphereLight(0xc6f6d0, 0x13251b, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffd7a0, 3.0);
    keyLight.position.set(-5, 10, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x78ffc1, 16, 34, 2);
    rimLight.position.set(5, 5, -3);
    scene.add(rimLight);

    const mat = (color, roughness = 0.88, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness, ...extra });

    // Distant twilight backdrop and luminous sun.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(55, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x163c31, side: THREE.BackSide })
    );
    scene.add(sky);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd99a });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), sunMat);
    sun.position.set(4.5, 7.2, -10);
    scene.add(sun);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xffbd70, transparent: true, opacity: 0.12 })
    );
    halo.position.copy(sun.position);
    scene.add(halo);

    function makeHill({ x, y, z, sx, sy, sz, color, segments = 7 }) {
      const geometry = new THREE.IcosahedronGeometry(1, 2);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const jitter = 0.92 + 0.12 * Math.sin(i * 12.9898);
        position.setXYZ(i, position.getX(i) * jitter, position.getY(i) * jitter, position.getZ(i) * jitter);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, mat(color));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      scene.add(mesh);
      return mesh;
    }
    makeHill({ x: -7, y: 1.1, z: -7, sx: 7, sy: 3.5, sz: 2.2, color: 0x2b6952 });
    makeHill({ x: 3, y: 0.4, z: -6, sx: 8, sy: 3.2, sz: 2.5, color: 0x245743 });
    makeHill({ x: 9, y: 0.7, z: -5, sx: 5.5, sy: 3.5, sz: 2.3, color: 0x34785a });
    makeHill({ x: -3, y: -1.0, z: -1.8, sx: 9, sy: 2.5, sz: 3.1, color: 0x194b38 });
    makeHill({ x: 5, y: -1.2, z: -0.4, sx: 8, sy: 2.4, sz: 3, color: 0x1c593d });

    // Faceted terrain.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 60, 28, 20),
      mat(0x153c2b)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -2.05, -4);
    scene.add(ground);

    // A tree made from a tapered trunk and stacked faceted foliage cones.
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.13, 1.2, 6);
    const leafGeo1 = new THREE.ConeGeometry(0.65, 1.5, 7);
    const leafGeo2 = new THREE.ConeGeometry(0.49, 1.25, 7);
    const leafGeo3 = new THREE.ConeGeometry(0.34, 1.0, 7);
    const trunkMat = mat(0x563b2a);
    const treeMats = [mat(0x2f8054), mat(0x3f9b62), mat(0x236a48), mat(0x5aaa6a)];
    const treeGroup = new THREE.Group();
    const treeData = [];
    function addTree(x, y, z, scale, variant = 0) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.6;
      tree.add(trunk);
      const greens = treeMats[variant % treeMats.length];
      const a = new THREE.Mesh(leafGeo1, greens); a.position.y = 1.35; tree.add(a);
      const b = new THREE.Mesh(leafGeo2, greens); b.position.y = 1.95; tree.add(b);
      const c = new THREE.Mesh(leafGeo3, greens); c.position.y = 2.48; tree.add(c);
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);
      tree.rotation.y = (variant * 0.83) % Math.PI;
      treeGroup.add(tree);
      treeData.push({ tree, phase: Math.random() * Math.PI * 2, sway: 0.012 + Math.random() * 0.018 });
    }
    // Foreground framing trees plus a varied grove.
    for (let i = 0; i < 22; i++) {
      const side = i < 11 ? -1 : 1;
      const x = side * (4.6 + Math.random() * 8.2);
      const z = -3 + Math.random() * 7;
      const scale = 0.55 + Math.random() * 1.25;
      addTree(x, -2.0 + Math.random() * 0.5, z, scale, i);
    }
    for (let i = 0; i < 28; i++) {
      addTree((Math.random() - 0.5) * 22, -1.7 + Math.random() * 0.4, -8 - Math.random() * 7, 0.45 + Math.random() * 0.9, i + 1);
    }
    scene.add(treeGroup);

    // A curved walking path made of connected low-poly stepping stones.
    const pathMat = mat(0x987d56, 1);
    for (let i = 0; i < 13; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.2, 0), pathMat);
      stone.position.set(-1.4 + Math.sin(i * 0.27) * 1.2, -1.65 + Math.random() * 0.08, 5 - i * 0.72);
      stone.scale.set(1.25, 0.17, 0.72);
      stone.rotation.y = Math.random() * 0.7;
      scene.add(stone);
    }

    // Fireflies / pollen motes, kept light enough for laptop integrated graphics.
    const moteCount = 100;
    const motePositions = new Float32Array(moteCount * 3);
    const motePhases = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = (Math.random() - 0.5) * 25;
      motePositions[i * 3 + 1] = Math.random() * 9 - 1.2;
      motePositions[i * 3 + 2] = Math.random() * 16 - 10;
      motePhases[i] = Math.random() * Math.PI * 2;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
    const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color: 0xb9ffb4, size: 0.055, transparent: true, opacity: 0.82,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(motes);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = event => {
      const rect = host.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    host.addEventListener("pointermove", onPointer, { passive: true });
    host.addEventListener("pointerleave", () => { pointer.tx = 0; pointer.ty = 0; }, { passive: true });

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("resize", resize, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animate() {
      if (document.hidden) {
        requestAnimationFrame(animate);
        return;
      }
      const t = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;
      camera.position.x = pointer.x * 0.85;
      camera.position.y = 4.3 - pointer.y * 0.35 + Math.sin(t * 0.25) * 0.07;
      camera.lookAt(pointer.x * 0.45, 2.4 + pointer.y * 0.18, -0.2);
      if (!reducedMotion) {
        treeData.forEach(({ tree, phase, sway }) => { tree.rotation.z = Math.sin(t * 0.45 + phase) * sway; });
        halo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.045);
        motes.material.opacity = 0.55 + (Math.sin(t * 1.7) + 1) * 0.18;
        const pos = moteGeo.attributes.position;
        for (let i = 0; i < moteCount; i++) {
          pos.array[i * 3 + 1] += Math.sin(t * 0.45 + motePhases[i]) * 0.0015;
          if (pos.array[i * 3 + 1] > 8) pos.array[i * 3 + 1] = -1;
        }
        pos.needsUpdate = true;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    host.classList.add("webgl-ready");
    animate();
    window.addEventListener("beforeunload", () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.dispose();
    }, { once: true });
  } catch (error) {
    console.warn("3D scene unavailable; using the CSS landscape fallback.", error);
    canvas.style.display = "none";
  }
}
