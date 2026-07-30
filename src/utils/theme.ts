const THEME_META = 'theme-color'
const SCHEME_META = 'color-scheme'

const mediaQueries = [
  '(prefers-color-scheme: light)',
  '(prefers-color-scheme: dark)',
] as const

/** iOS Safari：替换整组 meta，仅改 content 有时不刷新顶底栏 */
const syncThemeMetas = (color: string) => {
  document.querySelectorAll<HTMLMetaElement>(`meta[name="${THEME_META}"]`).forEach((m) => m.remove())

  const plain = document.createElement('meta')
  plain.setAttribute('name', THEME_META)
  plain.setAttribute('content', color)
  document.head.appendChild(plain)

  mediaQueries.forEach((media) => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', THEME_META)
    meta.setAttribute('media', media)
    meta.setAttribute('content', color)
    document.head.appendChild(meta)
  })
}

const ensureSchemeMeta = (): HTMLMetaElement => {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${SCHEME_META}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', SCHEME_META)
    document.head.appendChild(meta)
  }
  return meta
}

/** 全站统一浅色；同步 iOS Safari 顶栏 / 底栏 */
export const setChromeTheme = (color: string = CHROME_THEME.soft) => {
  syncThemeMetas(color)
  ensureSchemeMeta().setAttribute('content', 'light only')

  const root = document.documentElement
  root.style.setProperty('--chrome-bg', color)
  root.style.backgroundColor = color
  root.style.colorScheme = 'only light'
  document.body.style.backgroundColor = color
}

export const CHROME_THEME = {
  /** 全站统一白底，供 Safari 采样顶底栏 */
  soft: '#ffffff',
} as const
