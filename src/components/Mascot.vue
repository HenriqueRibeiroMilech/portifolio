<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'

const props = defineProps({ state: { type: String, default: 'idle' }, paused: Boolean })
const stage = ref(null)
const failed = ref(false)
const excited = ref(false)
let renderer, scene, camera, resizeObserver, frame, reactionTimer
let lastFrame = 0
let pointerX = 0
let pointerY = 0
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function react() {
  excited.value = true
  clearTimeout(reactionTimer)
  reactionTimer = setTimeout(() => {
    excited.value = false
  }, 1500)
}

function followPointer(event) {
  if (!stage.value) return
  const rect = stage.value.getBoundingClientRect()
  pointerX = (event.clientX - rect.left) / rect.width - 0.5
  pointerY = (event.clientY - rect.top) / rect.height - 0.5
}

function resetPointer() {
  pointerX = 0
  pointerY = 0
}

onMounted(() => {
  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30)
    camera.position.set(0.8, 0.55, 5.8)
    camera.lookAt(0, 0, 0)
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    stage.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      failed.value = true
      cancelAnimationFrame(frame)
    })

    scene.add(new THREE.HemisphereLight(0xeef6ff, 0x43534b, 2.4))
    const key = new THREE.DirectionalLight(0xffffff, 3.5)
    key.position.set(-3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xc5e7ff, 3)
    rim.position.set(3, 2, -4)
    scene.add(rim)

    const graphite = new THREE.MeshStandardMaterial({
      color: 0x242f32,
      metalness: 0.65,
      roughness: 0.32,
    })
    const titanium = new THREE.MeshStandardMaterial({
      color: 0x9caeae,
      metalness: 0.7,
      roughness: 0.3,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: 0x10191d,
      metalness: 0.4,
      roughness: 0.25,
    })
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x326678,
      metalness: 0.5,
      roughness: 0.12,
      clearcoat: 1,
    })
    const lime = new THREE.MeshStandardMaterial({
      color: 0xc9ed62,
      emissive: 0x9ecb3b,
      emissiveIntensity: 0.7,
    })
    const thrustMaterial = new THREE.MeshBasicMaterial({
      color: 0x9fe1e6,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })

    function box(width, height, depth, material, parent, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }

    function cylinder(radius, height, material, parent, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }

    function sphere(radius, material, parent, x, y, z, scale = [1, 1, 1]) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material)
      mesh.position.set(x, y, z)
      mesh.scale.set(...scale)
      parent.add(mesh)
      return mesh
    }

    const character = new THREE.Group()
    scene.add(character)

    const shell = new THREE.Shape()
    shell.moveTo(-0.65, 0.62)
    shell.lineTo(0.65, 0.62)
    shell.quadraticCurveTo(0.78, 0.62, 0.87, 0.48)
    shell.lineTo(1, 0.25)
    shell.lineTo(1, -0.25)
    shell.lineTo(0.78, -0.52)
    shell.quadraticCurveTo(0.7, -0.62, 0.57, -0.62)
    shell.lineTo(-0.57, -0.62)
    shell.quadraticCurveTo(-0.7, -0.62, -0.78, -0.52)
    shell.lineTo(-1, -0.25)
    shell.lineTo(-1, 0.25)
    shell.lineTo(-0.87, 0.48)
    shell.quadraticCurveTo(-0.78, 0.62, -0.65, 0.62)
    const bodyGeometry = new THREE.ExtrudeGeometry(shell, {
      depth: 0.65,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 3,
      steps: 1,
    })
    bodyGeometry.translate(0, 0, -0.325)
    character.add(new THREE.Mesh(bodyGeometry, graphite))

    box(1.22, 0.065, 0.5, titanium, character, 0, 0.66, -0.04)
    box(0.44, 0.025, 0.12, lime, character, 0.25, 0.7, 0.07)
    for (const side of [-1, 1]) {
      for (const y of [-0.2, 0, 0.2])
        box(0.035, 0.07, 0.25, dark, character, side * 1.055, y, -0.04)
      for (const y of [-0.4, 0.4])
        sphere(0.035, titanium, character, side * 0.65, y, 0.4, [1, 1, 0.45])
    }

    const lens = new THREE.Group()
    lens.position.set(0, 0.04, 0.4)
    character.add(lens)
    const housing = cylinder(0.43, 0.16, titanium, lens, 0, 0, 0)
    housing.rotation.x = Math.PI / 2
    const bezel = cylinder(0.35, 0.18, dark, lens, 0, 0, 0.07)
    bezel.rotation.x = Math.PI / 2
    sphere(0.29, glass, lens, 0, 0, 0.15, [1, 1, 0.43])
    const iris = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 40), lime)
    iris.position.z = 0.27
    lens.add(iris)
    sphere(0.105, dark, lens, 0, 0, 0.27, [1, 1, 0.25])
    sphere(0.035, titanium, lens, -0.09, 0.09, 0.28, [1, 1, 0.3])
    const scan = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.009, 6, 32, Math.PI * 0.65), lime)
    scan.position.z = 0.24
    lens.add(scan)

    const indicators = [-0.13, 0, 0.13].map((x) =>
      box(0.065, 0.065, 0.025, lime, character, x, -0.49, 0.39),
    )
    const plumes = []
    for (const side of [-1, 1]) {
      const engine = new THREE.Group()
      engine.position.set(side * 1.2, -0.17, -0.06)
      engine.rotation.z = side * 0.17
      character.add(engine)
      box(0.28, 0.08, 0.25, titanium, engine, -side * 0.1, 0, 0)
      cylinder(0.21, 0.5, titanium, engine, side * 0.1, -0.1, 0)
      cylinder(0.22, 0.11, graphite, engine, side * 0.1, 0.13, 0)
      cylinder(0.14, 0.1, dark, engine, side * 0.1, -0.39, 0)
      cylinder(0.11, 0.025, lime, engine, side * 0.1, -0.45, 0)
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 12), thrustMaterial)
      plume.rotation.z = Math.PI
      plume.position.set(side * 0.1, -0.62, 0)
      engine.add(plume)
      plumes.push(plume)
    }
    cylinder(0.025, 0.27, titanium, character, -0.5, 0.82, -0.12)
    box(0.15, 0.045, 0.07, lime, character, -0.5, 0.97, -0.12)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x1e3323,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.45
    shadow.scale.set(1.15, 0.5, 1)
    scene.add(shadow)

    resizeObserver = new ResizeObserver(() => {
      if (!stage.value) return
      const { width, height } = stage.value.getBoundingClientRect()
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(stage.value)

    function animate(time) {
      frame = requestAnimationFrame(animate)
      if (document.hidden || time - lastFrame < 33 || failed.value) return
      lastFrame = time
      const t = time / 1000
      const still = props.paused || reducedMotion.matches
      const thinking = props.state === 'thinking'
      const speaking = props.state === 'speaking'
      const happy = props.state === 'success' || excited.value
      const motion = still ? 0 : t

      character.position.y = Math.sin(motion * 2) * 0.09
      character.rotation.y = still ? -0.13 : -0.13 + pointerX * 0.3
      character.rotation.x = still ? 0 : pointerY * 0.12
      character.rotation.z = still ? 0 : happy ? Math.sin(t * 7) * 0.12 : Math.sin(t * 1.4) * 0.035
      lens.rotation.y = still ? 0 : thinking ? Math.sin(t * 2) * 0.18 : pointerX * 0.4
      lens.rotation.x = still ? 0 : -pointerY * 0.25
      scan.rotation.z = motion * (thinking ? 2.5 : 0.3)
      const aperture = !still && happy ? 1 + Math.sin(t * 8) * 0.08 : 1
      iris.scale.setScalar(aperture)
      indicators.forEach((indicator, index) => {
        indicator.scale.y = speaking && !still ? 1.2 + Math.sin(t * 10 + index * 1.5) * 0.7 : 1
      })
      plumes.forEach((plume, index) => {
        plume.scale.y = still ? 1 : 1 + Math.sin(t * 14 + index) * 0.15
      })
      shadow.scale.x = 1.15 - Math.sin(motion * 2) * 0.05
      renderer.render(scene, camera)
    }
    animate(0)
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  clearTimeout(reactionTimer)
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  scene?.traverse((object) => {
    object.geometry?.dispose()
    object.material?.dispose()
  })
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <button
    class="mascot-stage"
    aria-label="Interagir com o Bit"
    @click="react"
    @pointermove="followPointer"
    @pointerleave="resetPointer"
  >
    <span v-if="failed" class="fallback-content">
      <span class="bit-icon" aria-hidden="true">
        <i></i>
        <i></i>
      </span>
      <small>Bit em modo leve</small>
    </span>
    <span v-else ref="stage" class="mascot-canvas"></span>
  </button>
</template>

<style scoped>
.mascot-stage {
  width: 100%;
  height: var(--mascot-height, 190px);
  padding: 0;
  background: transparent;
  border: 0;
  display: block;
  position: relative;
}
.mascot-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.fallback-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 30px;
}
.fallback-content .bit-icon {
  transform: scale(2);
}
.fallback-content small {
  font-size: 10px;
  color: var(--muted);
}
@media (max-height: 700px) {
  .mascot-stage {
    height: var(--mascot-height, 130px);
  }
}
</style>
