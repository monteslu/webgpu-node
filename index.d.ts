/// <reference types="@webgpu/types" />
/** Structural subset of an @kmamal/sdl window; SDL is optional for headless use. */
export interface SDLWindow {
  readonly destroyed: boolean
  readonly width: number
  readonly height: number
  readonly pixelWidth: number
  readonly pixelHeight: number
  /** SDL 0.11's declarations omit gpu; the runtime validates its presence. */
  readonly native: { readonly handle?: Uint8Array | null; readonly gpu?: Uint8Array }
  on(event: 'resize' | 'close', listener: () => void): unknown
}

export type GPU = globalThis.GPU
export declare const GPU: typeof globalThis.GPU
export type GPUAdapter = globalThis.GPUAdapter
export declare const GPUAdapter: typeof globalThis.GPUAdapter
export type GPUAdapterInfo = globalThis.GPUAdapterInfo
export declare const GPUAdapterInfo: typeof globalThis.GPUAdapterInfo
export type GPUDevice = globalThis.GPUDevice
export declare const GPUDevice: typeof globalThis.GPUDevice
export type GPUQueue = globalThis.GPUQueue
export declare const GPUQueue: typeof globalThis.GPUQueue
export type GPUBuffer = globalThis.GPUBuffer
export declare const GPUBuffer: typeof globalThis.GPUBuffer
export type GPUTexture = globalThis.GPUTexture
export declare const GPUTexture: typeof globalThis.GPUTexture
export type GPUTextureView = globalThis.GPUTextureView
export declare const GPUTextureView: typeof globalThis.GPUTextureView
export type GPUSampler = globalThis.GPUSampler
export declare const GPUSampler: typeof globalThis.GPUSampler
export type GPUShaderModule = globalThis.GPUShaderModule
export declare const GPUShaderModule: typeof globalThis.GPUShaderModule
export type GPUCommandEncoder = globalThis.GPUCommandEncoder
export declare const GPUCommandEncoder: typeof globalThis.GPUCommandEncoder
export type GPUCommandBuffer = globalThis.GPUCommandBuffer
export declare const GPUCommandBuffer: typeof globalThis.GPUCommandBuffer
export type GPUComputePassEncoder = globalThis.GPUComputePassEncoder
export declare const GPUComputePassEncoder: typeof globalThis.GPUComputePassEncoder
export type GPURenderPassEncoder = globalThis.GPURenderPassEncoder
export declare const GPURenderPassEncoder: typeof globalThis.GPURenderPassEncoder
export type GPUComputePipeline = globalThis.GPUComputePipeline
export declare const GPUComputePipeline: typeof globalThis.GPUComputePipeline
export type GPURenderPipeline = globalThis.GPURenderPipeline
export declare const GPURenderPipeline: typeof globalThis.GPURenderPipeline
export type GPUBindGroup = globalThis.GPUBindGroup
export declare const GPUBindGroup: typeof globalThis.GPUBindGroup
export type GPUBindGroupLayout = globalThis.GPUBindGroupLayout
export declare const GPUBindGroupLayout: typeof globalThis.GPUBindGroupLayout
export type GPUPipelineLayout = globalThis.GPUPipelineLayout
export declare const GPUPipelineLayout: typeof globalThis.GPUPipelineLayout
export type GPURenderBundle = globalThis.GPURenderBundle
export declare const GPURenderBundle: typeof globalThis.GPURenderBundle
export type GPURenderBundleEncoder = globalThis.GPURenderBundleEncoder
export declare const GPURenderBundleEncoder: typeof globalThis.GPURenderBundleEncoder
export type GPUQuerySet = globalThis.GPUQuerySet
export declare const GPUQuerySet: typeof globalThis.GPUQuerySet
export type GPUValidationError = globalThis.GPUValidationError
export declare const GPUValidationError: typeof globalThis.GPUValidationError
export type GPUOutOfMemoryError = globalThis.GPUOutOfMemoryError
export declare const GPUOutOfMemoryError: typeof globalThis.GPUOutOfMemoryError
export type GPUInternalError = globalThis.GPUInternalError
export declare const GPUInternalError: typeof globalThis.GPUInternalError
export declare const GPUBufferUsage: typeof globalThis.GPUBufferUsage
export declare const GPUTextureUsage: typeof globalThis.GPUTextureUsage
export declare const GPUMapMode: typeof globalThis.GPUMapMode
export declare const GPUShaderStage: typeof globalThis.GPUShaderStage
export declare const GPUColorWrite: typeof globalThis.GPUColorWrite
export type GPUCompilationInfo = globalThis.GPUCompilationInfo
export declare const GPUCompilationInfo: typeof globalThis.GPUCompilationInfo
export type GPUCompilationMessage = globalThis.GPUCompilationMessage
export declare const GPUCompilationMessage: typeof globalThis.GPUCompilationMessage
export type GPUDeviceLostInfo = globalThis.GPUDeviceLostInfo
export declare const GPUDeviceLostInfo: typeof globalThis.GPUDeviceLostInfo
export type GPUError = globalThis.GPUError
export declare const GPUError: typeof globalThis.GPUError
export type GPUExternalTexture = globalThis.GPUExternalTexture
export declare const GPUExternalTexture: typeof globalThis.GPUExternalTexture
export type GPUPipelineError = globalThis.GPUPipelineError
export declare const GPUPipelineError: typeof globalThis.GPUPipelineError
export type GPUSupportedFeatures = globalThis.GPUSupportedFeatures
export declare const GPUSupportedFeatures: { readonly prototype: GPUSupportedFeatures }
export type GPUSupportedLimits = globalThis.GPUSupportedLimits
export declare const GPUSupportedLimits: typeof globalThis.GPUSupportedLimits
export type GPUUncapturedErrorEvent = globalThis.GPUUncapturedErrorEvent
export declare const GPUUncapturedErrorEvent: typeof globalThis.GPUUncapturedErrorEvent
export type WGSLLanguageFeatures = globalThis.WGSLLanguageFeatures
export declare const WGSLLanguageFeatures: { readonly prototype: WGSLLanguageFeatures }

