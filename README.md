# webgpu-node

WebGPU for Node.js. Run WGSL compute shaders, render offscreen, or present directly to an [@kmamal/sdl](https://github.com/kmamal/node-sdl) window without a browser.

This package is the browser-style API: `navigator.gpu`, a canvas and `GPUCanvasContext`, and window presentation. The GPU work is done by [native-dawn](https://github.com/monteslu/native-dawn), which ships Google's [Dawn](https://dawn.googlesource.com/dawn) prebuilt for each platform. The split is the same as [webgl-node](https://github.com/monteslu/webgl-node) on top of [native-gles](https://github.com/monteslu/native-gles).

Related: [webgl-node](https://github.com/monteslu/webgl-node), [webaudio-node](https://github.com/monteslu/webaudio-node), and [gamepad-node](https://github.com/monteslu/gamepad-node).

## Install

```sh
npm install webgpu-node
# Optional, for native windows:
npm install @kmamal/sdl
```

Requires Node.js 22 or newer and a working graphics driver. This package is plain JavaScript; installing it installs native-dawn, which downloads and verifies the native binary for your platform.

| Platform | Architectures | Primary backend |
| --- | --- | --- |
| Linux (glibc, Ubuntu 22.04 or newer for release binaries) | x64, ARM64 | Vulkan |
| macOS 11 or newer | x64, ARM64 | Metal |
| Windows | x64, ARM64 | D3D12 |

Linux builds also include Dawn's OpenGL and OpenGL ES backends and X11 and Wayland surfaces. Available backends and WebGPU features depend on your GPU and driver. No 32-bit or musl binaries are provided.

## Offscreen rendering

```js
import { createWebGPUContext } from 'webgpu-node'

const app = await createWebGPUContext(800, 600)
try {
  const encoder = app.device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: app.context.getCurrentTexture().createView(),
      clearValue: [0.2, 0.3, 0.4, 1],
      loadOp: 'clear',
      storeOp: 'store',
    }],
  })
  pass.end()
  app.device.queue.submit([encoder.finish()])
  // Copy the texture to a MAP_READ buffer before ending the frame if needed.
  app.present()
} finally {
  app.destroy()
}
```

`createWebGPUContext(width, height, options?)` asynchronously returns:

- `gpu`, `adapter`, `device`: Dawn WebGPU objects. `adapter` is null when borrowing a device.
- `canvas`, `context`, `format`: a canvas facade, its WebGPU context, and configured format.
- `present()`: present to a native window, or end the current offscreen frame.
- `resize(width, height)`: update texture dimensions; this does not resize the OS window.
- `attachWindow(window)` / `detachWindow()`: switch presentation while retaining the device and its resources.
- `destroy()`: release canvas resources and the device created by the factory. Idempotent; a device supplied in `options.device` remains alive.

Options include `gpu`, `device`, `flags`, `adapterOptions`, `deviceDescriptor`, `window`, `presentMode`, `videoDriver`, `format`, `usage`, and `alphaMode`. The default canvas usage is `RENDER_ATTACHMENT | COPY_SRC`, allowing readback. Dawn flags use `key=value` strings, e.g. `flags: ['backend=vulkan']`.

Devices stay valid even if the `gpu` object is garbage collected. Call `destroy()` (or `device.destroy()`) when finished to release GPU memory promptly. Only pending asynchronous GPU work keeps Node running; an idle device does not.

## Standard API and globals

```js
import { createGPU, createCanvas, installGlobals } from 'webgpu-node'

const gpu = createGPU()
const restore = installGlobals({ gpu })
const adapter = await navigator.gpu.requestAdapter()
if (!adapter) throw new Error('No WebGPU adapter')
const device = await adapter.requestDevice()
const canvas = createCanvas(640, 480)
const context = canvas.getContext('webgpu')
context.configure({ device, format: gpu.getPreferredCanvasFormat() })
// Use standard WebGPU pipelines, buffers, textures, encoders, and queues.
// Submit work, then context.present() after each frame.
context.destroy()
device.destroy()
restore()
```

Importing the package does not mutate globals. `installGlobals({ gpu, target?, animationFrame? })` installs WebGPU constructors/constants and `navigator.gpu`, preserving the existing navigator. It also adds `requestAnimationFrame`, `cancelAnimationFrame` and `self` where the target lacks them, which browser code such as Three.js expects; pass `animationFrame: false` to skip those. Node has no compositor, so an animation frame is a ~60 Hz timer that passes the frame time. Both functions are also named exports. Its returned function restores previous property descriptors. Constants and constructors are also named exports; `globals` contains all Dawn exports plus this package's `GPUCanvasContext`. `create` is an alias for `createGPU`.

`GPUCanvasContext` supports `configure`, `getConfiguration`, `unconfigure`, and `getCurrentTexture`, plus explicit `present`, `resize`, `attachWindow`, `detachWindow`, and `destroy`. Repeated texture acquisition within a frame returns the same texture. Presentation, resizing, and unconfiguration expire it: do not use a texture after `present()`. An offscreen context recycles its frame textures through a small ring, so a later frame may get an earlier texture object back, as a browser's swap chain does. Use one context per canvas. There is no browser compositor in Node, so the host must call `present()` after submitting the frame.

## SDL windows

```js
import sdl from '@kmamal/sdl'
import { createWebGPUContext } from 'webgpu-node'

const window = sdl.video.createWindow({
  title: 'WebGPU', width: 800, height: 600, webgpu: true, resizable: true,
})
const app = await createWebGPUContext(window.pixelWidth, window.pixelHeight, { window })
// Render into app.context.getCurrentTexture(), submit, then app.present().
window.on('close', () => app.destroy())
```

The context follows SDL resize events and uses physical pixel dimensions. `presentMode` defaults to `fifo`; `immediate`, `mailbox`, and `fifoRelaxed` are accepted only if the surface supports them. Format, usage, and alpha mode are also checked against surface capabilities.

The caller owns the window. Destroy/detach the context before explicitly destroying the window.

On Linux, @kmamal/sdl 0.11 gives X11 and Wayland windows the same handle layout, so the context reads SDL's current video driver (`sdl.info.drivers.video.current`) to tell them apart. Pass `videoDriver` to override it. Both X11 and Wayland sessions work.

## Examples and compatibility

From a source checkout:

```sh
npm run example:compute   # WGSL doubles [1,2,3,4]
npm run example:triangle  # Saves an offscreen triangle as triangle.ppm
npm run example:window    # Animated native window
```

Tested with Three.js 0.180.0's `WebGPURenderer`, including pixel readback. Supply the canvas and device to the renderer and install the globals; `installGlobals` provides the `self.requestAnimationFrame` Three.js uses. Three r180 also checks for `VideoFrame` during rendering, so the test supplies a stub that throws if constructed. See [test/three.test.mjs](test/three.test.mjs) for the setup. Other Three.js versions and features have not been tested.

Dawn provides the GPU API. Its Node bindings do not implement `copyExternalImageToTexture` or external video textures; upload decoded pixels with `queue.writeTexture`. Canvas color management supports sRGB with standard tone mapping. This package has not passed the full WebGPU conformance suite.

## Development

```sh
npm ci
npm run test:types
npm test
npm run test:window
npm run test:package
```

Native changes belong in native-dawn. To work on both at once, link a native-dawn checkout: `npm install --no-save --install-links=false ../native-dawn`.

Tests require a working hardware or software adapter and fail if none is available. Use `WEBGPU_NODE_TEST_FLAGS='["backend=vulkan"]'` to select a backend or `WEBGPU_NODE_TEST_FALLBACK=1` to request a fallback adapter. On headless Linux, `xvfb-run -a npm run test:window` with `SDL_VIDEODRIVER=x11` supplies a display.

## License

MIT. Dawn and its dependencies keep their own licenses; see native-dawn. Thanks to the Dawn team and kmamal for the native Node and SDL foundations.
