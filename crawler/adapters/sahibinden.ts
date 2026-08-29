import * as cheerio from 'cheerio'
import type { PortalAdapter, ListingStub, RawListing, ListingCategory } from './types'

const BASE = 'https://www.sahibinden.com'

/** kategori -> arama yolu (arsa: `satilik-arsa`, konut: `satilik`) */
const CATEGORY_PATH: Record<ListingCategory, string> = {
  arsa: 'satilik-arsa',
  konut: 'satilik',
}

/** Sahibinden arama sayfası her sayfada 20 ilan; 2+ sayfa `?pagingOffset=20*p`. */
const PAGE_SIZE = 20

/** Detay URL sonundaki ilan id'si: `/ilan/<slug>-<rakamlar>/detay` */
const ILAN_ID_RE = /\/ilan\/[^/]*?-(\d{6,})(?:\/detay)?(?:[/?#]|$)/i

/** Boşlukları (nbsp dâhil) tekilleştirip kırpar. */
function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/** Türkçe-güvenli küçük harf. */
function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR')
}

export const sahibindenAdapter: PortalAdapter = {
  source: 'sahibinden',
  // gerçek Sahibinden arama sayfalarında her ilan satırı bu sınıfı taşır
  searchResultHint: 'searchResultsItem',
  // gerçek Sahibinden ilan detay sayfasında "İlan bilgileri" listesi
  detailHint: 'classifiedInfoList',

  searchUrls(il, category, maxPages) {
    const slug = clean(trLower(il)).replace(/\s+/g, '-')
    const pathPart = CATEGORY_PATH[category]
    const urls: string[] = []
    for (let p = 0; p < maxPages; p++) {
      const q = p > 0 ? `?pagingOffset=${p * PAGE_SIZE}` : ''
      urls.push(`${BASE}/${pathPart}/${slug}${q}`)
    }
    return urls
  },

  parseSearchPage(html) {
    const $ = cheerio.load(html)
    const seen = new Map<string, ListingStub>()
    $('tr.searchResultsItem').each((_, el) => {
      const $el = $(el)
      const id = $el.attr('data-id')
      if (!id || !/^\d+$/.test(id) || seen.has(id)) return
      const href =
        $el.find('a.classifiedTitle').attr('href') ??
        $el.find('a[href*="/ilan/"]').attr('href')
      if (!href || !href.includes('/ilan/')) return
      seen.set(id, {
        sourceListingId: id,
        detailUrl: href.startsWith('http') ? href : `${BASE}${href}`,
        rawTitle: clean($el.find('a.classifiedTitle').text()) || undefined,
        rawPrice: clean($el.find('.searchResultsPriceValue').text()) || undefined,
      })
    })
    return [...seen.values()]
  },

  parseDetailPage(html, url): RawListing {
    const $ = cheerio.load(html)

    // "İlan bilgileri" tablosu: normalize edilmiş (tr-lower) label -> value
    const info: Record<string, string> = {}
    $('.classifiedInfoList li').each((_, li) => {
      const $li = $(li)
      const key = trLower(clean($li.find('strong').first().text()))
      let value = clean($li.find('span').first().text())
      if (!value) value = clean($li.find('a').first().text())
      if (key) info[key] = value
    })

    const pick = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = info[k]
        if (v && v !== 'Belirtilmemiş') return v
      }
      return undefined
    }

    // ilan id: info map -> URL sonundaki rakamlar
    const idFromUrl = url.match(ILAN_ID_RE)?.[1] ?? url.match(/(\d{6,})/)?.[1] ?? ''
    const sourceListingId = pick('ilan no') ?? idFromUrl

    // fiyat
    const rawPrice =
      clean($('.classified-price-wrapper, .classified-price').first().text()) ||
      pick('fiyat') ||
      undefined

    // konum kırılımı: .classifiedInfo h2 içindeki breadcrumb anchor'ları
    const loc = $('.classifiedInfo h2 a')
      .map((_, a) => clean($(a).text()))
      .get()
      .filter(Boolean)
    const rawIl = loc[0]
    const rawIlce = loc[1] ?? $('#gmap').attr('data-town-name') ?? undefined
    const rawMahalle = loc.length >= 3 ? loc[loc.length - 1] : undefined

    // harita pini
    const latAttr = $('#gmap').attr('data-lat')
    const lonAttr = $('#gmap').attr('data-lon')
    const lat = latAttr != null && latAttr !== '' ? Number(latAttr) : undefined
    const lng = lonAttr != null && lonAttr !== '' ? Number(lonAttr) : undefined

    // galeri foto'ları (best effort)
    const photoUrls = [
      ...new Set(
        $('.classifiedDetailMainPhoto img, .classifiedThumbList img')
          .map((_, img) => $(img).attr('data-src') ?? $(img).attr('src') ?? '')
          .get()
          .filter((src) => src.startsWith('https://') && /\/photos\//.test(src)),
      ),
    ]

    return {
      source: 'sahibinden',
      sourceListingId,
      sourceUrl: url,
      rawTitle: clean($('.classifiedDetailTitle h1').first().text()) || undefined,
      rawDescription: clean($('#classifiedDescription').text()) || undefined,
      rawPrice,
      rawArea: pick('m²', 'm² (brüt)', 'm² (net)', 'm2', 'metrekare'),
      rawType:
        pick('emlak tipi', 'tipi') ??
        (clean($('.classifiedDetailTitle h2').first().text()) || undefined),
      rawImarStatus: pick('imar durumu'),
      rawIl: rawIl || undefined,
      rawIlce: rawIlce || undefined,
      rawMahalle: rawMahalle || undefined,
      rawAdaNo: pick('ada no'),
      rawParselNo: pick('parsel no'),
      rawListedAt: pick('ilan tarihi'),
      lat: lat != null && Number.isFinite(lat) ? lat : undefined,
      lng: lng != null && Number.isFinite(lng) ? lng : undefined,
      photoUrls,
      extra: {
        source: 'dom',
        info,
        locationBreadcrumb: loc,
      },
    }
  },
}

export default sahibindenAdapter
