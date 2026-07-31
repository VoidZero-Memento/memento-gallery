export type GatePayload = {
  spaceName: string
  count: number
}

export type GalleryImage = {
  id: number
  name: string
  url: string
  /** LazyImg 约定：height / width，用于加载前占位 */
  ratio: number
}
