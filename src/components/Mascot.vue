<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const props = defineProps({
  state: { type: String, default: 'idle' },
  paused: Boolean,
})
const stage = ref(null)
const failed = ref(false)
const waving = ref(false)
let renderer, scene, camera, resizeObserver, frame, waveTimeout
let lastFrame = 0
let pointerX = 0
let pointerY = 0
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function wave() {
  waving.value = true
  clearTimeout(waveTimeout)
  waveTimeout = setTimeout(() => {
    waving.value = false
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
    camera.position.set(2.3, 1.3, 7.5)
    camera.lookAt(0, 0.05, 0)
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    stage.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      failed.value = true
      cancelAnimationFrame(frame)
    })

    scene.add(new THREE.HemisphereLight(0xffffff, 0x84986e, 2.6))
    const key = new THREE.DirectionalLight(0xfff9dc, 4)
    key.position.set(-3, 5, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xccefff, 2.3)
    rim.position.set(4, 2, -3)
    scene.add(rim)

    const lime = new THREE.MeshPhysicalMaterial({
      color: 0xc8eb54,
      roughness: 0.3,
      metalness: 0.08,
      clearcoat: 0.7,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: 0x202e24,
      roughness: 0.3,
    })
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      roughness: 0.4,
    })
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xe0ff8b })
    const robot = new THREE.Group()
    scene.add(robot)

    function box(width, height, depth, radius, material, parent, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, radius), material)
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

    const head = new THREE.Group()
    head.position.y = 0.55
    robot.add(head)
    box(1.85, 1.35, 1.12, 0.32, lime, head)
    box(1.47, 0.76, 0.15, 0.22, dark, head, 0, -0.01, 0.59)
    const eyes = [-0.33, 0.33].map((x) =>
      box(0.15, 0.31, 0.06, 0.07, eyeMaterial, head, x, 0.05, 0.69),
    )
    sphere(0.1, lime, head, 0, 1.1, 0)
    box(0.055, 0.4, 0.055, 0.02, dark, head, 0, 0.87)
    sphere(0.19, dark, head, -1, 0, 0, [0.6, 1, 1])
    sphere(0.19, dark, head, 1, 0, 0, [0.6, 1, 1])
    box(0.31, 0.05, 0.05, 0.02, eyeMaterial, head, 0, -0.21, 0.69)

    box(0.5, 0.18, 0.5, 0.07, dark, robot, 0, -0.22)
    box(1.05, 0.75, 0.75, 0.22, lime, robot, 0, -0.67)
    box(0.4, 0.3, 0.055, 0.07, cream, robot, 0, -0.65, 0.39)
    box(0.12, 0.12, 0.04, 0.03, dark, robot, 0, -0.65, 0.43)
    const leftArm = new THREE.Group()
    const rightArm = new THREE.Group()
    leftArm.position.set(-0.75, -0.42, 0)
    rightArm.position.set(0.75, -0.42, 0)
    robot.add(leftArm, rightArm)
    sphere(0.18, dark, leftArm, 0, 0, 0)
    sphere(0.18, dark, rightArm, 0, 0, 0)
    box(0.33, 0.55, 0.38, 0.16, lime, leftArm, -0.1, -0.25)
    box(0.33, 0.55, 0.38, 0.16, lime, rightArm, 0.1, -0.25)
    for (const x of [-0.32, 0.32]) {
      box(0.2, 0.23, 0.25, 0.07, dark, robot, x, -1.12)
      box(0.43, 0.25, 0.63, 0.1, cream, robot, x, -1.27, 0.12)
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 48),
      new THREE.MeshBasicMaterial({
        color: 0x35452b,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.52
    shadow.scale.set(1.2, 0.65, 1)
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
      const happy = props.state === 'success' || waving.value
      robot.position.y = still ? 0 : Math.sin(t * 2.2) * 0.07
      robot.rotation.y = still ? -0.12 : -0.12 + pointerX * 0.45 + Math.sin(t * 1.1) * 0.08
      head.rotation.z = still
        ? -0.06
        : thinking
          ? Math.sin(t * 3) * 0.12
          : happy
            ? Math.sin(t * 7) * 0.08
            : -0.06
      head.rotation.x = still ? 0 : pointerY * 0.15
      const blink = !still && Math.sin(t * 1.1) > 0.993
      for (const eye of eyes) {
        eye.scale.y = blink ? 0.12 : thinking && !still ? 0.65 + Math.sin(t * 5) * 0.2 : 1
        eye.position.x +=
          ((eye.position.x < 0 ? -0.33 : 0.33) + (still ? 0 : pointerX * 0.1) - eye.position.x) *
          0.1
      }
      rightArm.rotation.z = !still && happy ? 2.2 + Math.sin(t * 10) * 0.3 : -0.12
      leftArm.rotation.z = still ? 0.12 : speaking ? 0.25 + Math.sin(t * 9) * 0.15 : 0.12
      renderer.render(scene, camera)
    }
    animate(0)
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  clearTimeout(waveTimeout)
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  scene?.traverse((object) => {
    object.geometry?.dispose()
    if (object.material) object.material.dispose()
  })
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <button
    class="mascot-stage"
    :class="{ 'mascot-fallback': failed }"
    aria-label="Fazer o Bit acenar"
    @click="wave"
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
  height: 190px;
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
    height: 130px;
  }
}
</style>
