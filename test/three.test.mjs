import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebGPUContext, installGlobals } from '../index.mjs'
import { flags, adapterOptions, pixels } from './helpers.mjs'

test('Three.js WebGPURenderer draws a real mesh and readback proves pixels', async () => {
  const app = await createWebGPUContext(64, 64, { flags: flags(), adapterOptions: adapterOptions() })
  const restore = installGlobals({ gpu: app.gpu })
  const previousSelf = globalThis.self
  const previousVideoFrame = globalThis.VideoFrame
  // Three r180 probes instanceof VideoFrame even for ordinary render targets.
  // No video is used in this test; this host explicitly rejects construction.
  globalThis.VideoFrame ??= class VideoFrame {
    constructor() { throw new DOMException('This host does not implement WebCodecs', 'NotSupportedError') }
  }
  globalThis.self = {
    requestAnimationFrame: callback => setTimeout(() => callback(performance.now()), 16).unref(),
    cancelAnimationFrame: clearTimeout,
  }
  let renderer, geometry, material
  try {
    const THREE = await import('three/webgpu')
    renderer = new THREE.WebGPURenderer({ canvas: app.canvas, device: app.device, alpha: false, antialias: false })
    await renderer.init()
    assert.equal(renderer.backend.isWebGPUBackend, true)
    renderer.setSize(64, 64, false)
    renderer.setClearColor(0x000000, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10)
    camera.position.z = 2
    geometry = new THREE.BoxGeometry(1, 1, 1)
    material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    scene.add(new THREE.Mesh(geometry, material))
    await renderer.renderAsync(scene, camera)
    const image = await pixels(app.device, app.context.getCurrentTexture())
    const center = image.slice((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 4)
    assert.ok(center[1] > 240 && center[0] < 10 && center[2] < 10, `Expected green center, got ${center}`)
    assert.deepEqual([...image.slice(0, 4)], [0, 0, 0, 255])
    app.present()
  } catch (error) {
    console.error('Three.js integration failed:', error)
    throw error
  } finally {
    geometry?.dispose(); material?.dispose(); renderer?.dispose()
    app.destroy(); restore()
    if (previousSelf === undefined) delete globalThis.self
    else globalThis.self = previousSelf
    if (previousVideoFrame === undefined) delete globalThis.VideoFrame
    else globalThis.VideoFrame = previousVideoFrame
  }
})
