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
  reactionTimer = setTimeout(() => { excited.value = false }, 1500)
}

function followPointer(event) {
  if (!stage.value) return
  const rect = stage.value.getBoundingClientRect()
  pointerX = (event.clientX - rect.left) / rect.width - .5
  pointerY = (event.clientY - rect.top) / rect.height - .5
}

function resetPointer() {
  pointerX = 0
  pointerY = 0
}

onMounted(() => {
  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, 1, .1, 30)
    camera.position.set(.7, .5, 6.6)
    camera.lookAt(0, 0, 0)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    stage.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault()
      failed.value = true
      cancelAnimationFrame(frame)
    })

    scene.add(new THREE.HemisphereLight(0xffffff, 0x587143, 2))
    const key = new THREE.DirectionalLight(0xfff7da, 3.1)
    key.position.set(-3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xc5e7ff, 3)
    rim.position.set(3, 2, -4)
    scene.add(rim)

    const lime = new THREE.MeshPhysicalMaterial({ color: 0xc7e969, roughness: .3, metalness: .08, clearcoat: .8, clearcoatRoughness: .15 })
    const ink = new THREE.MeshStandardMaterial({ color: 0x263b2c, roughness: .22 })
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff4d5, roughness: .28 })
    const peach = new THREE.MeshStandardMaterial({ color: 0xf5a87a, roughness: .45 })
    const gold = new THREE.MeshStandardMaterial({ color: 0xc6aa68, metalness: .55, roughness: .3 })

    function starGeometry(radius, depth, segments = 48) {
      const geometry = new THREE.SphereGeometry(radius, segments, 32)
      const vertices = geometry.attributes.position
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i)
        const angle = Math.atan2(y, x)
        const edge = Math.hypot(x, y) / radius
        const lobes = .86 + .22 * Math.cos(5 * angle - Math.PI / 2) * edge
        vertices.setXYZ(i, x * lobes, y * lobes, z * depth)
      }
      geometry.computeVertexNormals()
      return geometry
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
    const body = new THREE.Mesh(starGeometry(1.12, .57), lime)
    character.add(body)

    const face = new THREE.Group()
    face.position.set(0, -.02, .62)
    character.add(face)
    const eyes = [-.27, .27].map(x => {
      const eye = sphere(.105, ink, face, x, .12, .015, [.85, 1.45, .5])
      sphere(.025, cream, eye, -.024, .043, .09)
      return eye
    })
    for (const x of [-.44, .44]) sphere(.105, peach, face, x, -.16, -.02, [1.2, .5, .2])
    const smile = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-.13, -.14, .06),
      new THREE.Vector3(0, -.31, .09),
      new THREE.Vector3(.13, -.14, .06),
    )
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 16, .024, 8, false), ink)
    face.add(mouth)

    const orbit = new THREE.Group()
    orbit.rotation.set(.85, -.3, -.2)
    character.add(orbit)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.49, .012, 8, 96), gold)
    orbit.add(ring)
    const moons = [cream, peach].map((material, index) => {
      const moon = new THREE.Mesh(starGeometry(index ? .13 : .23, .8, 24), material)
      orbit.add(moon)
      return moon
    })

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.8, 40), new THREE.MeshBasicMaterial({ color: 0x1e3323, transparent: true, opacity: .1, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.45
    shadow.scale.set(1.15, .5, 1)
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

      character.position.y = Math.sin(motion * 2) * .09
      character.rotation.y = still ? -.1 : -.1 + pointerX * .45
      character.rotation.x = still ? 0 : pointerY * .15
      character.rotation.z = still ? -.08 : happy ? Math.sin(t * 8) * .18 : Math.sin(t * 1.4) * .06 - .08
      const squash = still ? 1 : happy ? 1 + Math.sin(t * 8) * .05 : 1
      body.scale.set(1 / squash, squash, 1)
      const blink = !still && Math.sin(t * 1.2) > .994
      for (const [index, eye] of eyes.entries()) {
        eye.scale.y = blink ? .16 : thinking && !still ? 1 + Math.sin(t * 4 + index) * .3 : 1.45
        eye.position.x = (index ? .27 : -.27) + (still ? 0 : pointerX * .08)
        eye.position.y = thinking && !still ? .19 : .12
      }
      mouth.scale.y = speaking && !still ? 1 + Math.sin(t * 10) * .3 : 1
      orbit.rotation.z = -.2 + motion * (thinking ? .8 : .2)
      moons.forEach((moon, index) => {
        const angle = (still ? .65 : motion * .35 + .65) + index * 2.8
        moon.position.set(Math.cos(angle) * 1.49, Math.sin(angle) * 1.49, 0)
        moon.rotation.z = -angle
      })
      shadow.scale.x = 1.15 - Math.sin(motion * 2) * .05
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
  scene?.traverse(object => {
    object.geometry?.dispose()
    object.material?.dispose()
  })
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <button class="mascot-stage" aria-label="Interagir com o Bit" @click="react" @pointermove="followPointer" @pointerleave="resetPointer">
    <span v-if="failed" class="fallback-content"><span class="bit-icon" aria-hidden="true"><i></i><i></i></span><small>Bit em modo leve</small></span>
    <span v-else ref="stage" class="mascot-canvas"></span>
  </button>
</template>

<style scoped>
.mascot-stage { width: 100%; height: var(--mascot-height, 190px); padding: 0; background: transparent; border: 0; display: block; position: relative; }
.mascot-canvas { display: block; width: 100%; height: 100%; }
.fallback-content { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 30px; }
.fallback-content .bit-icon { transform: scale(2); }
.fallback-content small { font-size: 10px; color: var(--muted); }
@media (max-height: 700px) { .mascot-stage { height: var(--mascot-height, 130px); } }
</style>
