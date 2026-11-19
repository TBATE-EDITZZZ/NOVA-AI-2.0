import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

type PlanetInfo = { name: string; distance: number; radius: number; color: string; period: string; description: string };
const bodies: PlanetInfo[] = [
  { name: "Mercury", distance: 3.2, radius: 0.27, color: "#9c9896", period: "88 Earth days", description: "The smallest planet and the closest planet to the Sun." },
  { name: "Venus", distance: 4.5, radius: 0.43, color: "#dfb579", period: "225 Earth days", description: "A rocky planet with a dense carbon-dioxide atmosphere." },
  { name: "Earth", distance: 5.9, radius: 0.47, color: "#538ce0", period: "365.25 days", description: "The only world currently known to host life; its surface is mostly covered by liquid water." },
  { name: "Mars", distance: 7.3, radius: 0.36, color: "#c86a4b", period: "687 Earth days", description: "A cold, dusty world with a thin atmosphere and evidence of ancient flowing water." },
  { name: "Jupiter", distance: 9.7, radius: 1.21, color: "#d7ae82", period: "11.86 Earth years", description: "The largest planet, a gas giant with a system of moons and a long-lived Great Red Spot." },
  { name: "Saturn", distance: 12.6, radius: 1.02, color: "#d3c18e", period: "29.4 Earth years", description: "A gas giant notable for its extensive ring system, made mostly of icy particles." },
  { name: "Uranus", distance: 15.2, radius: 0.75, color: "#85c9cd", period: "84 Earth years", description: "An ice giant that rotates on its side relative to its orbit." },
  { name: "Neptune", distance: 17.8, radius: 0.73, color: "#527ce3", period: "165 Earth years", description: "A distant ice giant with a dynamic atmosphere and powerful winds." },
];

