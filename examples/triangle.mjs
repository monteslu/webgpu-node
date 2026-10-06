import fs from 'node:fs/promises'
import { createWebGPUContext, GPUBufferUsage, GPUMapMode } from '../index.mjs'

const app = await createWebGPUContext(256, 256, { format: 'rgba8unorm' })
try {
  const { device, context, format } = app
  const module = device.createShaderModule({ code: `
    @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
      let p = array<vec2f,3>(vec2f(-0.8,-0.8),vec2f(0.8,-0.8),vec2f(0,0.8));
      return vec4f(p[i],0,1);
    }
    @fragment fn fs() -> @location(0) vec4f { return vec4f(0.1,0.8,0.4,1); }` })
  const pipeline = device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] } })
  const texture = context.getCurrentTexture()
  const output = device.createBuffer({ size: 256 * 256 * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0.02, 0.02, 0.05, 1] }] })
  pass.setPipeline(pipeline); pass.draw(3); pass.end()
  encoder.copyTextureToBuffer({ texture }, { buffer: output, bytesPerRow: 256 * 4 }, [256, 256])
  device.queue.submit([encoder.finish()])
  await output.mapAsync(GPUMapMode.READ)
  const rgba = new Uint8Array(output.getMappedRange())
  const rgb = Buffer.alloc(256 * 256 * 3)
  for (let i = 0; i < 256 * 256; i++) rgb.set(rgba.subarray(i * 4, i * 4 + 3), i * 3)
  await fs.writeFile('triangle.ppm', Buffer.concat([Buffer.from('P6\n256 256\n255\n'), rgb]))
  output.destroy()
  console.log('Wrote triangle.ppm')
} finally { app.destroy() }
