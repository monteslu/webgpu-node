import native from './lib/native.mjs'
import { createCanvas, GPUCanvasContext } from './lib/canvas.mjs'

export { createCanvas, GPUCanvasContext }
export const globals = Object.freeze({ ...native.globals, GPUCanvasContext })
export const {
  GPU, GPUAdapter, GPUAdapterInfo, GPUDevice, GPUQueue, GPUBuffer, GPUTexture,
  GPUTextureView, GPUSampler, GPUShaderModule, GPUCommandEncoder, GPUCommandBuffer,
  GPUComputePassEncoder, GPURenderPassEncoder, GPUComputePipeline, GPURenderPipeline,
  GPUBindGroup, GPUBindGroupLayout, GPUPipelineLayout, GPURenderBundle,
  GPURenderBundleEncoder, GPUQuerySet, GPUValidationError, GPUOutOfMemoryError,
  GPUInternalError, GPUBufferUsage, GPUTextureUsage, GPUMapMode, GPUShaderStage, GPUColorWrite,
  GPUCompilationInfo, GPUCompilationMessage, GPUDeviceLostInfo, GPUError, GPUExternalTexture,
  GPUPipelineError, GPUSupportedFeatures, GPUSupportedLimits, GPUUncapturedErrorEvent, WGSLLanguageFeatures,
} = globals

export function createGPU(flags = []) {
  if (!Array.isArray(flags) || flags.some(f => typeof f !== 'string' || !f.includes('='))) throw new TypeError('Dawn flags must be an array of key=value strings')
  return native.create(flags)
}
export const create = createGPU

// Node has no compositor, so an animation frame is a ~60 Hz timer that passes
// the frame time, like the browser's. Frames run only while one is requested.
const frames = new Map()
let nextFrame = 1
export function requestAnimationFrame(callback) {
  if (typeof callback !== 'function') throw new TypeError('requestAnimationFrame needs a function')
  const id = nextFrame++
  frames.set(id, setTimeout(() => { frames.delete(id); callback(performance.now()) }, 16))
  return id
}
export function cancelAnimationFrame(id) {
  clearTimeout(frames.get(id))
  frames.delete(id)
}

// Installation is explicit; importing the package never changes globalThis.
// Browser code such as Three.js also expects requestAnimationFrame and `self`;
// those are added only where the target does not already have them.
export function installGlobals({ gpu = createGPU(), target = globalThis, animationFrame = true } = {}) {
  const restore = []
  function set(object, name, value) {
    const previous = Object.getOwnPropertyDescriptor(object, name)
    Object.defineProperty(object, name, { configurable: true, writable: true, value })
    restore.push(() => {
      if (object[name] !== value) return
      if (previous) Object.defineProperty(object, name, previous)
      else delete object[name]
    })
  }
  try {
    for (const [name, value] of Object.entries(globals)) set(target, name, value)
    if (!target.navigator) set(target, 'navigator', {})
    set(target.navigator, 'gpu', gpu)
    if (animationFrame) {
      if (typeof target.requestAnimationFrame !== 'function') set(target, 'requestAnimationFrame', requestAnimationFrame)
      if (typeof target.cancelAnimationFrame !== 'function') set(target, 'cancelAnimationFrame', cancelAnimationFrame)
      if (target.self === undefined) set(target, 'self', target)
    }
  } catch (error) { for (const undo of restore.reverse()) undo(); throw error }
  let installed = true
  return () => { if (installed) { installed = false; for (const undo of restore.reverse()) undo() } }
}

export async function createWebGPUContext(width, height, options = {}) {
  const gpu = options.gpu ?? createGPU(options.flags)
  const adapter = options.device ? null : await gpu.requestAdapter(options.adapterOptions)
  if (!options.device && !adapter) throw new Error('No WebGPU adapter available; check your GPU drivers or select a Dawn backend')
  const device = options.device ?? await adapter.requestDevice(options.deviceDescriptor)
  let canvas
  try {
    canvas = createCanvas(width, height, options)
    const context = canvas.getContext('webgpu')
    const format = options.format ?? gpu.getPreferredCanvasFormat()
    context.configure({ device, format, usage: options.usage ?? (GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC), alphaMode: options.alphaMode ?? 'opaque' })
    let destroyed = false
    return {
      gpu, adapter, device, canvas, context, format,
      present: () => context.present(),
      resize: (w, h) => context.resize(w, h),
      attachWindow: window => context.attachWindow(window),
      detachWindow: () => context.detachWindow(),
      destroy() {
        if (destroyed) return
        destroyed = true
        context.destroy()
        if (!options.device) device.destroy()
      },
    }
  } catch (error) {
    canvas?.getContext('webgpu').destroy()
    if (!options.device) device.destroy()
    throw error
  }
}
