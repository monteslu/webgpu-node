import { createGPU, createCanvas, createWebGPUContext, installGlobals, GPUBufferUsage, GPUCanvasContext, type GPUDevice } from 'webgpu-node'
import sdl from '@kmamal/sdl'
import type { CanvasOptions } from 'webgpu-node'
declare const window: ReturnType<typeof sdl.video.createWindow>
const windowOptions: CanvasOptions = { window, presentMode: 'fifo' }
void windowOptions
const gpu = createGPU(['backend=vulkan'])
const restore = installGlobals({ gpu })
const adapter = await gpu.requestAdapter()
if (adapter) {
  const device: GPUDevice = await adapter.requestDevice()
  device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST })
  const canvas = createCanvas(64, 64)
  const context: GPUCanvasContext = canvas.getContext('webgpu')
  context.configure({ device, format: gpu.getPreferredCanvasFormat() })
  const texture: GPUTexture = context.getCurrentTexture()
  texture.createView()
  const app = await createWebGPUContext(64, 64, { gpu, device })
  app.present(); app.resize(32, 32); app.destroy(); device.destroy()
}
restore()