export interface Canvas extends EventTarget {
  width: number
  height: number
  readonly clientWidth: number
  readonly clientHeight: number
  style: Record<string, string>
  getContext(type: 'webgpu'): GPUCanvasContext
  getContext(type: string): GPUCanvasContext | null
  getBoundingClientRect(): { x: number; y: number; left: number; top: number; right: number; bottom: number; width: number; height: number }
  setAttribute(name: string, value: string): void
}
export interface CanvasOptions {
  window?: SDLWindow
  presentMode?: 'fifo' | 'fifoRelaxed' | 'immediate' | 'mailbox'
  /** SDL video driver ('x11' or 'wayland') for Linux windows; read from @kmamal/sdl when omitted. */
  videoDriver?: string
}
export declare class GPUCanvasContext {
  constructor(canvas: Canvas, options?: CanvasOptions)
  readonly canvas: Canvas
  configure(configuration: GPUCanvasConfiguration): void
  getConfiguration(): GPUCanvasConfiguration | null
  unconfigure(): void
  getCurrentTexture(): GPUTexture
  present(): void
  resize(width: number, height: number): void
  attachWindow(window: SDLWindow): void
  detachWindow(): void
  destroy(): void
}
export interface ContextOptions extends CanvasOptions {
  gpu?: GPU
  /** A borrowed device; destroy() leaves it alive. */
  device?: GPUDevice
  flags?: string[]
  adapterOptions?: GPURequestAdapterOptions
  deviceDescriptor?: GPUDeviceDescriptor
  format?: GPUTextureFormat
  usage?: GPUTextureUsageFlags
  alphaMode?: GPUCanvasAlphaMode
}
export interface WebGPUContext {
  gpu: GPU
  adapter: GPUAdapter | null
  device: GPUDevice
  canvas: Canvas
  context: GPUCanvasContext
  format: GPUTextureFormat
  present(): void
  resize(width: number, height: number): void
  attachWindow(window: SDLWindow): void
  detachWindow(): void
  destroy(): void
}
export declare function createGPU(flags?: string[]): GPU
export { createGPU as create }
export declare function createCanvas(width?: number, height?: number, options?: CanvasOptions): Canvas
export declare function createWebGPUContext(width: number, height: number, options?: ContextOptions): Promise<WebGPUContext>
export declare const globals: Readonly<{
  GPU: typeof globalThis.GPU
  GPUAdapter: typeof globalThis.GPUAdapter
  GPUAdapterInfo: typeof globalThis.GPUAdapterInfo
  GPUDevice: typeof globalThis.GPUDevice
  GPUQueue: typeof globalThis.GPUQueue
  GPUBuffer: typeof globalThis.GPUBuffer
  GPUTexture: typeof globalThis.GPUTexture
  GPUTextureView: typeof globalThis.GPUTextureView
  GPUSampler: typeof globalThis.GPUSampler
  GPUShaderModule: typeof globalThis.GPUShaderModule
  GPUCommandEncoder: typeof globalThis.GPUCommandEncoder
  GPUCommandBuffer: typeof globalThis.GPUCommandBuffer
  GPUComputePassEncoder: typeof globalThis.GPUComputePassEncoder
  GPURenderPassEncoder: typeof globalThis.GPURenderPassEncoder
  GPUComputePipeline: typeof globalThis.GPUComputePipeline
  GPURenderPipeline: typeof globalThis.GPURenderPipeline
  GPUBindGroup: typeof globalThis.GPUBindGroup
  GPUBindGroupLayout: typeof globalThis.GPUBindGroupLayout
  GPUPipelineLayout: typeof globalThis.GPUPipelineLayout
  GPURenderBundle: typeof globalThis.GPURenderBundle
  GPURenderBundleEncoder: typeof globalThis.GPURenderBundleEncoder
  GPUQuerySet: typeof globalThis.GPUQuerySet
  GPUValidationError: typeof globalThis.GPUValidationError
  GPUOutOfMemoryError: typeof globalThis.GPUOutOfMemoryError
  GPUInternalError: typeof globalThis.GPUInternalError
  GPUBufferUsage: typeof globalThis.GPUBufferUsage
  GPUTextureUsage: typeof globalThis.GPUTextureUsage
  GPUMapMode: typeof globalThis.GPUMapMode
  GPUShaderStage: typeof globalThis.GPUShaderStage
  GPUColorWrite: typeof globalThis.GPUColorWrite
  GPUCanvasContext: typeof GPUCanvasContext
  GPUCompilationInfo: typeof globalThis.GPUCompilationInfo
  GPUCompilationMessage: typeof globalThis.GPUCompilationMessage
  GPUDeviceLostInfo: typeof globalThis.GPUDeviceLostInfo
  GPUError: typeof globalThis.GPUError
  GPUExternalTexture: typeof globalThis.GPUExternalTexture
  GPUPipelineError: typeof globalThis.GPUPipelineError
  GPUSupportedFeatures: typeof GPUSupportedFeatures
  GPUSupportedLimits: typeof globalThis.GPUSupportedLimits
  GPUUncapturedErrorEvent: typeof globalThis.GPUUncapturedErrorEvent
  WGSLLanguageFeatures: typeof WGSLLanguageFeatures
}>
/** Returns an idempotent function that restores the previous property descriptors. */
export declare function installGlobals(options?: { gpu?: GPU; target?: object }): () => void
