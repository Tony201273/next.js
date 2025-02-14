import { normalizeLocalePath } from '../../i18n/normalize-locale-path'
import { removePathPrefix } from './remove-path-prefix'
import { pathHasPrefix } from './path-has-prefix'
import { I18NProvider } from '../../../../server/future/helpers/i18n-provider'

export interface NextPathnameInfo {
  /**
   * The base path in case the pathname included it.
   */
  basePath?: string
  /**
   * The buildId for when the parsed URL is a data URL. Parsing it can be
   * disabled with the `parseData` option.
   */
  buildId?: string
  /**
   * If there was a locale in the pathname, this will hold its value.
   */
  locale?: string
  /**
   * The processed pathname without a base path, locale, or data URL elements
   * when parsing it is enabled.
   */
  pathname: string
  /**
   * A boolean telling if the pathname had a trailingSlash. This can be only
   * true if trailingSlash is enabled.
   */
  trailingSlash?: boolean
}

interface Options {
  /**
   * When passed to true, this function will also parse Nextjs data URLs.
   */
  parseData?: boolean
  /**
   * A partial of the Next.js configuration to parse the URL.
   */
  nextConfig?: {
    basePath?: string
    i18n?: { locales?: string[] } | null
    trailingSlash?: boolean
  }

  /**
   * If provided, this normalizer will be used to detect the locale instead of
   * the default locale detection.
   */
  i18nProvider?: I18NProvider
}

export function getNextPathnameInfo(pathname: string, options: Options) {
  const { basePath, i18n, trailingSlash } = options.nextConfig ?? {}
  const info: NextPathnameInfo = {
    pathname: pathname,
    trailingSlash: pathname !== '/' ? pathname.endsWith('/') : trailingSlash,
  }

  if (basePath && pathHasPrefix(info.pathname, basePath)) {
    info.pathname = removePathPrefix(info.pathname, basePath)
    info.basePath = basePath
  }

  if (
    options.parseData === true &&
    info.pathname.startsWith('/_next/data/') &&
    info.pathname.endsWith('.json')
  ) {
    const paths = info.pathname
      .replace(/^\/_next\/data\//, '')
      .replace(/\.json$/, '')
      .split('/')

    const buildId = paths[0]
    info.pathname = paths[1] !== 'index' ? `/${paths.slice(1).join('/')}` : '/'
    info.buildId = buildId
  }

  // If provided, use the locale route normalizer to detect the locale instead
  // of the function below.
  if (options.i18nProvider) {
    const result = options.i18nProvider.analyze(info.pathname, {
      // We set this to undefined because the default locale detection is
      // completed out of this function.
      defaultLocale: undefined,
    })
    info.locale = result.detectedLocale
    info.pathname = result.pathname ?? info.pathname
  } else if (i18n) {
    const pathLocale = normalizeLocalePath(info.pathname, i18n.locales)
    info.locale = pathLocale.detectedLocale
    info.pathname = pathLocale.pathname ?? info.pathname
  }

  return info
}
