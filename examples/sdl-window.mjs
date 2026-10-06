import sdl from '@kmamal/sdl'
import { createWebGPUContext } from '../index.mjs'

const window = sdl.video.createWindow({ title: 'webgpu-node', width: 800, height: 600, webgpu: true, resizable: true })
let app, timer
try {
  app = await createWebGPUContext(window.pixelWidth, window.pixelHeight, { window })
  const draw = () => {
    if (window.destroyed) return
    const encoder = app.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: app.context.getCurrentTexture().createView(),
      clearValue: [0.1, 0.25 + 0.2 * Math.sin(performance.now() / 1000), 0.6, 1],
      loadOp: 'clear', storeOp: 'store',
    }] })
    pass.end()
    app.device.queue.submit([encoder.finish()])
    app.present()
    timer = setTimeout(draw, 16)
  }
  window.on('close', () => { clearTimeout(timer); app.destroy() })
  draw()
} catch (error) { app?.destroy(); window.destroy(); throw error }
