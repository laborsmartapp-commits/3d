import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

export default function SceneViewer({ url, clip }) {
  const ref = useRef(null);
  const [status, setStatus] = useState('Loading scene…');

  useEffect(() => {
    const el = ref.current;
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(el.clientWidth, el.clientHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(r.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b18');
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.01, 5000);
    const controls = new OrbitControls(cam, r.domElement); controls.enableDamping = true;
    let mixer, raf, alive = true;
    const clock = new THREE.Clock();
    r.domElement.addEventListener('webglcontextlost', () => setStatus('This scene is too heavy for your device. Re-export it from Blender with compression (see the library tips).'));
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    loader.load(url, (g) => {
      if (!alive) return;
      scene.add(g.scene);
      const box = new THREE.Box3().setFromObject(g.scene), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()).length() || 1;
      controls.target.copy(c); cam.position.copy(c).add(new THREE.Vector3(s * 0.6, s * 0.4, s * 0.6)); cam.near = s / 1000; cam.far = s * 20; cam.updateProjectionMatrix();
      if (g.animations.length) { mixer = new THREE.AnimationMixer(g.scene); const pick = clip ? g.animations.filter((a) => a.name === clip) : g.animations; (pick.length ? pick : g.animations).forEach((a) => mixer.clipAction(a).play()); }
      setStatus('');
    }, (p) => {
      if (alive && p.total) setStatus(p.loaded < p.total ? `Downloading scene… ${Math.round((p.loaded / p.total) * 100)}%` : 'Preparing scene… this can take a while for large files');
    }, (err) => setStatus(`This file could not be loaded: ${err?.message || 'unknown error'}`));
    const loop = () => { raf = requestAnimationFrame(loop); mixer?.update(clock.getDelta()); controls.update(); r.render(scene, cam); };
    loop();
    const onResize = () => { r.setSize(el.clientWidth, el.clientHeight); cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); controls.dispose(); r.dispose(); r.domElement.remove(); };
  }, [url, clip]);

  return (
    <div ref={ref} className="absolute inset-0">
      {status && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">{status}</div>}
    </div>
  );
}