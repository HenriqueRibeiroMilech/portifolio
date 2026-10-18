<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'

const props = defineProps({ state: { type: String, default: 'idle' }, paused: Boolean })
const stage = ref(null)
const failed = ref(false)
const greeting = ref(false)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let renderer, scene, observer, frame, reactionTimer
let pointerX = 0
let pointerY = 0
let lastFrame = 0

function react() {
  greeting.value = true
  clearTimeout(reactionTimer)
  reactionTimer = setTimeout(() => {
    greeting.value = false
  }, 1200)
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
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20)
    camera.position.set(0.15, 0.1, 5.1)
    camera.lookAt(0, 0, 0)
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    stage.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      failed.value = true
      cancelAnimationFrame(frame)
    })

    scene.add(new THREE.HemisphereLight(0xf5f5ee, 0x3c4d40, 2.1))
    const light = new THREE.DirectionalLight(0xfff9ee, 3)
    light.position.set(-3, 4, 5)
    scene.add(light)
    const rim = new THREE.DirectionalLight(0xdce9e2, 2.6)
    rim.position.set(3, 2, -3)
    scene.add(rim)

    const character = new THREE.Group()
    scene.add(character)
    const geometry = new THREE.SphereGeometry(1, 48, 32)
    const vertices = geometry.attributes.position
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i)
      vertices.setXYZ(i, x * (1 - y * 0.07), y < -0.65 ? -0.65 + (y + 0.65) * 0.65 : y, z * 0.8)
    }
    geometry.computeVertexNormals()
    const body = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0x303a36, roughness: 0.62, metalness: 0 }),
    )
    character.add(body)

    const face = new THREE.Group()
    face.position.set(0, 0.1, 0.79)
    character.add(face)
    const eyes = [-0.205, 0.205].map((x) => {
      const eye = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.052, 0.115, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xf5f3eb }),
      )
      eye.position.x = x
      eye.scale.z = 0.45
      face.add(eye)
      return eye
    })

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(15, 25, 18, .2)')
      gradient.addColorStop(1, 'rgba(15, 25, 18, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 64, 64)
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.2),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
          transparent: true,
          depthWrite: false,
        }),
      )
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = -1.18
      scene.add(shadow)
    }

    observer = new ResizeObserver(() => {
      if (!stage.value) return
      const { width, height } = stage.value.getBoundingClientRect()
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    observer.observe(stage.value)

    function animate(time) {
      frame = requestAnimationFrame(animate)
      if (document.hidden || failed.value || time - lastFrame < 33) return
      lastFrame = time
      const t = time / 1000
      const still = props.paused || reducedMotion.matches
      const thinking = props.state === 'thinking'
      const speaking = props.state === 'speaking'
      const happy = greeting.value || props.state === 'success'
      const motion = still ? 0 : t

      character.position.y = Math.sin(motion * 1.6) * 0.035
      character.rotation.y = still ? -0.04 : -0.04 + pointerX * 0.2
      character.rotation.z = still ? 0 : happy ? Math.sin(t * 3) * 0.055 : Math.sin(t * 0.9) * 0.015
      body.scale.y = 1 + Math.sin(motion * 1.6) * 0.008
      face.position.x = still ? 0 : thinking ? Math.sin(t * 1.4) * 0.045 : pointerX * 0.08
      face.position.y = 0.1 + (still ? 0 : thinking ? 0.035 : -pointerY * 0.055)
      const blink = !still && t % 5.5 > 5.36
      for (const eye of eyes) {
        eye.scale.y = blink
          ? 0.12
          : !still && happy
            ? 0.72
            : !still && speaking
              ? 1 + Math.sin(t * 4) * 0.07
              : thinking && !still
                ? 0.85
                : 1
      }
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
  observer?.disconnect()
  scene?.traverse((object) => {
    object.geometry?.dispose()
    object.material?.map?.dispose()
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
  display: block;
  width: 100%;
  height: var(--mascot-height, 190px);
  padding: 0;
  border: 0;
  background: transparent;
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
