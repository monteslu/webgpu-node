import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebGPUContext, createCanvas, installGlobals, requestAnimationFrame, cancelAnimationFrame, GPUBufferUsage, GPUMapMode, GPUTextureUsage, GPUValidationError } from '../index.mjs'
import { setup, flags, adapterOptions, compute, pixels, clear } from './helpers.mjs'

test('compute dispatch, async pipeline, queue submission, and mapped readback', async () => {
  const { gpu, device } = await setup()
  try { assert.deepEqual(await compute(device, [0, 1, 7, 123, 65535]), [0, 2, 14, 246, 131070]); assert.ok(gpu) }
  finally { device.destroy() }
})

test('mapping writes reach GPU; unmap detaches the ArrayBuffer', async () => {
  const { gpu, device } = await setup()
  try {
    const src = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_SRC, mappedAtCreation: true })
    const range = src.getMappedRange()
    new Uint32Array(range).set([9, 8, 7, 6])
    src.unmap()
    assert.equal(range.byteLength, 0)
    const dst = device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST })
    const encoder = device.createCommandEncoder()
    encoder.copyBufferToBuffer(src, 0, dst, 0, 16)
    device.queue.submit([encoder.finish()])
    await dst.mapAsync(GPUMapMode.READ)
    assert.deepEqual([...new Uint32Array(dst.getMappedRange())], [9, 8, 7, 6])
    dst.destroy(); src.destroy(); assert.ok(gpu)
  } finally { device.destroy() }
})

test('real shader compilation diagnostics and validation error scopes', async () => {
  const { gpu, device } = await setup()
  try {
    device.pushErrorScope('validation')
    const shader = device.createShaderModule({ code: 'this is not WGSL' })
    const compilation = await shader.getCompilationInfo()
    assert.ok(compilation.messages.some(m => m.type === 'error'))
    assert.ok(await device.popErrorScope() instanceof GPUValidationError)
    device.pushErrorScope('validation')
    const bad = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.STORAGE })
    assert.ok(await device.popErrorScope() instanceof GPUValidationError)
    bad.destroy()
    device.pushErrorScope('validation')
    assert.equal(await device.popErrorScope(), null)
    assert.ok(gpu)
  } finally { device.destroy() }
})

test('offscreen canvas frame caching, resizing, pixels, unconfigure, and teardown', async () => {
  const app = await createWebGPUContext(17, 9, { flags: flags(), adapterOptions: adapterOptions(), format: 'rgba8unorm' })
  try {
    assert.equal(app.canvas.getContext('2d'), null)
    const texture = app.context.getCurrentTexture()
    assert.equal(texture, app.context.getCurrentTexture())
    clear(app.device, texture, [1, 0, 0, 1])
    assert.deepEqual([...(await pixels(app.device, texture)).slice(0, 4)], [255, 0, 0, 255])
    app.present()
    assert.notEqual(app.context.getCurrentTexture(), texture)
    app.resize(31, 13)
    assert.equal(app.context.getCurrentTexture().width, 31)
    app.canvas.width = 7
    assert.equal(app.context.getCurrentTexture().width, 7)
    assert.equal(app.context.getCurrentTexture().height, 13)
    const config = app.context.getConfiguration()
    config.viewFormats.push('rgba8unorm-srgb')
    assert.deepEqual(app.context.getConfiguration().viewFormats, [])
    app.context.unconfigure()
    assert.equal(app.context.getConfiguration(), null)
    assert.throws(() => app.context.getCurrentTexture(), { name: 'InvalidStateError' })
    assert.throws(() => app.context.configure({ device: {}, format: 'rgba8unorm' }), TypeError)
  } finally { app.destroy(); app.destroy() }
  assert.throws(() => app.context.getCurrentTexture(), { name: 'InvalidStateError' })
})

