import native, { sdlVideoDriver } from './native.mjs'

function dimension(value, name) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > 0xffffffff) throw new RangeError(`${name} must be a positive uint32`)
  return number
}
const stateError = message => new DOMException(message, 'InvalidStateError')

export class GPUCanvasContext {
  #canvas; #configuration = null; #texture = null; #surface = null; #destroyed = false
  // Offscreen frames come from a small ring, as a browser's swap chain does:
  // allocating and destroying a full-size texture every frame cost ~90 µs at
  // 1280x720. A presented texture is reused two presents later, so (as in a
  // browser, where it would be destroyed) it must not be used after present;
  // the next frame never gets the texture just presented.
  #spare = []
  #window = null; #presentMode; #videoDriver; #resizeListener; #closeListener
  constructor(canvas, { window = null, presentMode = 'fifo', videoDriver } = {}) {
    this.#canvas = canvas
    this.#presentMode = presentMode
    this.#videoDriver = videoDriver
    if (!['fifo', 'fifoRelaxed', 'immediate', 'mailbox'].includes(presentMode)) throw new TypeError('Invalid presentMode')
    if (window) this.attachWindow(window)
  }
  get canvas() { return this.#canvas }
  #check() { if (this.#destroyed) throw stateError('Canvas context has been destroyed') }
  // Ends the current frame. Offscreen textures go back to the ring; window
  // surface textures belong to the surface and are always released.
  #discard(recycle = false) {
    const texture = this.#texture
    this.#texture = null
    if (!texture) return
    if (recycle && !this.#surface && this.#spare.length < 3) this.#spare.push(texture)
    else texture.destroy()
  }
  // Drops the ring when the size or configuration it was made for changes.
  #flushSpare() { for (const texture of this.#spare) texture.destroy(); this.#spare = [] }
  #configureSurface() {
    if (!this.#configuration || !this.#window) return
    if (this.#window.destroyed) throw stateError('SDL window has been destroyed')
    const { device, format, usage, alphaMode, viewFormats } = this.#configuration
    if (!this.#surface) this.#surface = new native.NativeSurface(device, this.#window.native.gpu, this.#videoDriver ?? sdlVideoDriver())
    this.#surface.configure({ width: this.canvas.width, height: this.canvas.height, format, usage, alphaMode, viewFormats, presentMode: this.#presentMode })
  }
  configure(configuration) {
    this.#check()
    const { device, format, usage = native.globals.GPUTextureUsage.RENDER_ATTACHMENT,
      viewFormats = [], alphaMode = 'opaque', colorSpace = 'srgb', toneMapping = { mode: 'standard' } } = configuration
    if (!(device instanceof native.globals.GPUDevice)) throw new TypeError('device must be a GPUDevice from webgpu-node')
    if (!['rgba8unorm', 'bgra8unorm', 'rgba16float'].includes(format)) throw new TypeError('Unsupported canvas format')
    if (!['opaque', 'premultiplied'].includes(alphaMode)) throw new TypeError('Invalid alphaMode')
    if (colorSpace !== 'srgb' || (toneMapping.mode ?? 'standard') !== 'standard') throw new DOMException('Only sRGB with standard tone mapping is supported', 'NotSupportedError')
    if (!Number.isInteger(usage) || usage <= 0 || usage > 31) throw new TypeError('Invalid texture usage')
    if (!Array.isArray(viewFormats)) throw new TypeError('viewFormats must be an array')
    this.unconfigure()
    this.#configuration = { device, format, usage, viewFormats: [...viewFormats], alphaMode, colorSpace, toneMapping: { mode: 'standard' } }
    try { this.#configureSurface() } catch (error) { this.unconfigure(); throw error }
  }
  getConfiguration() {
    const c = this.#configuration
    return c ? { ...c, viewFormats: [...c.viewFormats], toneMapping: { ...c.toneMapping } } : null
  }
  unconfigure() {
    this.#discard()
    this.#flushSpare()
    this.#surface?.destroy()
    this.#surface = null
    this.#configuration = null
  }
  getCurrentTexture() {
    this.#check()
    if (!this.#configuration) throw stateError('Canvas context is not configured')
    if (this.#texture) return this.#texture
    const { device, format, usage, viewFormats } = this.#configuration
    this.#texture = this.#surface ? this.#surface.getCurrentTexture() : (this.#spare.length >= 2 ? this.#spare.shift() : null) ?? device.createTexture({
      label: 'webgpu-node canvas', size: [this.canvas.width, this.canvas.height], format, usage, viewFormats,
    })
    return this.#texture
  }
  // Node has no browser compositor: the host explicitly ends each frame.
  present() {
    this.#check()
    if (!this.#configuration) throw stateError('Canvas context is not configured')
    if (!this.#texture) return
    if (this.#surface) this.#surface.present()
    this.#discard(true)
  }
  resize(width, height) {
    this.#check()
    width = dimension(width, 'width'); height = dimension(height, 'height')
    this.#discard()
    this.#flushSpare()
    this.#canvas._setSize(width, height)
    this.#configureSurface()
  }
  attachWindow(window) {
    this.#check()
    if (!window || window.destroyed || !Buffer.isBuffer(window.native?.gpu)) throw new TypeError('Expected an SDL window created with webgpu: true')
    this.detachWindow()
    this.#window = window
    this.#canvas._setWindow(window)
    this.#resizeListener = () => {
      if (!window.destroyed && window.pixelWidth > 0 && window.pixelHeight > 0) this.resize(window.pixelWidth, window.pixelHeight)
    }
    this.#closeListener = () => this.detachWindow()
    window.on('resize', this.#resizeListener)
    // SDL's own close listener destroys the native window. Release our surface
    // first, including on a user-initiated close or window.destroy().
    window.prependListener('close', this.#closeListener)
    try { this.resize(window.pixelWidth, window.pixelHeight) } catch (error) { this.detachWindow(); throw error }
  }
  detachWindow() {
    this.#discard()
    this.#flushSpare()
    this.#surface?.destroy(); this.#surface = null
    if (this.#window) {
      this.#window.removeListener('resize', this.#resizeListener)
      this.#window.removeListener('close', this.#closeListener)
      this.#window = null
      this.#canvas._setWindow(null)
    }
  }
  destroy() {
    if (this.#destroyed) return
    this.detachWindow(); this.unconfigure(); this.#destroyed = true
  }
}

export function createCanvas(width = 300, height = 150, options = {}) {
  let w = dimension(width, 'width'), h = dimension(height, 'height'), context, activeWindow = null
  const canvas = new EventTarget()
  Object.defineProperties(canvas, {
    width: { enumerable: true, get: () => w, set: v => context.resize(v, h) },
    height: { enumerable: true, get: () => h, set: v => context.resize(w, v) },
    clientWidth: { enumerable: true, get: () => activeWindow?.width ?? w },
    clientHeight: { enumerable: true, get: () => activeWindow?.height ?? h },
    _setSize: { value: (width, height) => { w = width; h = height } },
    _setWindow: { value: window => { activeWindow = window } },
  })
  canvas.style = {}
  canvas.getContext = type => type === 'webgpu' ? context : null
  canvas.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: canvas.clientWidth, height: canvas.clientHeight, right: canvas.clientWidth, bottom: canvas.clientHeight })
  canvas.setAttribute = (name, value) => { if (name === 'width' || name === 'height') canvas[name] = Number(value) }
  context = new GPUCanvasContext(canvas, options)
  return canvas
}
