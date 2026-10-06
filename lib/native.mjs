import { createRequire } from 'node:module'
import native from 'native-dawn'

export default native

// @kmamal/sdl 0.11 hands over the same pointers for X11 and Wayland windows on
// Linux, so the surface needs SDL's video driver name to tell them apart.
export function sdlVideoDriver() {
  try { return createRequire(import.meta.url)('@kmamal/sdl').info.drivers.video.current } catch { return undefined }
}
