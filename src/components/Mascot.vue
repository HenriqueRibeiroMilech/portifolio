<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const props = defineProps({ state: { type: String, default: 'idle' }, paused: Boolean })
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
  waveTimeout = setTimeout(() => { waving.value = false }, 1500)
}

function followPointer(event) {
  const rect = stage.value.getBoundingClientRect()
  pointerX = (event.clientX - rect.left) / rect.width - .5
  pointerY = (event.clientY - rect.top) / rect.height - .5
}

onMounted(() => {
  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, 1, .1, 30)
    camera.position.set(2.3, 1.3, 7.5)
    camera.lookAt(0, .05, 0)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    stage.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', event => {
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

    const lime = new THREE.MeshPhysicalMaterial({ color: 0xc8eb54, roughness: .3, metalness: .08, clearcoat: .7 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x202e24, roughness: .3 })
    const cream = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: .4 })
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
    head.position.y = .55
    robot.add(head)
    box(1.85, 1.35, 1.12, .32, lime, head)
    box(1.47, .76, .15, .22, dark, head, 0, -.01, .59)
    const eyes = [-.33, .33].map(x => box(.15, .31, .06, .07, eyeMaterial, head, x, .05, .69))
    sphere(.1, lime, head, 0, 1.1, 0)
    box(.055, .4, .055, .02, dark, head, 0, .87)
    sphere(.19, dark, head, -1, 0, 0, [.6, 1, 1])
    sphere(.19, dark, head, 1, 0, 0, [.6, 1, 1])
    box(.31, .05, .05, .02, eyeMaterial, head, 0, -.21, .69)

    box(.5, .18, .5, .07, dark, robot, 0, -.22)
    box(1.05, .75, .75, .22, lime, robot, 0, -.67)
    box(.4, .3, .055, .07, cream, robot, 0, -.65, .39)
    box(.12, .12, .04, .03, dark, robot, 0, -.65, .43)
    const leftArm = new THREE.Group()
    const rightArm = new THREE.Group()
    leftArm.position.set(-.75, -.42, 0)
    rightArm.position.set(.75, -.42, 0)
    robot.add(leftArm, rightArm)
    sphere(.18, dark, leftArm, 0, 0, 0)
    sphere(.18, dark, rightArm, 0, 0, 0)
    box(.33, .55, .38, .16, lime, leftArm, -.1, -.25)
    box(.33, .55, .38, .16, lime, rightArm, .1, -.25)
    for (const x of [-.32, .32]) {
      box(.2, .23, .25, .07, dark, robot, x, -1.12)
      box(.43, .25, .63, .1, cream, robot, x, -1.27, .12)
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.85, 48), new THREE.MeshBasicMaterial({ color: 0x35452b, transparent: true, opacity: .09, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.52
    shadow.scale.set(1.2, .65, 1)
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
      robot.position.y = still ? 0 : Math.sin(t * 2.2) * .07
      robot.rotation.y = still ? -.12 : -.12 + pointerX * .45 + Math.sin(t * 1.1) * .08
      head.rotation.z = still ? -.06 : thinking ? Math.sin(t * 3) * .12 : happy ? Math.sin(t * 7) * .08 : -.06
      head.rotation.x = still ? 0 : pointerY * .15
      const blink = !still && Math.sin(t * 1.1) > .993
      for (const eye of eyes) {
        eye.scale.y = blink ? .12 : thinking && !still ? .65 + Math.sin(t * 5) * .2 : 1
        eye.position.x += ((eye.position.x < 0 ? -.33 : .33) + (still ? 0 : pointerX * .1) - eye.position.x) * .1
      }
      rightArm.rotation.z = !still && happy ? 2.2 + Math.sin(t * 10) * .3 : -.12
      leftArm.rotation.z = still ? .12 : speaking ? .25 + Math.sin(t * 9) * .15 : .12
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
  scene?.traverse(object => {
    object.geometry?.dispose()
    if (object.material) object.material.dispose()
  })
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <button class="mascot-stage" :class="{ 'mascot-fallback': failed }" aria-label="Fazer o Bit acenar" @click="wave" @pointermove="followPointer" @pointerleave="pointerX = 0; pointerY = 0">
    <span v-if="failed" class="fallback-content"><span class="bit-icon" aria-hidden="true"><i></i><i></i></span><small>Bit em modo leve</small></span>
    <span v-else ref="stage" class="mascot-canvas"></span>
  </button>
</template>

<style scoped>
.mascot-stage { width: 100%; height: 190px; padding: 0; background: transparent; border: 0; display: block; position: relative; }
.mascot-canvas { display: block; width: 100%; height: 100%; }
.fallback-content { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 30px; }
.fallback-content .bit-icon { transform: scale(2); }
.fallback-content small { font-size: 10px; color: var(--muted); }
@media (max-height: 700px) { .mascot-stage { height: 130px; } }
</style>