export default function SolarSystem() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<(name: string) => void>(() => undefined);
  const [selected, setSelected] = useState("Earth");
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const pausedRef = useRef(false);
  const cameraOpsRef = useRef<{ zoom: (delta: number) => void; reset: () => void } | null>(null);
  selectedRef.current = setSelected;
  pausedRef.current = paused;
  const selectedBody = bodies.find(body => body.name === selected) ?? bodies[2];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      setError("This browser could not start the 3D renderer. Try a browser with WebGL enabled.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x070911, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070911);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
    const target = new THREE.Vector3(0, 0, 0);
    let distance = 29;
    let yaw = 0.3;
    let pitch = 0.86;
    const updateCamera = () => {
      const horizontal = distance * Math.cos(pitch);
      camera.position.set(target.x + horizontal * Math.sin(yaw), target.y + distance * Math.sin(pitch), target.z + horizontal * Math.cos(yaw));
      camera.lookAt(target);
    };
    updateCamera();
    cameraOpsRef.current = {
      zoom: delta => { distance = THREE.MathUtils.clamp(distance + delta, 17, 45); updateCamera(); },
      reset: () => { yaw = 0.3; pitch = 0.86; distance = 29; target.set(0, 0, 0); updateCamera(); },
    };

    scene.add(new THREE.AmbientLight(0x97a6d5, 1.15));
    const sunLight = new THREE.PointLight(0xffd9a1, 160, 90, 1.4);
    scene.add(sunLight);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.65, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffc66b }));
    scene.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(2.15, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf6ae48, transparent: true, opacity: 0.13, side: THREE.BackSide }));
    scene.add(sunGlow);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index++) {
      const radius = 26 + Math.random() * 38;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[index * 3 + 1] = radius * Math.cos(phi);
      starPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbac7ff, size: 0.12, transparent: true, opacity: 0.8 }));
    scene.add(stars);

    const meshes: THREE.Mesh[] = [];
    const orbitGroups: THREE.Group[] = [];
    bodies.forEach((body, index) => {
      const points = new THREE.EllipseCurve(0, 0, body.distance, body.distance, 0, Math.PI * 2).getPoints(120).map(point => new THREE.Vector3(point.x, 0, point.y));
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitLine = new THREE.LineLoop(orbitGeometry, new THREE.LineBasicMaterial({ color: 0x8386a7, transparent: true, opacity: 0.24 }));
      scene.add(orbitLine);
      const group = new THREE.Group();
      scene.add(group);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(body.radius, 24, 18),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(body.color), roughness: 0.9, metalness: 0.02, emissive: new THREE.Color(body.color).multiplyScalar(0.055) }),
      );
      mesh.name = body.name;
      mesh.userData.index = index;
      group.add(mesh);
      if (body.name === "Saturn") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.24, 1.82, 64), new THREE.MeshStandardMaterial({ color: 0xc5b181, side: THREE.DoubleSide, transparent: true, opacity: 0.7, roughness: 1 }));
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
      }
      meshes.push(mesh);
      orbitGroups.push(group);
    });

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(280, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    let downX = 0;
    let downY = 0;
    let moved = false;
    const down = (event: PointerEvent) => { dragging = true; moved = false; downX = event.clientX; downY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - downX;
      const dy = event.clientY - downY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (event.buttons === 2 || event.shiftKey) {
        target.x -= dx * 0.025;
        target.y += dy * 0.025;
      } else {
        yaw -= dx * 0.006;
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.005, 0.18, 1.48);
      }
      downX = event.clientX;
      downY = event.clientY;
      updateCamera();
    };
    const up = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(meshes, false)[0]?.object;
        if (hit?.name) selectedRef.current(hit.name);
      }
    };
    const wheel = (event: WheelEvent) => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.018, 17, 45); updateCamera(); };
    const context = (event: MouseEvent) => event.preventDefault();
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", context);

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (!pausedRef.current) {
        orbitGroups.forEach((group, index) => {
          const body = bodies[index];
          const periodFactor = 1 / Math.sqrt(body.distance);
          const angle = elapsed * 0.07 * periodFactor + index * 0.63;
          group.position.set(Math.cos(angle) * body.distance, 0, Math.sin(angle) * body.distance);
          group.children[0].rotation.y += 0.003;
        });
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("contextmenu", context);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineLoop || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="solar-system-card">
      <div className="solar-system-toolbar"><div><span className="card-kicker">THREE.JS MODEL · ILLUSTRATIVE</span><strong>Solar system explorer</strong></div><div className="solar-controls"><button onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume orbital motion" : "Pause orbital motion"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button><button onClick={() => cameraOpsRef.current?.zoom(-3)} aria-label="Zoom in"><ZoomIn size={14} /></button><button onClick={() => cameraOpsRef.current?.zoom(3)} aria-label="Zoom out"><ZoomOut size={14} /></button><button onClick={() => cameraOpsRef.current?.reset()} aria-label="Reset view"><RotateCcw size={14} /></button></div></div>
      <div className="solar-system-stage"><div className="solar-canvas" ref={mountRef} role="img" aria-label="Three-dimensional illustrative solar system. Drag to rotate, shift-drag or right-drag to pan, use the wheel to zoom, and click a planet to select it." />{error && <div className="solar-error">{error}</div>}<div className="solar-overlay"><span className="solar-selected-label">SELECTED BODY</span><strong>{selectedBody.name}</strong><span>{selectedBody.period} orbital period</span></div></div>
      <div className="solar-system-info"><div><span className="card-kicker">PLANET NOTE</span><h3>{selectedBody.name}</h3><p>{selectedBody.description}</p></div><div className="planet-legend">{bodies.map(body => <button key={body.name} onClick={() => setSelected(body.name)} className={selected === body.name ? "chosen" : ""}><i style={{ background: body.color }} />{body.name}</button>)}</div></div>
      <div className="model-disclaimer">Educational illustration only. Planet sizes and orbital distances are not to scale; orbital motion is simplified and is not a live ephemeris.</div>
    </div>
  );
}
