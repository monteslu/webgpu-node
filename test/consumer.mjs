import assert from 'node:assert/strict'
import { createWebGPUContext, GPUBufferUsage, GPUMapMode } from 'webgpu-node'
const app = await createWebGPUContext(4, 4, {
  flags: JSON.parse(process.env.WEBGPU_NODE_TEST_FLAGS || '[]'),
  adapterOptions: process.env.WEBGPU_NODE_TEST_FALLBACK === '1' ? { forceFallbackAdapter: true } : {},
})
try {
  const buffer = app.device.createBuffer({ size: 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })
  app.device.queue.writeBuffer(buffer, 0, new Uint32Array([0x12345678]))
  await buffer.mapAsync(GPUMapMode.READ)
  assert.equal(new Uint32Array(buffer.getMappedRange())[0], 0x12345678)
  buffer.destroy()
  assert.equal(app.context.getCurrentTexture().width, 4)
  console.log('Installed consumer: native GPU readback passed')
} finally { app.destroy() }