test('multiple canvases share a borrowed device without destroying one another', async () => {
  const { gpu, device } = await setup()
  const a = await createWebGPUContext(8, 8, { gpu, device })
  const b = await createWebGPUContext(8, 8, { gpu, device })
  try {
    clear(device, a.context.getCurrentTexture(), [1, 0, 0, 1])
    clear(device, b.context.getCurrentTexture(), [0, 1, 0, 1])
    a.destroy()
    assert.deepEqual([...(await pixels(device, b.context.getCurrentTexture())).slice(0, 4)], [0, 255, 0, 255])
    assert.deepEqual(await compute(device), [2, 4, 6, 8])
  } finally { a.destroy(); b.destroy(); device.destroy() }
})

test('global installation preserves navigator and restores prior descriptors', async () => {
  const { gpu, device } = await setup()
  try {
    const target = { navigator: { userAgent: 'existing' }, GPUBufferUsage: 'old' }
    const restore = installGlobals({ gpu, target })
    assert.equal(target.navigator.gpu, gpu)
    assert.equal(target.navigator.userAgent, 'existing')
    assert.equal(target.GPUBufferUsage, GPUBufferUsage)
    restore(); restore()
    assert.deepEqual(target, { navigator: { userAgent: 'existing' }, GPUBufferUsage: 'old' })
    const canvas = createCanvas(2, 2)
    assert.throws(() => canvas.getContext('webgpu').configure({ device, format: 'rgba8unorm', colorSpace: 'display-p3' }), { name: 'NotSupportedError' })
    canvas.getContext('webgpu').destroy()
  } finally { device.destroy() }
})

test('render pipeline draws a triangle into an offscreen canvas', async () => {
  const app = await createWebGPUContext(64, 64, { flags: flags(), adapterOptions: adapterOptions(), format: 'rgba8unorm' })
  try {
    const module = app.device.createShaderModule({ code: `
      @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
        let p = array<vec2f,3>(vec2f(-1,-1),vec2f(1,-1),vec2f(0,1));
        return vec4f(p[i],0,1);
      }
      @fragment fn fs() -> @location(0) vec4f { return vec4f(0,0,1,1); }` })
    const pipeline = app.device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format: app.format }] } })
    const texture = app.context.getCurrentTexture()
    const encoder = app.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: texture.createView(), clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' }] })
    pass.setPipeline(pipeline); pass.draw(3); pass.end()
    app.device.queue.submit([encoder.finish()])
    const rgba = await pixels(app.device, texture)
    assert.deepEqual([...rgba.slice((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 4)], [0, 0, 255, 255])
    assert.deepEqual([...rgba.slice(0, 4)], [0, 0, 0, 255])
  } finally { app.destroy() }
})

test('installGlobals adds animation frames and self only where missing, and restores them', async () => {
  const { gpu, device } = await setup()
  try {
    const bare = {}
    const restoreBare = installGlobals({ gpu, target: bare })
    assert.equal(bare.requestAnimationFrame, requestAnimationFrame)
    assert.equal(bare.cancelAnimationFrame, cancelAnimationFrame)
    assert.equal(bare.self, bare)
    restoreBare()
    assert.deepEqual(Object.keys(bare), [])

    const ownFrame = () => 0
    const browserish = { requestAnimationFrame: ownFrame, self: 'existing' }
    const restoreBrowserish = installGlobals({ gpu, target: browserish })
    assert.equal(browserish.requestAnimationFrame, ownFrame)
    assert.equal(browserish.self, 'existing')
    restoreBrowserish()

    const optedOut = {}
    const restoreOptedOut = installGlobals({ gpu, target: optedOut, animationFrame: false })
    assert.equal(optedOut.requestAnimationFrame, undefined)
    assert.equal(optedOut.self, undefined)
    restoreOptedOut()
  } finally { device.destroy() }
})

test('requestAnimationFrame passes the frame time and cancelAnimationFrame stops it', async () => {
  const start = performance.now()
  const time = await new Promise(resolve => requestAnimationFrame(resolve))
  assert.ok(time >= start && time <= performance.now())
  let fired = false
  cancelAnimationFrame(requestAnimationFrame(() => { fired = true }))
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(fired, false)
})
