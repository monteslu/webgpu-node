import assert from 'node:assert/strict'
import sdl from '@kmamal/sdl'
import { createWebGPUContext } from '../index.mjs'
import { flags, adapterOptions, clear, pixels, compute } from './helpers.mjs'

const window = sdl.video.createWindow({ title: 'webgpu-node native window test', width: 96, height: 64, webgpu: true, resizable: true })
let app
try {
  app = await createWebGPUContext(96, 64, { window, flags: flags(), adapterOptions: adapterOptions() })
  for (let frame = 0; frame < 3; ++frame) {
    const texture = app.context.getCurrentTexture()
    assert.equal(texture, app.context.getCurrentTexture())
    clear(app.device, texture, [1, 0, 0, 1])
    assert.deepEqual([...(await pixels(app.device, texture)).slice(0, 4)], [255, 0, 0, 255])
    app.present()
  }
  app.resize(48, 32)
  assert.equal(app.context.getCurrentTexture().width, 48)
  clear(app.device, app.context.getCurrentTexture(), [0, 0, 1, 1])
  app.present()
  app.detachWindow()
  clear(app.device, app.context.getCurrentTexture(), [0, 1, 0, 1])
  assert.deepEqual([...(await pixels(app.device, app.context.getCurrentTexture())).slice(0, 4)], [0, 255, 0, 255])
  app.attachWindow(window)
  clear(app.device, app.context.getCurrentTexture(), [0, 0, 1, 1])
  app.present()
  assert.deepEqual(await compute(app.device), [2, 4, 6, 8])
  window.destroy()
  assert.equal(window.destroyed, true)
  clear(app.device, app.context.getCurrentTexture(), [0, 1, 0, 1])
  assert.deepEqual([...(await pixels(app.device, app.context.getCurrentTexture())).slice(0, 4)], [0, 255, 0, 255])
  assert.equal(app.canvas.clientWidth, app.canvas.width)
  console.log('SDL surface: present, pixels, resize, detach/reattach, close lifecycle, and compute passed')
} finally { app?.destroy(); if (!window.destroyed) window.destroy() }
