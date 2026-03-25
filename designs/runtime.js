(() => {
  if (window.__waveeDesignRuntimeMounted) return
  window.__waveeDesignRuntimeMounted = true

  const TOKEN = 'wavee_access_token'
  const REFRESH = 'wavee_refresh_token'
  const API_DEFAULT = 'http://127.0.0.1:8787'
  const TRACKS_CACHE_TTL_MS = 45_000
  const page = document.body?.dataset?.waveePage || ''
  const ACTIVE_RUNTIME_PAGES = new Set(['home', 'my-wave'])
  if (!ACTIVE_RUNTIME_PAGES.has(page)) return
  const searchParams = new URLSearchParams(location.search)
  const isEmbeddedFrame = window.self !== window.top
  const embedMode = searchParams.get('embed') === 'app' || isEmbeddedFrame
  const apiBase = (() => {
    const q = searchParams.get('api')
    if (q) localStorage.setItem('wavee_api_base', q)
    return q || localStorage.getItem('wavee_api_base') || API_DEFAULT
  })()
  const TRACKS_CACHE_KEY = `wavee_tracks_cache_${apiBase}`
  const COVER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMxMDNhOWYiLz48dGV4dCB4PSI1MCUiIHk9IjUzJSIgZmlsbD0iI2YxZjVmOSIgc3R5bGU9ImZvbnQ6IGJvbGQgNDJweCBtb25vc3BhY2U7IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7imao8L3RleHQ+PC9zdmc+'

  document.body.dataset.waveeEmbed = embedMode ? 'app' : 'standalone'

  const state = {
    tracks: [],
    list: [],
    likes: new Set(),
    playlists: [],
    myWave: [],
    queue: [],
    idx: -1,
    track: null,
    playing: false,
    t: 0,
    d: 0,
    v: 80,
    shuffle: false,
    repeat: false,
  }

  const $ = (id) => document.getElementById(id)
  const el = {
    play: $('wavee-player-play'),
    prev: $('wavee-player-prev'),
    next: $('wavee-player-next'),
    back: $('wavee-player-backward'),
    fwd: $('wavee-player-forward'),
    like: $('wavee-player-like'),
    queue: $('wavee-player-queue'),
    prog: $('wavee-player-progress'),
    progFill: $('wavee-player-progress-fill'),
    progThumb: $('wavee-player-progress-thumb'),
    cur: $('wavee-player-current-time'),
    dur: $('wavee-player-duration'),
    vol: $('wavee-player-volume'),
    volFill: $('wavee-player-volume-fill'),
    cover: $('wavee-player-cover'),
    title: $('wavee-player-title'),
    artist: $('wavee-player-artist'),
    shuf: $('wavee-player-shuffle'),
    rep: $('wavee-player-repeat'),
    hero: $('home-hero-listen'),
    homeHeroTip: $('home-hero-tip'),
    homeWaveArt: $('home-wave-art'),
    homeWaveArtImage: $('home-wave-art-image'),
    homeVisualizer: $('home-audio-visualizer'),
    homeGreeting: $('home-greeting'),
    homeNewReleases: $('home-new-releases-row'),
    homeNewReleasesPrev: $('home-new-releases-prev'),
    homeNewReleasesNext: $('home-new-releases-next'),
    homePopular: $('home-popular-row'),
    homePopularPrev: $('home-popular-prev'),
    homePopularNext: $('home-popular-next'),
    homeGenres: $('home-genres-grid'),
    homeArtists: $('home-artists-row'),
    homeArtistsPrev: $('home-artists-prev'),
    homeArtistsNext: $('home-artists-next'),
    homeEditorial: $('home-editorial-row'),
    homeDiscovery: $('home-discovery-row'),
    homeDiscoveryPrev: $('home-discovery-prev'),
    homeDiscoveryNext: $('home-discovery-next'),
    myWaveHeroPlay: $('my-wave-hero-play'),
    myWaveHeroTrack: $('my-wave-hero-track'),
    myWaveHeroArtist: $('my-wave-hero-artist'),
    myWaveHeroReason: $('my-wave-hero-reason'),
    myWaveHeroGenre: $('my-wave-hero-genre'),
    myWaveStageTone: $('my-wave-stage-tone'),
    myWaveStageSubtitle: $('my-wave-stage-subtitle'),
    myWaveStreamSection: $('my-wave-stream-section'),
    myWaveStreamRow: $('my-wave-stream-row'),
    myWaveSecondarySection: $('my-wave-secondary-section'),
    myWaveSecondaryGrid: $('my-wave-secondary-grid'),
    myWaveEmpty: $('my-wave-empty'),
    myWaveEmptyText: $('my-wave-empty-text'),
    myWaveRefresh: $('my-wave-refresh'),
  }

  if (embedMode) {
    document.querySelector('nav')?.remove()
    el.play?.closest('.fixed')?.remove()
    el.play?.closest('.player-shell')?.remove()
    document.body.style.paddingBottom = '1.5rem'
  }

  const audio = embedMode ? null : document.createElement('audio')
  if (audio) {
    audio.preload = 'metadata'
    audio.style.display = 'none'
    document.body.appendChild(audio)
  }

  const ytHost = embedMode ? null : document.createElement('div')
  if (ytHost) {
    Object.assign(ytHost.style, { position: 'fixed', left: '-10000px', top: '-10000px', width: '1px', height: '1px', opacity: '0' })
    document.body.appendChild(ytHost)
  }
  const yt = { player: null, vid: '', timer: null }
  const playbackPrefetchState = {
    seen: new Set(),
    timer: null,
  }
  const railAnimationState = new WeakMap()
  const RAIL_SCROLL_DURATION_MS = 380
  const ARTIST_STATS_CACHE_TTL_MS = 15 * 60 * 1000
  const artistStatsCache = new Map()
  const artistStatsInflight = new Map()
  const MONTHLY_LISTENERS_FORMATTER = new Intl.NumberFormat('ru-RU')

  const esc = (s) => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  const fmt = (n) => `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, '0')}`
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
  const easeInOutCubic = (value) => (
    value < 0.5
      ? 4 * value * value * value
      : 1 - (((-2 * value) + 2) ** 3) / 2
  )
  const CYRILLIC_RE = /[Ð-Ð¯Ð°-ÑÐÑ‘]/
  const GENERIC_MOOD_GENRES = ['indie', 'lofi', 'chill', 'electropop', 'alternative', 'dream', 'ambient', 'pop', 'rock']
  const MY_WAVE_ACCENTS = [
    {
      key: 'hiphop',
      match: ['hip-hop', 'hip hop', 'rap', 'trap', 'drill'],
      accent: '#f2f2f2',
      rgb: '242,242,242',
      soft: 'rgba(242,242,242,0.18)',
      muted: 'rgba(242,242,242,0.08)',
      tone: 'Ð Ð¸Ñ‚Ð¼ ÑƒÐ»Ð¸Ñ†',
    },
    {
      key: 'rock',
      match: ['rock', 'alternative', 'alt', 'indie', 'grunge'],
      accent: '#d9d9d9',
      rgb: '217,217,217',
      soft: 'rgba(217,217,217,0.16)',
      muted: 'rgba(217,217,217,0.07)',
      tone: 'Ð“Ð¸Ñ‚Ð°Ñ€Ð½Ð¾Ðµ Ñ‚ÐµÐ¿Ð»Ð¾',
    },
    {
      key: 'pop',
      match: ['pop', 'dance', 'electropop', 'synthpop', 'disco'],
      accent: '#c8c8c8',
      rgb: '200,200,200',
      soft: 'rgba(200,200,200,0.16)',
      muted: 'rgba(200,200,200,0.07)',
      tone: 'ÐÐµÐ¾Ð½Ð¾Ð²Ñ‹Ð¹ Ð¿Ð¾Ð¿',
    },
    {
      key: 'ambient',
      match: ['ambient', 'chill', 'lofi', 'dream', 'downtempo'],
      accent: '#bbbbbb',
      rgb: '187,187,187',
      soft: 'rgba(187,187,187,0.16)',
      muted: 'rgba(187,187,187,0.07)',
      tone: 'Ð¢Ð¸Ñ…Ð¸Ð¹ Ð²Ð¾Ð·Ð´ÑƒÑ…',
    },
    {
      key: 'electronic',
      match: ['electronic', 'house', 'techno', 'edm', 'garage'],
      accent: '#a8a8a8',
      rgb: '168,168,168',
      soft: 'rgba(168,168,168,0.16)',
      muted: 'rgba(168,168,168,0.07)',
      tone: 'ÐÐ¾Ñ‡Ð½Ð¾Ð¹ Ñ‚Ð¾Ðº',
    },
  ]
  const MY_WAVE_FALLBACK_ACCENT = {
    key: 'fallback',
    accent: '#d6d6d6',
    rgb: '214,214,214',
    soft: 'rgba(214,214,214,0.16)',
    muted: 'rgba(214,214,214,0.07)',
    tone: 'Ð¢ÐµÐ¿Ð»Ñ‹Ð¹ ÑÑ„Ð¸Ñ€',
  }
  const HERO_ART_VARIANTS = [
    {
      id: 'cat',
      title: 'Кот',
      role: 'Инди и лоуфай',
      futureGenres: ['indie', 'lofi', 'dream pop', 'bedroom pop', 'alternative'],
      image: 'assets/animals/cat.png',
      idle: [],
    },
    {
      id: 'bunny',
      title: 'Заяц',
      role: 'Поп и танцевальная музыка',
      futureGenres: ['pop', 'dance', 'k pop', 'electropop', 'hyperpop'],
      image: 'assets/animals/bunny.png',
      idle: [],
    },
    {
      id: 'otter',
      title: 'Выдра',
      role: 'Чилл и эмбиент',
      futureGenres: ['ambient', 'chill', 'downtempo', 'chillout', 'lofi'],
      image: 'assets/animals/otter.png',
      idle: [],
    },
    {
      id: 'raccoon',
      title: 'Енот',
      role: 'Брейкбит и гараж',
      futureGenres: ['drum and bass', 'breakbeat', 'garage', 'uk garage', 'jungle'],
      image: 'assets/animals/raccoon.png',
      idle: [],
    },
    {
      id: 'capybara',
      title: 'Капибара',
      role: 'Акустика и фолк',
      futureGenres: ['acoustic', 'folk', 'indie folk', 'singer songwriter', 'soft rock'],
      image: 'assets/animals/capybara.png',
      idle: [],
    },
    {
      id: 'bat',
      title: 'Летучая мышь',
      role: 'Темная электроника',
      futureGenres: ['darkwave', 'post punk', 'synthwave', 'wave', 'industrial'],
      image: 'assets/animals/bat.png',
      idle: [],
    },
    {
      id: 'mouse',
      title: 'Мышь',
      role: 'Хаус и техно',
      futureGenres: ['house', 'techno', 'electronic', 'edm', 'minimal'],
      image: 'assets/animals/mouse.png',
      idle: [],
    },
    {
      id: 'turtle',
      title: 'Черепаха',
      role: 'Классика и инструментал',
      futureGenres: ['classical', 'instrumental', 'neo classical', 'piano', 'soundtrack'],
      image: 'assets/animals/turtle.png',
      idle: [],
    },
    {
      id: 'duck',
      title: 'Утка',
      role: 'Фанк и диско',
      futureGenres: ['funk', 'disco', 'nu disco', 'soul', 'boogie'],
      image: 'assets/animals/duck.png',
      idle: [],
    },
    {
      id: 'repov',
      title: 'Репов',
      role: 'Рэп и хип-хоп',
      futureGenres: ['rap', 'hip hop', 'trap', 'drill', 'grime'],
      image: 'assets/animals/repov.png',
      idle: [],
    },
  ]
  const heroArtState = {
    seedSource: '',
    genreSignature: '',
    variantIndex: 0,
    invalidImageSrcs: new Set(),
    variantLocked: false,
    active: false,
    overlayHidden: false,
    phase: 0,
    timer: null,
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount
  }

  function smoothValueByDelta(current, target, delta, risePerSecond, fallPerSecond) {
    const rate = target > current ? risePerSecond : fallPerSecond
    return current + (target - current) * (1 - Math.exp(-rate * delta))
  }

  function sampleAnchors(anchors, t) {
    if (!anchors.length) {
      return 0
    }

    if (t <= anchors[0][0]) {
      return anchors[0][1]
    }

    for (let index = 1; index < anchors.length; index += 1) {
      const previous = anchors[index - 1]
      const current = anchors[index]

      if (t <= current[0]) {
        const range = current[0] - previous[0] || 1
        const localT = (t - previous[0]) / range
        return lerp(previous[1], current[1], localT)
      }
    }

    return anchors[anchors.length - 1][1]
  }

  function clamp01(value) {
    return clamp(value, 0, 1)
  }

  function hexToRgb(hex) {
    const normalized = String(hex || '').trim().replace('#', '')
    const full = normalized.length === 3
      ? normalized.split('').map((chunk) => chunk + chunk).join('')
      : normalized

    if (!/^[\da-f]{6}$/i.test(full)) {
      return { r: 146, g: 169, b: 225 }
    }

    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    }
  }

  function mixRgb(start, end, amount) {
    return {
      r: lerp(start.r, end.r, amount),
      g: lerp(start.g, end.g, amount),
      b: lerp(start.b, end.b, amount),
    }
  }

  function rgba(color, alpha) {
    return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`
  }

  function averageRange(values, start, end) {
    let sum = 0
    let count = 0
    for (let index = start; index <= end; index += 1) {
      sum += values[index] || 0
      count += 1
    }
    return count ? sum / count : 0
  }

  function applyHomeVisualizerPalette(colors) {
    if (page !== 'home' || !document.body) {
      return
    }

    const [primary, secondary, tertiary, shadow] = colors
    document.body.style.setProperty('--home-wave-primary', primary)
    document.body.style.setProperty('--home-wave-secondary', secondary)
    document.body.style.setProperty('--home-wave-tertiary', tertiary)
    if (shadow) {
      document.body.style.setProperty('--home-wave-shadow', shadow)
    }
  }

  function hashString(value) {
    let hash = 0
    const source = String(value || '')
    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(index)
      hash |= 0
    }
    return hash
  }

  function getHeroArtSeedSource() {
    try {
      const rawUser = localStorage.getItem('wavee_user')
      if (rawUser) {
        const user = JSON.parse(rawUser)
        const direct = [user?.id, user?.email, user?.name].find((item) => typeof item === 'string' && item.trim())
        if (direct) return direct
      }
    } catch {
      // ignore malformed user payload
    }

    const token = localStorage.getItem(TOKEN) || ''
    if (token) return token.slice(0, 24)
    return 'guest'
  }

  function normalizeAnimalGenre(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
  }

  function collectHomeGenreSignals() {
    const signals = []
    const pushGenres = (list) => {
      if (!Array.isArray(list)) return
      list.forEach((genre) => {
        const normalized = normalizeAnimalGenre(genre)
        if (normalized) signals.push(normalized)
      })
    }

    if (Array.isArray(state.myWave) && state.myWave.length) {
      state.myWave.forEach((item) => pushGenres(item?.track?.genres))
    }

    if (!signals.length && Array.isArray(state.tracks)) {
      state.tracks.slice(0, 40).forEach((track) => pushGenres(track?.genres))
    }

    return signals
  }

  function scoreHeroVariant(variant, genreSignals) {
    const targets = Array.isArray(variant?.futureGenres)
      ? variant.futureGenres.map(normalizeAnimalGenre).filter(Boolean)
      : []

    if (!targets.length || !genreSignals.length) return 0

    let score = 0
    genreSignals.forEach((genre, index) => {
      const weight = Math.max(1, 7 - Math.floor(index / 3))
      targets.forEach((target) => {
        if (genre === target) {
          score += 3 * weight
        } else if (genre.includes(target) || target.includes(genre)) {
          score += 1 * weight
        }
      })
    })

    return score
  }

  function pickHeroArtVariant() {
    if (heroArtState.variantLocked) {
      return HERO_ART_VARIANTS[heroArtState.variantIndex] || HERO_ART_VARIANTS[0]
    }

    const seedSource = getHeroArtSeedSource()
    const genreSignals = collectHomeGenreSignals()
    const genreSignature = genreSignals.slice(0, 30).join('|')

    if (seedSource === heroArtState.seedSource && genreSignature === heroArtState.genreSignature) {
      return HERO_ART_VARIANTS[heroArtState.variantIndex] || HERO_ART_VARIANTS[0]
    }

    heroArtState.seedSource = seedSource
    heroArtState.genreSignature = genreSignature

    let bestIndex = -1
    let bestScore = 0

    HERO_ART_VARIANTS.forEach((variant, index) => {
      const score = scoreHeroVariant(variant, genreSignals)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
        return
      }

      if (score === bestScore && score > 0) {
        const currentId = bestIndex >= 0 ? HERO_ART_VARIANTS[bestIndex].id : ''
        const currentTie = Math.abs(hashString(seedSource + ':' + currentId))
        const nextTie = Math.abs(hashString(seedSource + ':' + variant.id))
        if (nextTie > currentTie) {
          bestIndex = index
        }
      }
    })

    if (bestIndex < 0) {
      bestIndex = Math.abs(hashString(seedSource)) % HERO_ART_VARIANTS.length
    }

    heroArtState.variantIndex = bestIndex
    return HERO_ART_VARIANTS[bestIndex] || HERO_ART_VARIANTS[0]
  }

  function setHeroAnimalImage(src) {
    if (!el.homeWaveArtImage || !src) return false
    const fallbackSrc = 'assets/animals/cat.png'
    if (!el.homeWaveArtImage.dataset.waveeHeroImageBound) {
      el.homeWaveArtImage.addEventListener('load', () => {
        heroArtState.variantLocked = true
      })
      el.homeWaveArtImage.addEventListener('error', () => {
        const currentSrc = el.homeWaveArtImage?.getAttribute('data-variant-src')
          || el.homeWaveArtImage?.getAttribute('src')
          || ''
        if (currentSrc) {
          heroArtState.invalidImageSrcs.add(currentSrc)
        }
        heroArtState.variantLocked = false
        if (currentSrc !== fallbackSrc) {
          el.homeWaveArtImage.setAttribute('data-variant-src', fallbackSrc)
          el.homeWaveArtImage.setAttribute('src', fallbackSrc)
        }
      })
      el.homeWaveArtImage.dataset.waveeHeroImageBound = '1'
    }

    const targetSrc = heroArtState.invalidImageSrcs.has(src)
      ? fallbackSrc
      : src

    if (heroArtState.invalidImageSrcs.has(src)) {
      heroArtState.variantLocked = false
    }

    const current = el.homeWaveArtImage.getAttribute('data-variant-src') || ''
    if (current === targetSrc && el.homeWaveArtImage.getAttribute('src') === targetSrc) {
      return true
    }

    el.homeWaveArtImage.setAttribute('data-variant-src', targetSrc)
    el.homeWaveArtImage.setAttribute('src', targetSrc)
    return true
  }

  function renderHeroArtIdle() {
    if (page !== 'home') {
      return
    }

    const variant = pickHeroArtVariant()
    if (setHeroAnimalImage(variant?.image)) {
      return
    }

    if (el.homeWaveArt) {
      el.homeWaveArt.textContent = Array.isArray(variant?.idle) ? variant.idle.join('\n') : ''
    }
  }

  function buildHeroWaveRows(phase) {
    const width = 27
    const height = 6
    const palette = ['.', ':', '+', '#', '@']
    const rows = []

    for (let row = height; row >= 1; row -= 1) {
      let line = ''
      for (let column = 0; column < width; column += 1) {
        const motion = (
          Math.sin((column * 0.38) + (phase * 0.2))
          + (Math.sin((column * 0.16) - (phase * 0.27)) * 0.52)
          + 2
        ) / 3.4
        const level = Math.max(1, Math.round(clamp01(motion) * height))

        if (level >= row) {
          const density = clamp(Math.round(((height - row + 1) + (motion * height)) / 2), 1, height)
          const glyphIndex = clamp(Math.round((density / height) * (palette.length - 1)), 0, palette.length - 1)
          line += `${palette[glyphIndex]} `
        } else {
          line += '  '
        }
      }
      rows.push(`      ${line.trimEnd()}`)
    }

    return rows
  }

  function renderHeroArtActiveFrame() {
    if (page !== 'home') {
      return
    }

    const variant = pickHeroArtVariant()
    if (setHeroAnimalImage(variant?.image)) {
      return
    }

    if (!el.homeWaveArt) {
      return
    }

    const waveRows = buildHeroWaveRows(heroArtState.phase)
    const lines = [
      '               \u0421 \u041b \u0423 \u0428 \u0410 \u0422 \u042c',
      ...waveRows,
    ]
    el.homeWaveArt.textContent = lines.join('\n')
  }

  function stopHeroArtAnimation() {
    if (heroArtState.timer) {
      clearInterval(heroArtState.timer)
      heroArtState.timer = null
    }
  }

  function startHeroArtAnimation() {
    if (el.homeWaveArtImage) {
      stopHeroArtAnimation()
      return
    }

    if (heroArtState.timer || page !== 'home' || (!el.homeWaveArt && !el.homeWaveArtImage)) {
      return
    }

    heroArtState.timer = setInterval(() => {
      if (!heroArtState.active) {
        return
      }
      heroArtState.phase = (heroArtState.phase + 1) % 10_000
      renderHeroArtActiveFrame()
    }, 96)
  }

  function setHomeWaveActive(active) {
    if (page !== 'home' || !document.body) {
      return
    }

    const next = Boolean(active)
    heroArtState.active = next
    if (el.hero) {
      el.hero.classList.toggle('is-active', next)
      el.hero.setAttribute('aria-pressed', next ? 'true' : 'false')
      el.hero.classList.toggle('is-hidden', next || heroArtState.overlayHidden)
    }
    if (el.homeHeroTip) {
      el.homeHeroTip.classList.toggle('is-hidden', next || heroArtState.overlayHidden)
    }

    if (next) {
      heroArtState.phase = 0
      renderHeroArtActiveFrame()
      if (el.homeWaveArtImage) {
        stopHeroArtAnimation()
      } else {
        startHeroArtAnimation()
      }
    } else {
      stopHeroArtAnimation()
      renderHeroArtIdle()
    }
  }

  function setHomeHeroOverlayHidden(hidden) {
    if (page !== 'home' || !el.hero) {
      return
    }

    heroArtState.overlayHidden = Boolean(hidden)
    el.hero.classList.toggle('is-hidden', heroArtState.overlayHidden)
    el.homeHeroTip?.classList.toggle('is-hidden', heroArtState.overlayHidden || heroArtState.active)
  }

  function initHomeVisualizer() {
    if (page !== 'home' || !el.homeVisualizer) {
      return () => {}
    }

    const canvas = el.homeVisualizer
    const context = canvas.getContext('2d')
    const textCanvas = document.createElement('canvas')
    const textContext = textCanvas.getContext('2d')
    if (!context || !textContext) {
      return () => {}
    }

    const colorDefaults = ['#f2f2f2', '#bdbdbd', '#5f5f5f', '#222222']
    const LITE_HOME_VISUALIZER = false
    if (LITE_HOME_VISUALIZER) {
      const lite = {
        dpr: 1,
        width: 0,
        height: 0,
        visible: true,
        hasTrack: false,
        state: 'idle',
        bands: Array.from({ length: 20 }, () => 0.04),
        colors: colorDefaults.map(hexToRgb),
      }

      const resizeLite = () => {
        const rect = canvas.getBoundingClientRect()
        lite.dpr = Math.min(window.devicePixelRatio || 1, 1.2)
        lite.width = Math.max(320, Math.round(rect.width || window.innerWidth))
        lite.height = Math.max(240, Math.round(rect.height || (window.innerHeight * 0.58)))
        canvas.width = Math.round(lite.width * lite.dpr)
        canvas.height = Math.round(lite.height * lite.dpr)
        context.setTransform(lite.dpr, 0, 0, lite.dpr, 0, 0)
      }

      const drawLite = () => {
        context.clearRect(0, 0, lite.width, lite.height)

        if (!lite.visible || !lite.hasTrack) {
          canvas.classList.remove('active')
          return
        }

        canvas.classList.add('active')
        const [lead, contrast, accent] = lite.colors
        const centerY = lite.height * 0.44

        const wash = context.createLinearGradient(0, centerY - 150, 0, centerY + 180)
        wash.addColorStop(0, rgba(lead, 0))
        wash.addColorStop(0.32, rgba(mixRgb(lead, contrast, 0.2), 0.2))
        wash.addColorStop(0.68, rgba(mixRgb(accent, contrast, 0.3), 0.14))
        wash.addColorStop(1, rgba(accent, 0))
        context.fillStyle = wash
        context.fillRect(0, 0, lite.width, lite.height)

        const bars = 18
        const step = lite.width / bars
        for (let index = 0; index < bars; index += 1) {
          const t = index / Math.max(1, bars - 1)
          const bandIndex = Math.min(lite.bands.length - 1, Math.floor(t * lite.bands.length))
          const bandValue = clamp(Number(lite.bands[bandIndex] ?? 0), 0, 1)
          const envelope = Math.pow(Math.sin(t * Math.PI), 0.82)
          const barHeight = 14 + (bandValue * envelope * 160)
          const x = index * step + step * 0.2
          const y = centerY - (barHeight * 0.5)
          const fill = mixRgb(lead, contrast, t * 0.6)
          context.fillStyle = rgba(fill, 0.2 + bandValue * 0.25)
          context.fillRect(x, y, step * 0.6, barHeight)
        }
      }

      const handleMessageLite = (event) => {
        if (event.origin !== window.location.origin) {
          return
        }

        const payload = event.data
        if (!payload || payload.source !== 'wavee-player') {
          return
        }

        if (payload.type === 'wavee-visualizer-visibility') {
          const isVisible = Boolean(payload.payload?.visible)
          lite.visible = isVisible
          setHomeHeroOverlayHidden(!isVisible)
          if (!isVisible) {
            lite.hasTrack = false
            setHomeWaveActive(false)
          }
          drawLite()
          return
        }

        if (payload.type !== 'wavee-visualizer-frame') {
          return
        }

        const next = payload.payload || {}
        const nextState = typeof next.state === 'string'
          ? next.state
          : (next.isPlaying ? 'playing' : (next.trackId ? 'paused' : 'idle'))
        const hasTrack = Boolean(next.trackId)
        const shouldShowHeroWave = hasTrack && (nextState === 'playing' || nextState === 'paused')
        lite.hasTrack = shouldShowHeroWave
        lite.state = nextState
        setHomeWaveActive(shouldShowHeroWave)

        const colors = Array.isArray(next.colors) && next.colors.length
          ? colorDefaults.map((fallback, index) => next.colors[index] ?? fallback)
          : colorDefaults
        lite.colors = colors.map(hexToRgb)
        const incomingBands = Array.isArray(next.bands) ? next.bands : []
        for (let index = 0; index < lite.bands.length; index += 1) {
          const target = clamp(Number(incomingBands[index] ?? 0.04), 0, 1)
          lite.bands[index] = (lite.bands[index] * 0.72) + (target * 0.28)
        }
        applyHomeVisualizerPalette(colors)
        drawLite()
      }

      resizeLite()
      applyHomeVisualizerPalette(colorDefaults)
      drawLite()
      window.addEventListener('resize', resizeLite)
      window.addEventListener('message', handleMessageLite)
      return () => {
        window.removeEventListener('resize', resizeLite)
        window.removeEventListener('message', handleMessageLite)
      }
    }
    const visualizer = {
      dpr: 1,
      renderScale: 0.64,
      width: 0,
      height: 0,
      visibleHeight: 0,
      shellHeight: 0,
      glowPad: 84,
      energy: 0.08,
      targetEnergy: 0.08,
      activity: 0.08,
      targetActivity: 0.08,
      loudness: 0.08,
      targetLoudness: 0.08,
      bass: 0.08,
      targetBass: 0.08,
      mids: 0.07,
      targetMids: 0.07,
      highs: 0.05,
      targetHighs: 0.05,
      signalPresence: 0,
      targetSignalPresence: 0,
      volume: 0.8,
      targetBands: Array.from({ length: 20 }, () => 0.075),
      bands: Array.from({ length: 20 }, () => 0.075),
      colors: colorDefaults.map(hexToRgb),
      targetColors: colorDefaults.map(hexToRgb),
      isPlaying: false,
      isForceHidden: false,
      isClearedWhileHidden: false,
      state: 'idle',
      hasSignal: false,
      phase: 0,
      hueDrift: 0,
      bassHit: 0,
      vocalHit: 0,
      trebleHit: 0,
      transitionScale: 0,
      textCanvas,
      textContext,
      noiseTile: null,
      noisePattern: null,
      textNoisePattern: null,
      qualityTier: 1,
      rafId: 0,
      lastTs: 0,
      lastRenderAt: 0,
    }

    const rebuildNoisePattern = () => {
      const tile = document.createElement('canvas')
      const size = 192
      tile.width = size
      tile.height = size
      const tileContext = tile.getContext('2d')
      if (!tileContext) {
        visualizer.noisePattern = null
        return
      }

      const image = tileContext.createImageData(size, size)
      const coarseGridSize = 14
      const ridgeGridSize = 7
      const coarseGrid = Array.from({ length: coarseGridSize * coarseGridSize }, () => Math.random())
      const ridgeGrid = Array.from({ length: ridgeGridSize * ridgeGridSize }, () => Math.random())

      const sampleGrid = (grid, gridSize, x, y) => {
        const maxIndex = gridSize - 1
        const px = clamp(x, 0, maxIndex)
        const py = clamp(y, 0, maxIndex)
        const x0 = Math.floor(px)
        const y0 = Math.floor(py)
        const x1 = Math.min(x0 + 1, maxIndex)
        const y1 = Math.min(y0 + 1, maxIndex)
        const tx = px - x0
        const ty = py - y0
        const top = lerp(grid[(y0 * gridSize) + x0], grid[(y0 * gridSize) + x1], tx)
        const bottom = lerp(grid[(y1 * gridSize) + x0], grid[(y1 * gridSize) + x1], tx)
        return lerp(top, bottom, ty)
      }

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const offset = ((y * size) + x) * 4
          const u = x / size
          const v = y / size
          const coarse = sampleGrid(coarseGrid, coarseGridSize, u * (coarseGridSize - 1), v * (coarseGridSize - 1))
          const ridge = sampleGrid(
            ridgeGrid,
            ridgeGridSize,
            ((u * 1.55) + (v * 0.18)) * (ridgeGridSize - 1),
            ((v * 0.82) + (u * 0.06)) * (ridgeGridSize - 1),
          )
          const fine = Math.random()
          const sparkle = Math.random() > 0.995 ? 1 : 0
          const contrast = Math.pow(fine, 1.35)
          const luminance = clamp(
            96 + (coarse * 42) + ((ridge - 0.5) * 22) + (contrast * 28) + (sparkle * 42),
            72,
            210,
          )
          const alpha = clamp(
            14 + (coarse * 12) + (contrast * 12) + (sparkle * 18),
            10,
            42,
          )

          image.data[offset] = luminance
          image.data[offset + 1] = luminance
          image.data[offset + 2] = luminance
          image.data[offset + 3] = alpha
        }
      }

      tileContext.putImageData(image, 0, 0)
      visualizer.noiseTile = tile
      visualizer.noisePattern = context.createPattern(tile, 'repeat')
      visualizer.textNoisePattern = textContext.createPattern(tile, 'repeat')
    }

    const resize = () => {
      const narrowViewport = window.innerWidth <= 960
      const tinyViewport = window.innerWidth <= 640
      const detectedDpr = Math.min(window.devicePixelRatio || 1, 1.5)
      visualizer.qualityTier = narrowViewport ? 0 : 1
      visualizer.renderScale = tinyViewport ? 0.48 : (narrowViewport ? 0.56 : 0.64)
      visualizer.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      if (canvas.parentElement) {
        const shellRect = canvas.parentElement.getBoundingClientRect()
        const canvasRect = canvas.getBoundingClientRect()
        visualizer.width = shellRect.width || window.innerWidth
        visualizer.shellHeight = shellRect.height || window.innerHeight
        visualizer.visibleHeight = clamp(visualizer.shellHeight * 0.52, 260, 420)
        visualizer.height = Math.max(
          canvasRect.height || (visualizer.shellHeight + visualizer.glowPad * 2),
          visualizer.visibleHeight + visualizer.glowPad * 2,
        )
      } else {
        visualizer.width = Math.max(window.innerWidth, 320)
        visualizer.shellHeight = window.innerHeight
        visualizer.visibleHeight = clamp(window.innerHeight * 0.52, 260, 420)
        visualizer.height = window.innerHeight + visualizer.glowPad * 2
      }
      const effectiveScale = visualizer.dpr * visualizer.renderScale
      canvas.width = Math.round(visualizer.width * effectiveScale)
      canvas.height = Math.round(visualizer.height * effectiveScale)
      context.setTransform(effectiveScale, 0, 0, effectiveScale, 0, 0)
      textCanvas.width = canvas.width
      textCanvas.height = canvas.height
      textContext.setTransform(effectiveScale, 0, 0, effectiveScale, 0, 0)
      if (visualizer.qualityTier > 0 && detectedDpr >= 1) {
        rebuildNoisePattern()
      } else {
        visualizer.noiseTile = null
        visualizer.noisePattern = null
        visualizer.textNoisePattern = null
      }
    }

    const traceCurve = (points, connect = false) => {
      if (!points.length) return
      if (!connect) {
        context.moveTo(points[0].x, points[0].y)
      } else {
        context.lineTo(points[0].x, points[0].y)
      }
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]
        const current = points[index]
        const midX = (previous.x + current.x) / 2
        const midY = (previous.y + current.y) / 2
        context.quadraticCurveTo(previous.x, previous.y, midX, midY)
      }
      const last = points[points.length - 1]
      context.lineTo(last.x, last.y)
    }

    const textWaveLayers = [
      {
        glyphs: ['#', '@', '=', '-', ':', '.', ' '],
        alpha: 0.9,
        fontScale: 1.02,
        weight: 700,
        verticalOffset: 0,
        amplitude: 0.22,
        thickness: 1,
        phaseOffset: 0,
        jitter: 0.04,
        sharpness: 0.34,
        drift: 0.08,
      },
      {
        glyphs: ['+', '=', '-', ':', '.', ' '],
        alpha: 0.54,
        fontScale: 0.88,
        weight: 700,
        verticalOffset: -0.04,
        amplitude: 0.16,
        thickness: 0.78,
        phaseOffset: 0.9,
        jitter: 0.03,
        sharpness: 0.48,
        drift: 0.06,
      },
      {
        glyphs: ['=', '-', ':', '.', ' '],
        alpha: 0.28,
        fontScale: 0.76,
        weight: 400,
        verticalOffset: 0.05,
        amplitude: 0.1,
        thickness: 0.6,
        phaseOffset: 1.8,
        jitter: 0.02,
        sharpness: 0.62,
        drift: 0.04,
      },
    ]

    const pickGlyph = (glyphs, density, seed) => {
      const clampedDensity = clamp01(density)
      const variance = clampedDensity > 0.42
        ? Math.round(((Math.sin(seed * 12.9898) + 1) * 0.5) * 1.15)
        : 0
      const maxIndex = glyphs.length - 1
      const index = clamp(
        Math.round((1 - clampedDensity) * Math.max(0, maxIndex - variance)),
        0,
        maxIndex,
      )
      return glyphs[index]
    }

    let drawTimeoutId = 0
    const scheduleDraw = (delay = 0) => {
      if (delay > 0) {
        drawTimeoutId = window.setTimeout(() => {
          drawTimeoutId = 0
          visualizer.rafId = window.requestAnimationFrame(draw)
        }, delay)
        return
      }

      visualizer.rafId = window.requestAnimationFrame(draw)
    }

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return
      }

      const payload = event.data
      if (!payload || payload.source !== 'wavee-player') {
        return
      }

      if (payload.type === 'wavee-visualizer-visibility') {
        const isVisible = Boolean(payload.payload?.visible)
        visualizer.isForceHidden = !isVisible
        visualizer.isClearedWhileHidden = false
        setHomeHeroOverlayHidden(!isVisible)
        if (isVisible && (visualizer.hasTrack || visualizer.isPlaying)) {
          canvas.classList.add('active')
        } else {
          canvas.classList.remove('active')
        }
        if (!isVisible) {
          setHomeWaveActive(false)
        }
        return
      }

      if (payload.type !== 'wavee-visualizer-frame') {
        return
      }

      const next = payload.payload || {}
      const incomingBands = Array.isArray(next.bands) ? next.bands : []
      const colors = Array.isArray(next.colors) && next.colors.length
        ? colorDefaults.map((fallback, index) => next.colors[index] ?? fallback)
        : colorDefaults
      const legacyBass = averageRange(incomingBands, 1, 4)
      const legacyMids = averageRange(incomingBands, 6, 10)
      const legacyHighs = averageRange(incomingBands, 12, 16)
      const legacyPresence = averageRange(incomingBands, 0, Math.max(0, incomingBands.length - 1))
      const nextState = typeof next.state === 'string'
        ? next.state
        : (next.isPlaying ? 'playing' : (next.trackId ? 'paused' : 'idle'))
      const volumeLevel = clamp(Number(next.volume ?? 0.8), 0, 1)
      const volumeFactor = volumeLevel <= 0.001
        ? 0
        : (0.34 + Math.pow(volumeLevel, 0.72) * 0.66)

      visualizer.targetBands = visualizer.targetBands.map((_, index) => clamp01(Number(incomingBands[index] ?? 0.06) * volumeFactor))
      visualizer.targetEnergy = clamp(Number(next.energy ?? 0.08) * volumeFactor, 0, 1)
      visualizer.targetActivity = clamp01(Number(next.activity ?? next.energy ?? 0.08) * volumeFactor)
      visualizer.targetLoudness = clamp01(Number(next.loudness ?? next.energy ?? 0.08) * volumeFactor)
      visualizer.targetBass = clamp01(Number(next.bass ?? legacyBass ?? 0.08) * volumeFactor)
      visualizer.targetMids = clamp01(Number(next.mids ?? legacyMids ?? 0.07) * volumeFactor)
      visualizer.targetHighs = clamp01(Number(next.highs ?? legacyHighs ?? 0.05) * volumeFactor)
      visualizer.targetSignalPresence = clamp01(Number(next.signalPresence ?? legacyPresence ?? 0) * volumeFactor)
      visualizer.state = nextState
      visualizer.hasSignal = Boolean(next.hasSignal ?? visualizer.targetSignalPresence > 0.08)
      visualizer.isPlaying = nextState === 'playing'
      visualizer.volume = volumeLevel
      const hasTrack = Boolean(next.trackId)
      visualizer.hasTrack = hasTrack
      setHomeWaveActive(hasTrack && (nextState === 'playing' || nextState === 'paused'))

      if (hasTrack && (nextState === 'playing' || nextState === 'paused') && !visualizer.isForceHidden) {
        canvas.classList.add('active')
      } else {
        canvas.classList.remove('active')
      }
      visualizer.targetColors = colors.map(hexToRgb)
      applyHomeVisualizerPalette(colors)
    }

    const draw = (timestamp) => {
      if (!visualizer.lastTs) {
        visualizer.lastTs = timestamp
      }

      const frameIntervalMs = visualizer.isForceHidden
        ? 160
        : (visualizer.state === 'playing' ? 1000 / 30 : 1000 / 15)

      if (visualizer.lastRenderAt && timestamp - visualizer.lastRenderAt < frameIntervalMs) {
        scheduleDraw(frameIntervalMs - (timestamp - visualizer.lastRenderAt))
        return
      }

      visualizer.lastRenderAt = timestamp
      const delta = Math.min((timestamp - visualizer.lastTs) / 1000, 0.05)
      visualizer.lastTs = timestamp

      if (visualizer.isForceHidden) {
        if (!visualizer.isClearedWhileHidden) {
          context.clearRect(0, 0, visualizer.width, visualizer.height)
          visualizer.isClearedWhileHidden = true
        }
        scheduleDraw(frameIntervalMs)
        return
      }
      visualizer.isClearedWhileHidden = false

      const stateMotion = visualizer.state === 'playing' ? 1.0
        : (visualizer.state === 'paused' ? 0.05 : 0.02)

      const bandRise = visualizer.state === 'playing' ? 16.0 : 4.0
      const bandFall = visualizer.state === 'playing' ? 4.0 : 1.5
      const signalRise = visualizer.state === 'playing' ? 14.0 : 3.0
      const signalFall = visualizer.state === 'playing' ? 3.0 : 1.0

      visualizer.energy = smoothValueByDelta(visualizer.energy, visualizer.targetEnergy, delta, signalRise, signalFall)
      visualizer.activity = smoothValueByDelta(visualizer.activity, visualizer.targetActivity, delta, signalRise, signalFall)
      visualizer.loudness = smoothValueByDelta(visualizer.loudness, visualizer.targetLoudness, delta, signalRise * 0.9, signalFall * 0.9)
      visualizer.bass = smoothValueByDelta(visualizer.bass, visualizer.targetBass, delta, signalRise, signalFall * 0.8)
      visualizer.mids = smoothValueByDelta(visualizer.mids, visualizer.targetMids, delta, signalRise * 0.9, signalFall * 0.9)
      visualizer.highs = smoothValueByDelta(visualizer.highs, visualizer.targetHighs, delta, signalRise * 0.9, signalFall * 0.9)
      
      const targetPresence = visualizer.hasSignal ? visualizer.targetSignalPresence : Math.min(visualizer.targetSignalPresence, 0.05)
      visualizer.signalPresence = smoothValueByDelta(visualizer.signalPresence, targetPresence, delta, signalRise, signalFall * 0.8)

      const motionActivity = clamp01((visualizer.activity * 0.5) + (visualizer.loudness * 0.3) + (visualizer.signalPresence * 0.2))
      const motionGate = clamp01((visualizer.signalPresence * 1.5) + (visualizer.loudness * 0.3))
      const motionFactor = lerp(0.01, 0.3, motionActivity) * stateMotion
      
      visualizer.phase += delta * motionFactor
      visualizer.hueDrift += delta * lerp(0.002, 0.02, motionActivity)

      for (let index = 0; index < visualizer.bands.length; index += 1) {
        visualizer.bands[index] = smoothValueByDelta(visualizer.bands[index], visualizer.targetBands[index], delta, bandRise, bandFall)
      }
      const colorLerpAmount = 1 - Math.exp(-delta * 3.4)
      for (let index = 0; index < visualizer.colors.length; index += 1) {
        visualizer.colors[index] = mixRgb(visualizer.colors[index], visualizer.targetColors[index], colorLerpAmount)
      }

      context.clearRect(0, 0, visualizer.width, visualizer.height)

      const width = visualizer.width
      const height = visualizer.height
      const centerY = visualizer.glowPad + (visualizer.visibleHeight * 0.45)

      const bassPulse = clamp01(visualizer.bass)
      const midPulse = clamp01(visualizer.mids)
      const treblePulse = clamp01(visualizer.highs)
      const volumeFactor = visualizer.volume <= 0.001
        ? 0
        : (0.34 + Math.pow(visualizer.volume, 0.72) * 0.66)
      
      const isPlaying = visualizer.state === 'playing'
      const isActive = motionGate > 0.01

      // Transition scale logic for pause/play
      const targetScale = isPlaying ? Math.max(0, volumeFactor) : 0.05
      if (!visualizer.transitionScale) visualizer.transitionScale = 0
      visualizer.transitionScale = smoothValueByDelta(visualizer.transitionScale, targetScale, delta, 4.0, 3.0)
      
      const transitionMultiplier = (0.02 + visualizer.transitionScale * 0.98)

      // Base Multipliers: Much stronger response to bass for that bouncy feel
      const globalAmplitude = height * (0.02 + ((bassPulse * 0.35) + (visualizer.loudness * 0.05)) * volumeFactor) * transitionMultiplier

      // Theme colors from cover with stronger contrast and more animated mixing.
      const bgColor = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--bg-dark') || '#303030')
      const [leadBase, contrastBase, accentBase, shadowBase] = visualizer.colors
      
      const phaseT = visualizer.phase * 0.46
      const lead = mixRgb(leadBase, accentBase, 0.16 + Math.sin(phaseT * 0.7) * 0.06)
      const contrast = mixRgb(contrastBase, leadBase, 0.08 + Math.cos((phaseT * 0.94) + 0.6) * 0.08)
      const accent = mixRgb(accentBase, contrastBase, 0.12 + Math.sin((phaseT * 1.18) + 1.1) * 0.08)
      const shadow = mixRgb(shadowBase, contrastBase, 0.1 + Math.sin((phaseT * 0.54) + 0.3) * 0.05)
      const glowCore = mixRgb(lead, contrast, 0.42 + treblePulse * 0.1)
      const highlight = { r: 255, g: 255, b: 255 }
      const qualityTier = visualizer.qualityTier
      const fontSize = clamp(width / 54, 11, 17)
      const colStep = qualityTier === 2
        ? Math.max(9.6, fontSize * 0.78)
        : (qualityTier === 1
            ? Math.max(12.4, fontSize * 1.02)
            : Math.max(15.6, fontSize * 1.22))
      const rowStep = qualityTier === 2
        ? Math.max(11.4, fontSize * 0.86)
        : (qualityTier === 1
            ? Math.max(13.2, fontSize * 1.02)
            : Math.max(16.4, fontSize * 1.16))
      const columnCount = Math.max(qualityTier === 2 ? 42 : (qualityTier === 1 ? 30 : 22), Math.ceil(width / colStep))
      const xStep = width / columnCount

      const getBandValue = (normalizedIndex) => {
        const distanceToCenter = Math.abs(normalizedIndex - 0.5) * 2
        const exactBand = distanceToCenter * (visualizer.bands.length - 1)
        const lower = Math.floor(exactBand)
        const upper = Math.min(visualizer.bands.length - 1, lower + 1)
        const fraction = exactBand - lower
        const lowerVal = visualizer.bands[lower] || 0
        const upperVal = visualizer.bands[upper] || 0
        return lerp(lowerVal, upperVal, fraction)
      }
      const baseHalfThickness = Math.max(
        rowStep * 1.7,
        height * (0.048 + bassPulse * 0.068 + midPulse * 0.028) * transitionMultiplier,
      )
      const gradientFlow = visualizer.phase * 0.24
      const leftColorStop = clamp(0.14 + (Math.sin(gradientFlow * 1.22) * 0.04), 0.08, 0.24)
      const centerLeftStop = clamp(0.34 + (Math.cos((gradientFlow * 0.9) + 0.4) * 0.05), leftColorStop + 0.14, 0.48)
      const centerRightStop = clamp(0.6 + (Math.sin((gradientFlow * 1.04) + 1.3) * 0.05), centerLeftStop + 0.12, 0.76)

      const bodyGradient = textContext.createLinearGradient(0, centerY - (height * 0.12), width, centerY + (height * 0.12))
      bodyGradient.addColorStop(0, rgba(bgColor, 0))
      bodyGradient.addColorStop(leftColorStop, rgba(mixRgb(lead, highlight, 0.18), 0.7))
      bodyGradient.addColorStop(centerLeftStop, rgba(mixRgb(contrast, lead, 0.12), 0.94))
      bodyGradient.addColorStop(centerRightStop, rgba(mixRgb(glowCore, highlight, 0.08), 0.82))
      bodyGradient.addColorStop(1, rgba(bgColor, 0))

      const accentGradient = textContext.createLinearGradient(0, centerY - (height * 0.18), width, centerY + (height * 0.18))
      accentGradient.addColorStop(0, rgba(bgColor, 0))
      accentGradient.addColorStop(0.22, rgba(mixRgb(contrast, highlight, 0.22), 0.8))
      accentGradient.addColorStop(0.5, rgba(mixRgb(accent, highlight, 0.1), 0.92))
      accentGradient.addColorStop(0.82, rgba(mixRgb(shadow, accent, 0.32), 0.76))
      accentGradient.addColorStop(1, rgba(bgColor, 0))

      const mistGradient = textContext.createLinearGradient(0, centerY - (height * 0.24), 0, centerY + (height * 0.24))
      mistGradient.addColorStop(0, rgba(mixRgb(highlight, lead, 0.55), 0.22))
      mistGradient.addColorStop(0.36, rgba(mixRgb(highlight, contrast, 0.22), 0.08))
      mistGradient.addColorStop(0.58, rgba(mixRgb(accent, contrast, 0.14), 0.05))
      mistGradient.addColorStop(1, rgba(mixRgb(shadow, bgColor, 0.34), 0.16))

      const glowWash = context.createRadialGradient(
        width * 0.5,
        centerY,
        rowStep,
        width * 0.5,
        centerY,
        width * 0.54,
      )
      glowWash.addColorStop(0, rgba(mixRgb(lead, highlight, 0.28), 0.16 + (bassPulse * 0.08)))
      glowWash.addColorStop(0.32, rgba(mixRgb(contrast, accent, 0.16), 0.08 + (midPulse * 0.03)))
      glowWash.addColorStop(0.72, rgba(shadow, 0.02))
      glowWash.addColorStop(1, rgba(bgColor, 0))

      textContext.clearRect(0, 0, width, height)
      textContext.save()
      textContext.textAlign = 'center'
      textContext.textBaseline = 'middle'
      textContext.lineJoin = 'round'

      const activeLayers = qualityTier === 2
        ? textWaveLayers
        : (qualityTier === 1 ? textWaveLayers.slice(0, 2) : textWaveLayers.slice(0, 1))

      activeLayers.forEach((layer, layerIndex) => {
        const gradient = layerIndex === 0 ? bodyGradient : (layerIndex === 1 ? accentGradient : mistGradient)
        const layerFontSize = fontSize * layer.fontScale
        textContext.save()
        textContext.font = `${layer.weight} ${layerFontSize}px "Space Mono", "Courier New", monospace`
        textContext.fillStyle = gradient

        for (let column = 0; column <= columnCount; column += 1) {
          const t = column / columnCount
          const x = column * xStep
          const edgeAttenuation = Math.pow(Math.sin(t * Math.PI), 0.92)
          const rawVal = getBandValue(t)
          const shellProfile = Math.pow(Math.sin(t * Math.PI), 0.56)
          const bodyProfile = 0.24 + (Math.pow(shellProfile, 0.18) * 1.18)
          const facetProfile = 0.86 + (Math.abs(Math.sin((t * Math.PI * 2.8) + layer.phaseOffset)) * 0.24)
          const centerDrift = Math.sin((t * Math.PI * 2.2) + (visualizer.phase * 1.2) + layer.phaseOffset) * globalAmplitude * layer.drift
          const ridgeMotion = Math.sin((t * Math.PI * 5.6) - (visualizer.phase * 1.5) + layer.phaseOffset) * rowStep * (0.12 + rawVal * 0.18)
          const sway = Math.cos((column * 0.26) - (visualizer.phase * 1.15) - layer.phaseOffset) * (0.04 + treblePulse * 0.08)
          const yCenter = centerY
            + (layer.verticalOffset * visualizer.visibleHeight)
            + centerDrift
            + (ridgeMotion * shellProfile)
            + (sway * rowStep)
          const localThickness = Math.max(
            rowStep * 1.15,
            baseHalfThickness * layer.thickness * bodyProfile * (0.74 + rawVal * 0.56) * (0.4 + edgeAttenuation * 0.6) * facetProfile,
          )
          const rowStart = Math.max(0, Math.floor((yCenter - localThickness) / rowStep) - 1)
          const rowEnd = Math.min(Math.ceil(height / rowStep), Math.ceil((yCenter + localThickness) / rowStep) + 1)

          for (let row = rowStart; row <= rowEnd; row += 1) {
            const y = row * rowStep
            const distance = Math.abs(y - yCenter) / localThickness
            if (distance > 1) continue

            const shell = Math.pow(1 - distance, layer.sharpness)
            const scanline = 0.5 + (0.5 * Math.sin((row * 0.92) + (visualizer.phase * 1.8) + layer.phaseOffset))
            const contourBoost = distance > 0.72 ? 0.12 : 0
            const density = clamp01((shell * (0.72 + rawVal * 0.68 + motionGate * 0.12)) + (scanline * 0.08) + contourBoost)
            if (density < (qualityTier === 2 ? 0.08 : (qualityTier === 1 ? 0.14 : 0.22))) continue
            const glyph = pickGlyph(layer.glyphs, density, (column * 0.22) + (row * 0.61) + layer.phaseOffset)
            if (glyph === ' ') continue

            const jitterX = Math.sin((row * 0.2) + (visualizer.phase * 0.8) + layer.phaseOffset) * layer.jitter * fontSize
            const jitterY = Math.cos((column * 0.18) - (visualizer.phase * 0.65) - layer.phaseOffset) * layer.jitter * rowStep * 0.24
            textContext.globalAlpha = layer.alpha * density * (0.34 + edgeAttenuation * 0.66) * transitionMultiplier
            textContext.fillText(glyph, x + jitterX, y + jitterY)
          }
        }

        textContext.restore()
      })

      if (visualizer.textNoisePattern && isActive && qualityTier > 0) {
        textContext.save()
        textContext.globalCompositeOperation = 'source-atop'
        textContext.globalAlpha = (qualityTier === 2 ? 0.22 : 0.12) + (bassPulse * 0.04) + (treblePulse * 0.02)
        if (typeof visualizer.textNoisePattern.setTransform === 'function') {
          visualizer.textNoisePattern.setTransform(
            new DOMMatrix().translate(
              (visualizer.phase * 16) % 320,
              ((Math.sin(visualizer.phase * 0.45) * 16) + ((visualizer.phase * 7) % 320)),
            ),
          )
        }
        textContext.fillStyle = visualizer.textNoisePattern
        textContext.fillRect(0, 0, width, height)

        if (qualityTier === 2) {
          textContext.globalCompositeOperation = 'soft-light'
          textContext.globalAlpha = 0.12 + (midPulse * 0.04)
          textContext.fillStyle = mistGradient
          textContext.fillRect(0, 0, width, height)

          textContext.globalCompositeOperation = 'overlay'
          textContext.globalAlpha = 0.07 + (treblePulse * 0.04)
          textContext.fillStyle = bodyGradient
          textContext.fillRect(0, 0, width, height)
        }
        textContext.restore()
      }

      textContext.restore()

      if (isActive && transitionMultiplier > 0.08) {
        context.save()
        context.globalCompositeOperation = 'screen'
        context.fillStyle = glowWash
        context.globalAlpha = 0.46
        context.fillRect(0, 0, width, height)
        context.restore()
      }

      if (transitionMultiplier > 0.08 && qualityTier > 0) {
        context.save()
        context.globalCompositeOperation = 'screen'
        context.globalAlpha = ((qualityTier === 2 ? 0.08 : 0.05) + bassPulse * 0.08 + midPulse * 0.03) * transitionMultiplier
        context.filter = `blur(${(qualityTier === 2 ? 8 : 5) + bassPulse * (qualityTier === 2 ? 9 : 5) + visualizer.loudness * 2}px) brightness(${1.02 + visualizer.energy * 0.14})`
        context.drawImage(textCanvas, 0, 0, width, height)

        if (qualityTier === 2) {
          context.globalAlpha = (0.03 + treblePulse * 0.03) * transitionMultiplier
          context.filter = `blur(${16 + bassPulse * 10}px) brightness(${1.01 + treblePulse * 0.08})`
          context.drawImage(textCanvas, 0, 0, width, height)
        }
        context.restore()
      }

      context.save()
      context.globalAlpha = clamp(0.12 + (transitionMultiplier * 0.9), 0.14, 0.98)
      context.filter = `brightness(${1.02 + visualizer.energy * 0.24}) saturate(${1.04 + midPulse * 0.16})`
      context.drawImage(textCanvas, 0, 0, width, height)
      context.restore()

      scheduleDraw()
    }

    resize()
    applyHomeVisualizerPalette(colorDefaults)
    window.addEventListener('resize', resize)
    window.addEventListener('message', handleMessage)
    scheduleDraw()

    return () => {
      window.cancelAnimationFrame(visualizer.rafId)
      if (drawTimeoutId) {
        window.clearTimeout(drawTimeoutId)
      }
      window.removeEventListener('resize', resize)
      window.removeEventListener('message', handleMessage)
    }
  }

  const playIcon = (isPlaying) => isPlaying
    ? '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M4.5 3.5H7v9H4.5zm4.5 0h2.5v9H9z"></path></svg>'
    : '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M5 3l8 5-8 5V3z"></path></svg>'

  const heartIcon = (active) => active
    ? '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 14s-6-4.35-6-8a4 4 0 0 1 6-3.46A4 4 0 0 1 14 6c0 3.65-6 8-6 8z"></path></svg>'
    : '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 13.2s-5.2-3.84-5.2-7.04A3.2 3.2 0 0 1 8 3.56a3.2 3.2 0 0 1 5.2 2.6c0 3.2-5.2 7.04-5.2 7.04z"></path></svg>'

  function dedupeTracks(items) {
    const seen = new Set()
    return items.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }

  function titleCase(value) {
    const source = String(value || '').trim()
    if (!source) return 'Wave'
    return source.charAt(0).toUpperCase() + source.slice(1)
  }

  function reasonLabel(reason) {
    if (reason === 'artist-match') return 'ÐŸÐ¾ Ð»ÑŽÐ±Ð¸Ð¼Ñ‹Ð¼ Ð°Ñ€Ñ‚Ð¸ÑÑ‚Ð°Ð¼'
    if (reason === 'genre-match') return 'ÐŸÐ¾ Ñ‚Ð²Ð¾Ð¸Ð¼ Ð¶Ð°Ð½Ñ€Ð°Ð¼'
    return 'Ð¡Ð¾Ð±Ñ€Ð°Ð½Ð¾ Ð´Ð»Ñ Ñ‚ÐµÐ±Ñ'
  }

  function isRussianTrack(track) {
    return track?.language === 'ru' || CYRILLIC_RE.test(`${track?.title || ''} ${track?.artist?.name || ''}`)
  }

  function isIndieTrack(track) {
    const genres = Array.isArray(track?.genres) ? track.genres.map((item) => String(item).toLowerCase()) : []
    return genres.some((genre) => GENERIC_MOOD_GENRES.some((needle) => genre.includes(needle)))
  }

  function getRussianIndieTracks() {
    const exact = state.tracks.filter((track) => isRussianTrack(track) && isIndieTrack(track))
    const ruOnly = state.tracks.filter((track) => isRussianTrack(track) && !exact.some((item) => item.id === track.id))
    const indieOnly = state.tracks.filter((track) => isIndieTrack(track) && !exact.some((item) => item.id === track.id))
    return dedupeTracks([...exact, ...ruOnly, ...indieOnly, ...state.tracks]).slice(0, 8)
  }

  function getMyWaveTracks() {
    return dedupeTracks(state.myWave.map((item) => item?.track).filter((track) => track?.id))
  }

  function getMixEntries() {
    if (state.myWave.length) {
      return state.myWave
        .filter((item) => item?.track?.id)
        .slice(0, 6)
        .map((item, index) => {
          const genre = item.track?.genres?.[0]
          const title = genre ? `${titleCase(genre)} mix` : `${titleCase(item.track?.artist?.name || 'Wave')} mix`
          return {
            id: item.track.id,
            title,
            subtitle: reasonLabel(item.reason),
            seed: `${item.track.title}-${index}`,
            track: item.track,
          }
        })
    }

    return dedupeTracks(state.tracks)
      .slice(0, 6)
      .map((track, index) => {
        const genre = track?.genres?.[0]
        return {
          id: track.id,
          title: genre ? `${titleCase(genre)} mix` : `${titleCase(track.artist?.name || 'Wave')} mix`,
          subtitle: track.artist?.name || 'Wavee selection',
          seed: `${track.title}-${index}`,
          track,
        }
      })
  }

  function scoreBySeed(seed) {
    return Math.abs(hashString(String(seed || '')))
  }

  function stablePercent(seed, min = 12, max = 92) {
    const from = Math.min(min, max)
    const to = Math.max(min, max)
    const span = Math.max(1, (to - from) + 1)
    return from + (scoreBySeed(seed) % span)
  }

  function getHomeTrackPool() {
    const playlistTracks = state.playlists.flatMap((playlist) => (
      Array.isArray(playlist?.tracks) ? playlist.tracks : []
    ))

    return dedupeTracks([
      ...getMyWaveTracks(),
      ...state.tracks,
      ...playlistTracks,
    ]).filter((track) => track?.id)
  }

  function pickTracks(source, count, offset = 0) {
    const items = dedupeTracks(Array.isArray(source) ? source : [])
    if (!items.length || count <= 0) return []
    const start = ((offset % items.length) + items.length) % items.length
    const result = []
    const limit = Math.min(count, items.length)
    for (let index = 0; index < limit; index += 1) {
      result.push(items[(start + index) % items.length])
    }
    return result
  }

  function getTopGenres(track, max = 2) {
    const genres = Array.isArray(track?.genres) ? track.genres : []
    return genres
      .map((genre) => humanizeGenre(genre))
      .filter(Boolean)
      .slice(0, max)
  }

  function getGreetingLabel() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return 'Добрый день'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Доброй ночи'
  }

  function genrePixelColor(token, palette) {
    if (token === '1') return palette[0]
    if (token === '2') return palette[1]
    if (token === '3') return palette[2]
    if (token === '4') return palette[3]
    return null
  }

  function buildGenrePixelArt(pattern, palette, label) {
    const rows = Array.isArray(pattern) ? pattern : []
    if (!rows.length) return ''
    const cell = 10
    const width = rows[0].length * cell
    const height = rows.length * cell
    const rects = []

    rows.forEach((row, rowIndex) => {
      String(row || '').split('').forEach((token, colIndex) => {
        const color = genrePixelColor(token, palette)
        if (!color) return
        rects.push(
          `<rect x="${colIndex * cell}" y="${rowIndex * cell}" width="${cell}" height="${cell}" fill="${color}"></rect>`,
        )
      })
    })

    return `
      <svg class="home-genre-pixel-art" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet" style="shape-rendering:crispEdges">
        <rect width="${width}" height="${height}" fill="rgba(7,8,10,0.58)"></rect>
        ${rects.join('')}
      </svg>
    `
  }

  function getGenreMoodBuckets(pool) {
    const groups = [
      {
        title: 'Хип-хоп',
        mood: 'Ночной разгон',
        caption: 'Жесткий ритм, плотный бас.',
        matches: ['hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'grime'],
        palette: ['#ffdd57', '#ff9f43', '#ff5e57', '#b33939'],
        pattern: ['1...44..', '11.444..', '211444..', '221334..', '.22334..', '..23331.', '..22211.', '...111..'],
        theme: {
          from: 'rgba(255, 180, 67, 0.2)',
          to: 'rgba(179, 57, 57, 0.06)',
          ring: 'rgba(255, 173, 88, 0.26)',
          chip: 'rgba(255, 196, 120, 0.16)',
          line: 'rgba(255, 194, 97, 0.9)',
        },
      },
      {
        title: 'Поп',
        mood: 'Легкий драйв',
        caption: 'Светло, ярко, цепко.',
        matches: ['pop', 'dance', 'disco', 'electropop', 'k pop', 'synthpop'],
        palette: ['#8ef6ff', '#6cc8ff', '#f8a5ff', '#ffd3a5'],
        pattern: ['..111...', '.12221..', '1233321.', '12344321', '12344321', '.1233321', '..12221.', '...111..'],
        theme: {
          from: 'rgba(108, 200, 255, 0.18)',
          to: 'rgba(248, 165, 255, 0.06)',
          ring: 'rgba(152, 217, 255, 0.24)',
          chip: 'rgba(180, 220, 255, 0.14)',
          line: 'rgba(188, 232, 255, 0.9)',
        },
      },
      {
        title: 'Электроника',
        mood: 'Фокус-поток',
        caption: 'Пульс и холодный грув.',
        matches: ['electronic', 'house', 'techno', 'edm', 'synth', 'garage', 'dnb'],
        palette: ['#8ab4ff', '#6b7cff', '#48e5c2', '#2f5bd3'],
        pattern: ['1.1.1.1.', '.2.2.2.2', '33..44..', '.33..44.', '..44..33', '.44..33.', '2.2.2.2.', '1.1.1.1.'],
        theme: {
          from: 'rgba(116, 142, 255, 0.2)',
          to: 'rgba(72, 229, 194, 0.06)',
          ring: 'rgba(134, 156, 255, 0.24)',
          chip: 'rgba(124, 162, 255, 0.15)',
          line: 'rgba(164, 205, 255, 0.9)',
        },
      },
      {
        title: 'Рок',
        mood: 'Сцена и энергия',
        caption: 'Гитара вперед, ритм в стену.',
        matches: ['rock', 'alternative', 'grunge', 'indie rock', 'punk', 'metal'],
        palette: ['#ffd166', '#f9844a', '#d1495b', '#5e2b3d'],
        pattern: ['4......4', '.44..44.', '..4224..', '...22...', '...22...', '..4224..', '.44..44.', '4......4'],
        theme: {
          from: 'rgba(249, 132, 74, 0.2)',
          to: 'rgba(94, 43, 61, 0.06)',
          ring: 'rgba(251, 159, 102, 0.24)',
          chip: 'rgba(255, 179, 126, 0.14)',
          line: 'rgba(255, 184, 121, 0.88)',
        },
      },
      {
        title: 'Джаз и соул',
        mood: 'Теплый вечер',
        caption: 'Мягкий свинг и глубина.',
        matches: ['jazz', 'soul', 'blues', 'funk', 'fusion'],
        palette: ['#ffe29a', '#ffc26f', '#ff9f68', '#8d5a97'],
        pattern: ['...11...', '..1221..', '.123321.', '12344321', '.123321.', '..1221..', '...11...', '..1..1..'],
        theme: {
          from: 'rgba(255, 194, 111, 0.18)',
          to: 'rgba(141, 90, 151, 0.07)',
          ring: 'rgba(255, 199, 123, 0.22)',
          chip: 'rgba(255, 206, 146, 0.14)',
          line: 'rgba(255, 216, 146, 0.88)',
        },
      },
    ]

    if (!pool.length) return []

    const usedTrackIds = new Set()

    return groups.map((group, index) => {
      const track = pool.find((candidate) => {
        if (!candidate?.id || usedTrackIds.has(candidate.id)) return false
        const genres = Array.isArray(candidate?.genres)
          ? candidate.genres.map((genre) => normalizeGenreName(genre))
          : []
        return genres.some((genre) => group.matches.some((token) => genre.includes(token)))
      }) || pool.find((candidate) => candidate?.id && !usedTrackIds.has(candidate.id))
        || pool[index % pool.length]

      if (!track?.id) return null
      usedTrackIds.add(track.id)

      return {
        ...group,
        track,
        pixel: buildGenrePixelArt(group.pattern, group.palette, `${group.title} — ${group.mood}`),
      }
    }).filter((entry) => entry?.track?.id)
  }

  function getArtistEntries(pool) {
    const seen = new Set()
    const list = []
    pool.forEach((track) => {
      const artist = track?.artist
      const key = artist?.id || artist?.name
      if (!key || seen.has(key)) return
      seen.add(key)
      list.push({ artist, track })
    })
    return list
  }

  function toPositiveFiniteNumber(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  function normalizeArtistLookupName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  }

  function extractCatalogArtistId(value) {
    const source = String(value || '').trim()
    if (!source) return ''
    const prefixedMatch = source.match(/^ym-artist-(\d+)$/i)
    if (prefixedMatch) return prefixedMatch[1]
    if (/^\d+$/.test(source)) return source
    return ''
  }

  function formatMonthlyListeners(value) {
    const monthly = toPositiveFiniteNumber(value)
    if (!monthly) return 'Нет данных за месяц'
    return `${MONTHLY_LISTENERS_FORMATTER.format(monthly)} в месяц`
  }

  function getArtistMetaLine(artist) {
    return formatMonthlyListeners(artist?.lastMonthListeners)
  }

  async function fetchArtistStats({ artistId = '', artistName = '' } = {}) {
    const normalizedArtistId = extractCatalogArtistId(artistId)
    const normalizedArtistName = normalizeArtistLookupName(artistName)
    if (!normalizedArtistId && !normalizedArtistName) {
      return null
    }

    const cacheKey = normalizedArtistId ? `id:${normalizedArtistId}` : `name:${normalizedArtistName}`
    const cached = artistStatsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.artist
    }

    const pending = artistStatsInflight.get(cacheKey)
    if (pending) {
      return pending
    }

    const path = normalizedArtistId
      ? `/catalog/artist?artistId=${encodeURIComponent(normalizedArtistId)}&limit=1`
      : `/catalog/artist?name=${encodeURIComponent(artistName)}&limit=1`

    const request = api(path, { auth: 'optional' })
      .then((payload) => payload?.artist ?? null)
      .catch(() => null)
      .then((artist) => {
        artistStatsCache.set(cacheKey, {
          artist,
          expiresAt: Date.now() + ARTIST_STATS_CACHE_TTL_MS,
        })
        if (normalizedArtistId && artist?.name) {
          const byNameKey = `name:${normalizeArtistLookupName(artist.name)}`
          artistStatsCache.set(byNameKey, {
            artist,
            expiresAt: Date.now() + ARTIST_STATS_CACHE_TTL_MS,
          })
        }
        return artist
      })
      .finally(() => {
        artistStatsInflight.delete(cacheKey)
      })

    artistStatsInflight.set(cacheKey, request)
    return request
  }

  async function hydrateHomeArtistMonthlyListeners() {
    if (!el.homeArtists) return
    const rows = [...el.homeArtists.querySelectorAll('[data-artist-monthly]')]
    if (!rows.length) return

    await Promise.all(rows.map(async (row) => {
      const artistId = row.getAttribute('data-artist-id') || ''
      const artistName = row.getAttribute('data-artist-name') || ''
      const artist = await fetchArtistStats({ artistId, artistName })
      if (!row.isConnected) return
      row.textContent = getArtistMetaLine(artist)
    }))
  }

  function normalizeGenreName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' ')
  }

  function humanizeGenre(value) {
    const source = String(value || '')
      .trim()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
    if (!source) return ''
    return source
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function findMyWaveAccent(genre) {
    const normalized = normalizeGenreName(genre)
    if (!normalized) return null
    return MY_WAVE_ACCENTS.find((entry) => entry.match.some((needle) => normalized.includes(needle))) || null
  }

  function getMyWavePalette(items) {
    const counts = new Map()
    const pool = items.slice(0, 12)

    pool.forEach((item) => {
      const genres = Array.isArray(item?.track?.genres) ? item.track.genres : []
      genres.forEach((genre) => {
        const accent = findMyWaveAccent(genre)
        if (!accent) return
        const current = counts.get(accent.key) || {
          count: 0,
          accent,
          genreLabel: '',
        }
        current.count += 1
        if (!current.genreLabel) current.genreLabel = humanizeGenre(genre)
        counts.set(accent.key, current)
      })
    })

    if (!counts.size) {
      return {
        ...MY_WAVE_FALLBACK_ACCENT,
        genreLabel: 'ÐŸÐµÑ€ÑÐ¾Ð½Ð°Ð»ÑŒÐ½Ñ‹Ð¹ Ð¿Ð¾Ñ‚Ð¾Ðº',
      }
    }

    const [winner] = [...counts.values()].sort((left, right) => right.count - left.count)
    return {
      ...winner.accent,
      genreLabel: winner.genreLabel || winner.accent.tone,
    }
  }

  function applyMyWavePalette(palette, isEmpty = false) {
    const target = document.body
    if (!target) return
    target.style.setProperty('--wave-accent', palette?.accent || MY_WAVE_FALLBACK_ACCENT.accent)
    target.style.setProperty('--wave-accent-rgb', palette?.rgb || MY_WAVE_FALLBACK_ACCENT.rgb)
    target.style.setProperty('--wave-accent-soft', palette?.soft || MY_WAVE_FALLBACK_ACCENT.soft)
    target.style.setProperty('--wave-accent-muted', palette?.muted || MY_WAVE_FALLBACK_ACCENT.muted)
    target.dataset.waveState = isEmpty ? 'empty' : 'active'
  }

  function readCachedTracks() {
    try {
      const raw = localStorage.getItem(TRACKS_CACHE_KEY)
      if (!raw) return []
      const payload = JSON.parse(raw)
      if (!payload || !Array.isArray(payload.items)) return []
      if (Date.now() - Number(payload.at || 0) > TRACKS_CACHE_TTL_MS) return []
      return payload.items
    } catch {
      return []
    }
  }

  function writeCachedTracks(items) {
    try {
      localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify({ at: Date.now(), items }))
    } catch {
      // ignore cache write errors
    }
  }

  async function refreshToken() {
    const rt = localStorage.getItem(REFRESH) || ''
    if (!rt) return ''
    const r = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) })
    if (!r.ok) return ''
    const p = await r.json().catch(() => ({}))
    if (p.accessToken) localStorage.setItem(TOKEN, p.accessToken)
    return p.accessToken || ''
  }

  async function api(path, { method = 'GET', body, auth = 'none', retry = true, signal } = {}) {
    let token = (auth === 'required' || auth === 'optional') ? (localStorage.getItem(TOKEN) || '') : ''
    if (auth === 'required' && !token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const r = await fetch(`${apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
    if (r.status === 204) return null
    if (r.status === 401 && auth !== 'none' && retry) {
      const t = await refreshToken()
      if (t) return api(path, { method, body, auth, retry: false, signal })
    }
    const p = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(p.error || `HTTP ${r.status}`), { status: r.status })
    return p
  }

  function syncLikes() {
    document.querySelectorAll('[data-track-like-id]').forEach((b) => {
      const id = b.getAttribute('data-track-like-id')
      b.textContent = state.likes.has(id) ? 'â™¥' : 'â™¡'
    })
    if (el.like) {
      const active = Boolean(state.track && state.likes.has(state.track.id))
      el.like.innerHTML = heartIcon(active)
      el.like.style.color = active ? '#f2f2f2' : 'rgba(255,255,255,0.58)'
    }
  }

  function syncPlayer() {
    if (el.cur) el.cur.textContent = fmt(state.t)
    if (el.dur) el.dur.textContent = fmt(state.d)
    const pct = state.d > 0 ? clamp((state.t / state.d) * 100, 0, 100) : 0
    if (el.progFill) el.progFill.style.width = `${pct}%`
    if (el.progThumb && !el.progThumb.classList.contains('right-0')) el.progThumb.style.left = `${pct}%`
    if (el.volFill) el.volFill.style.width = `${state.v}%`
    if (el.play) {
      el.play.innerHTML = playIcon(state.playing)
      el.play.setAttribute('aria-label', state.playing ? 'ÐŸÐ°ÑƒÐ·Ð°' : 'Ð˜Ð³Ñ€Ð°Ñ‚ÑŒ')
      el.play.title = state.playing ? 'ÐŸÐ°ÑƒÐ·Ð°' : 'Ð˜Ð³Ñ€Ð°Ñ‚ÑŒ'
    }
    syncLikes()
  }

  function setCurrent(track) {
    state.track = track
    if (el.title) el.title.textContent = track?.title || 'Untitled'
    if (el.artist) el.artist.textContent = track?.artist?.name || 'Unknown Artist'
    if (el.cover) el.cover.src = track?.coverUrl || COVER_PLACEHOLDER
  }

  function findTrack(id) {
    const myWaveTracks = state.myWave.map((item) => item?.track).filter((track) => track?.id)
    for (const arr of [state.list, myWaveTracks, state.tracks, ...state.playlists.map((p) => p.tracks || [])]) {
      const f = arr.find((t) => t.id === id)
      if (f) return f
    }
    return null
  }

  function markRows() {
    document.querySelectorAll('[data-track-row-id]').forEach((row) => {
      const on = row.getAttribute('data-track-row-id') === state.track?.id
      row.classList.toggle('bg-white/10', on)
    })
  }

  function stopYt() {
    if (yt.timer) clearInterval(yt.timer)
    yt.timer = null
    yt.player?.pauseVideo?.()
  }

  function getPlaybackListForPage() {
    if (page === 'my-wave') {
      const waveTracks = state.myWave.map((item) => item?.track).filter((track) => track?.id)
      if (waveTracks.length) return dedupeTracks(waveTracks)
    }

    return dedupeTracks(state.tracks)
  }

  function navigateInHost(path) {
    const to = new URL(path || '/', location.origin).toString()

    if (top && top !== window) {
      try {
        top.postMessage(
          {
            source: 'wavee-design-runtime',
            type: 'wavee-navigate',
            to,
          },
          window.location.origin,
        )
        return
      } catch {
        top.location.href = to
        return
      }
    }

    location.href = to
  }

  function playViaHost(track, ctx = 'manual', options = {}) {
    const overrideList = Array.isArray(options.list) ? dedupeTracks(options.list) : []
    const list = overrideList.length ? overrideList : getPlaybackListForPage()
    const playbackList = list.length ? list : [track].filter(Boolean)
    const index = Math.max(playbackList.findIndex((item) => item.id === track?.id), 0)

    state.track = track
    state.queue = playbackList
    state.idx = index
    state.playing = true
    setCurrent(track)
    markRows()

    if (top && top !== window) {
      top.postMessage(
        {
          source: 'wavee-design-runtime',
          type: 'wavee-play-track',
          track,
          list: playbackList,
          index,
          contextType: ctx,
        },
        window.location.origin,
      )
    }
  }

  function hasDirectPlayback(track) {
    if (!track) return false
    if (track.sourceType === 'youtube' && track.sourceId) return true
    return track.sourceType !== 'catalog' && Boolean(track.streamUrl)
  }

  function ytApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT)
    if (window.__waveeYtPromise) return window.__waveeYtPromise
    window.__waveeYtPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        resolve(window.YT)
      }
      if (!document.getElementById('wavee-youtube-iframe-api')) {
        const s = document.createElement('script')
        s.id = 'wavee-youtube-iframe-api'
        s.src = 'https://www.youtube.com/iframe_api'
        s.async = true
        document.body.appendChild(s)
      }
    })
    return window.__waveeYtPromise
  }

  function applyResolvedTrack(resolved) {
    if (!resolved?.id) return
    const patch = (item) => (item.id === resolved.id ? { ...item, ...resolved } : item)
    state.tracks = state.tracks.map(patch)
    state.list = state.list.map(patch)
    state.queue = state.queue.map(patch)
    state.playlists = state.playlists.map((playlist) => ({
      ...playlist,
      tracks: (playlist.tracks || []).map(patch),
    }))
  }

  async function prefetchPlaybackTrack(track) {
    if (!embedMode || !track?.id || hasDirectPlayback(track) || playbackPrefetchState.seen.has(track.id)) {
      return
    }

    playbackPrefetchState.seen.add(track.id)
    const resolved = await api(`/tracks/${encodeURIComponent(track.id)}/playback-source`, { auth: 'optional' }).catch(() => null)
    if (!resolved?.id || !hasDirectPlayback(resolved)) {
      return
    }

    applyResolvedTrack(resolved)
    if (state.track?.id === resolved.id) {
      setCurrent(resolved)
      markRows()
    }
  }

  function schedulePlaybackPrefetch(tracks) {
    if (!embedMode) {
      return
    }

    const targets = dedupeTracks(Array.isArray(tracks) ? tracks : [])
      .filter((track) => track?.id && !hasDirectPlayback(track) && !playbackPrefetchState.seen.has(track.id))
      .slice(0, 6)

    if (!targets.length) {
      return
    }

    clearTimeout(playbackPrefetchState.timer)
    playbackPrefetchState.timer = setTimeout(() => {
      targets.forEach((track, index) => {
        setTimeout(() => {
          void prefetchPlaybackTrack(track)
        }, index * 180)
      })
    }, 240)
  }

  async function play(track, ctx = 'manual', options = {}) {
    if (!track) return

    if (embedMode) {
      playViaHost(track, ctx, options)
      return
    }

    let playbackTrack = track
    if (!(track.sourceType === 'youtube' && track.sourceId)) {
      const resolved = await api(`/tracks/${encodeURIComponent(track.id)}/playback-source`, { auth: 'optional' }).catch(() => null)
      if (resolved?.sourceType === 'youtube' && resolved?.sourceId) {
        playbackTrack = resolved
        applyResolvedTrack(resolved)
      }
    }

    if (!(playbackTrack.sourceType === 'youtube' && playbackTrack.sourceId)) {
      state.playing = false
      syncPlayer()
      setHomeWaveActive(false)
      return
    }

    setCurrent(playbackTrack)
    state.t = 0
    state.d = playbackTrack.durationSec || 0
    const overrideList = Array.isArray(options.list) ? dedupeTracks(options.list) : []
    const base = overrideList.length ? overrideList : getPlaybackListForPage()
    state.queue = base.length ? [...base] : [playbackTrack]
    state.idx = state.queue.findIndex((t) => t.id === playbackTrack.id)

    audio?.pause()
    const YT = await ytApi()
    const hadPlayer = Boolean(yt.player)
    if (!yt.player) {
      yt.player = new YT.Player(ytHost, {
        width: '1',
        height: '1',
        videoId: playbackTrack.sourceId,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, fs: 0, playsinline: 1 },
        events: {
          onReady: (e) => { e.target.setVolume(state.v); e.target.playVideo(); state.d = e.target.getDuration?.() || state.d; syncPlayer() },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) next()
            if (e.data === YT.PlayerState.PLAYING) { state.playing = true; syncPlayer() }
            if (e.data === YT.PlayerState.PAUSED) { state.playing = false; syncPlayer() }
          },
        },
      })
    } else if (yt.vid !== playbackTrack.sourceId) yt.player.loadVideoById?.(playbackTrack.sourceId)
    else yt.player.playVideo?.()
    yt.vid = playbackTrack.sourceId
    if (hadPlayer) {
      yt.player?.setVolume?.(state.v)
    }
    if (yt.timer) clearInterval(yt.timer)
    yt.timer = setInterval(() => {
      state.t = yt.player?.getCurrentTime?.() || 0
      const d = yt.player?.getDuration?.() || 0
      if (d > 0) state.d = d
      syncPlayer()
    }, 250)

    state.playing = true
    syncPlayer()
    markRows()
    api('/events/play', { method: 'POST', auth: 'required', body: { trackId: playbackTrack.id, playedSeconds: 0, finished: false, contextType: ctx } }).catch(() => {})
  }

  function pause() {
    if (embedMode) return
    if (!state.track) return
    if (state.track.sourceType === 'youtube') yt.player?.pauseVideo?.()
    else audio?.pause()
    state.playing = false
    syncPlayer()
  }

  function resume() {
    if (embedMode) return
    if (!state.track) return
    if (state.track.sourceType === 'youtube' && !yt.player) {
      play(state.track, 'resume')
      return
    }
    if (state.track.sourceType !== 'youtube' && !audio?.src) {
      play(state.track, 'resume')
      return
    }
    if (state.track.sourceType === 'youtube') yt.player?.playVideo?.()
    else audio?.play().catch(() => {})
    state.playing = true
    syncPlayer()
  }

  function seek(sec) {
    if (embedMode) return
    if (!state.track) return
    state.t = clamp(sec, 0, state.d || 0)
    if (state.track.sourceType === 'youtube') yt.player?.seekTo?.(state.t, true)
    else if (audio) audio.currentTime = state.t
    syncPlayer()
  }

  function next() {
    if (embedMode) return
    if (!state.queue.length) return
    if (state.repeat && state.track) return play(state.track, 'repeat')
    if (state.shuffle) return play(state.queue[Math.floor(Math.random() * state.queue.length)], 'shuffle-next')
    const n = state.queue[state.idx + 1]
    if (!n) { state.playing = false; syncPlayer(); return }
    play(n, 'next')
  }

  function prev() {
    if (embedMode) return
    if (!state.queue.length) return
    play(state.queue[Math.max(state.idx - 1, 0)], 'previous')
  }

  async function toggleLike(id) {
    if (!localStorage.getItem(TOKEN)) return
    if (state.likes.has(id)) {
      await api(`/likes/${encodeURIComponent(id)}`, { method: 'DELETE', auth: 'required' }).catch(() => {})
      state.likes.delete(id)
    } else {
      await api(`/likes/${encodeURIComponent(id)}`, { method: 'POST', auth: 'required' }).catch(() => {})
      state.likes.add(id)
    }
    syncLikes()
  }

  function getArtistsCarouselStep() {
    if (!el.homeArtists) return 320
    const card = el.homeArtists.querySelector('.artist-spotlight-card')
    if (!card) return Math.max(el.homeArtists.clientWidth * 0.84, 240) * 2
    const styles = window.getComputedStyle(el.homeArtists)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
    return (card.getBoundingClientRect().width + gap) * 2
  }

  function syncArtistsCarouselControls() {
    if (!el.homeArtists || !el.homeArtistsPrev || !el.homeArtistsNext) return
    const maxScrollLeft = Math.max(0, el.homeArtists.scrollWidth - el.homeArtists.clientWidth)
    const scrollLeft = el.homeArtists.scrollLeft
    el.homeArtistsPrev.disabled = scrollLeft <= 8
    el.homeArtistsNext.disabled = scrollLeft >= maxScrollLeft - 8 || maxScrollLeft <= 8
  }

  function setArtistsCarouselSnapEnabled(enabled) {
    if (!el.homeArtists) return
    el.homeArtists.style.scrollSnapType = enabled ? 'x mandatory' : 'none'
  }

  function animateRailScroll(row, target, options = {}) {
    if (!row) return
    const {
      syncControls = () => {},
      setSnap = null,
    } = options

    const start = row.scrollLeft
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth)
    const clampedTarget = clamp(target, 0, maxScrollLeft)
    const distance = clampedTarget - start
    if (Math.abs(distance) < 2) {
      row.scrollLeft = clampedTarget
      syncControls()
      return
    }

    const activeFrame = railAnimationState.get(row)
    if (activeFrame) {
      cancelAnimationFrame(activeFrame)
      railAnimationState.delete(row)
    }

    if (typeof setSnap === 'function') {
      setSnap(false)
    }

    const startedAt = performance.now()
    const tick = (now) => {
      const progress = clamp((now - startedAt) / RAIL_SCROLL_DURATION_MS, 0, 1)
      row.scrollLeft = start + (distance * easeInOutCubic(progress))
      syncControls()
      if (progress < 1) {
        railAnimationState.set(row, requestAnimationFrame(tick))
        return
      }

      railAnimationState.delete(row)
      row.scrollLeft = clampedTarget
      if (typeof setSnap === 'function') {
        requestAnimationFrame(() => {
          setSnap(true)
          syncControls()
        })
        return
      }
      syncControls()
    }

    railAnimationState.set(row, requestAnimationFrame(tick))
  }

  function scrollArtistsCarousel(direction = 1) {
    if (!el.homeArtists) return
    const maxScrollLeft = Math.max(0, el.homeArtists.scrollWidth - el.homeArtists.clientWidth)
    const target = el.homeArtists.scrollLeft + (getArtistsCarouselStep() * direction)
    animateRailScroll(el.homeArtists, clamp(target, 0, maxScrollLeft), {
      syncControls: syncArtistsCarouselControls,
      setSnap: setArtistsCarouselSnapEnabled,
    })
  }

  function wireArtistsCarousel() {
    if (!el.homeArtists) return

    el.homeArtists.addEventListener('scroll', syncArtistsCarouselControls, { passive: true })

    if (el.homeArtistsPrev) el.homeArtistsPrev.onclick = () => scrollArtistsCarousel(-1)
    if (el.homeArtistsNext) el.homeArtistsNext.onclick = () => scrollArtistsCarousel(1)

    window.addEventListener('resize', syncArtistsCarouselControls)
    requestAnimationFrame(syncArtistsCarouselControls)
  }

  function getHomeRailStep(row) {
    if (!row) return 320
    const card = row.querySelector('.track-card')
    if (!card) return Math.max(row.clientWidth * 0.84, 240)
    const styles = window.getComputedStyle(row)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
    return (card.getBoundingClientRect().width + gap) * 2
  }

  function syncHomeRailControls(row, prevButton, nextButton) {
    if (!row || !prevButton || !nextButton) return
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth)
    const scrollLeft = row.scrollLeft
    prevButton.disabled = scrollLeft <= 8
    nextButton.disabled = scrollLeft >= maxScrollLeft - 8 || maxScrollLeft <= 8
  }

  function scrollHomeRail(row, prevButton, nextButton, direction = 1) {
    if (!row) return
    const target = row.scrollLeft + (getHomeRailStep(row) * direction)
    animateRailScroll(row, target, {
      syncControls: () => syncHomeRailControls(row, prevButton, nextButton),
    })
  }

  function wireHomeRail(row, prevButton, nextButton) {
    if (!row || !prevButton || !nextButton) return
    const sync = () => syncHomeRailControls(row, prevButton, nextButton)

    row.addEventListener('scroll', sync, { passive: true })

    prevButton.onclick = () => scrollHomeRail(row, prevButton, nextButton, -1)
    nextButton.onclick = () => scrollHomeRail(row, prevButton, nextButton, 1)

    window.addEventListener('resize', sync)
    requestAnimationFrame(sync)
  }

  function syncHomeTrackRailControls() {
    syncHomeRailControls(el.homeNewReleases, el.homeNewReleasesPrev, el.homeNewReleasesNext)
    syncHomeRailControls(el.homePopular, el.homePopularPrev, el.homePopularNext)
    syncHomeRailControls(el.homeDiscovery, el.homeDiscoveryPrev, el.homeDiscoveryNext)
  }

  function wireHomeTrackRails() {
    wireHomeRail(el.homeNewReleases, el.homeNewReleasesPrev, el.homeNewReleasesNext)
    wireHomeRail(el.homePopular, el.homePopularPrev, el.homePopularNext)
    wireHomeRail(el.homeDiscovery, el.homeDiscoveryPrev, el.homeDiscoveryNext)
  }

  function getArtistAvatarUrl(entry) {
    return (
      entry?.artist?.avatarUrl ||
      entry?.artist?.coverUrl ||
      entry?.artist?.imageUrl ||
      entry?.artist?.pictureUrl ||
      entry?.track?.coverUrl ||
      ''
    )
  }

  function getArtistInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'W'
  }

  function renderHome() {
    const pool = getHomeTrackPool()
    const fallbackTracks = dedupeTracks(state.tracks)
    const baseTracks = pool.length ? pool : fallbackTracks
    const currentTrack = state.track && state.track.id ? state.track : null

    if (el.homeGreeting) {
      el.homeGreeting.textContent = getGreetingLabel()
    }

    const coverMarkup = (track, altText, classes = 'h-full w-full object-cover') => (
      track?.coverUrl
        ? `<img src="${esc(track.coverUrl)}" alt="${esc(altText)}" class="${classes}" loading="lazy">`
        : '<div class="flex h-full w-full items-center justify-center bg-[#2d303a] text-3xl text-white/60">♪</div>'
    )

    const buildHorizontalTrackCards = (target, tracks) => {
      if (!target) return
      target.innerHTML = tracks.length
        ? tracks.map((track) => {
            const accent = currentTrack && currentTrack.id === track.id
            return `
              <article class="track-card ${accent ? 'track-card-accent' : ''} group w-72 flex-shrink-0 cursor-pointer" data-action="play-track" data-track-id="${esc(track.id)}">
                <div class="track-card-surface relative mb-4 aspect-square overflow-hidden rounded-[28px] ${accent ? 'card-active' : 'card-soft'}">
                  ${coverMarkup(track, track.title, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
                  <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80"></div>
                  <button data-action="play-track" data-track-id="${esc(track.id)}" class="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105" aria-label="Играть ${esc(track.title)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
                  </button>
                </div>
                <div class="track-card-meta px-1">
                  <h3 class="truncate text-white" style="font-family:'Public Pixel','Unbounded',sans-serif;font-size:13px;font-weight:500">${esc(track.title)}</h3>
                  <p class="mt-1 text-white/50" style="font-family:'Onest',sans-serif;font-size:12px;font-weight:400">${esc(track.artist?.name || 'Unknown Artist')}</p>
                </div>
              </article>
            `
          }).join('')
        : '<div class="rounded-2xl border border-white/10 bg-[#21232b] p-4 text-sm text-white/55">Музыка подбирается, обнови через пару секунд.</div>'
    }

    const releases = pickTracks(baseTracks, 8, 0)
    buildHorizontalTrackCards(el.homeNewReleases, releases)

    const popular = [...pickTracks(baseTracks, Math.min(baseTracks.length, 20), 3)]
      .sort((left, right) => {
        const leftScore = stablePercent(`${left.id}:popular`, 30, 100) + (state.likes.has(left.id) ? 10 : 0)
        const rightScore = stablePercent(`${right.id}:popular`, 30, 100) + (state.likes.has(right.id) ? 10 : 0)
        return rightScore - leftScore
      })
      .slice(0, 8)
    buildHorizontalTrackCards(el.homePopular, popular)

    if (el.homeGenres) {
      const buckets = getGenreMoodBuckets(baseTracks)
      el.homeGenres.innerHTML = buckets.length
        ? buckets.map((entry, index) => {
            const accentA = hexToRgb(entry.palette?.[0] || '#92A9E1')
            const accentB = hexToRgb(entry.palette?.[2] || '#5f77b0')
            const fillA = entry.theme?.from || rgba(accentA, 0.22)
            const fillB = entry.theme?.to || rgba(accentB, 0.08)
            const glowA = entry.theme?.ring || rgba(accentA, 0.3)
            const glowB = entry.theme?.chip || rgba(accentB, 0.16)
            const border = rgba(accentA, 0.26)
            const line = entry.theme?.line || rgba(accentA, 0.88)
            const sizeClass = (
              entry.title === 'Хип-хоп'
                ? 'is-featured'
                : (entry.title === 'Электроника' || entry.title === 'Джаз и соул')
                  ? 'is-wide'
                  : ''
            )
            const artistName = entry.track?.artist?.name || 'Wavee'
            return `
            <article class="home-genre-card group cursor-pointer ${sizeClass}" data-action="play-track" data-track-id="${esc(entry.track.id)}" style="--genre-card-fill-a:${esc(fillA)};--genre-card-fill-b:${esc(fillB)};--genre-card-glow-a:${esc(glowA)};--genre-card-glow-b:${esc(glowB)};--genre-card-border:${esc(border)};--genre-card-line:${esc(line)}">
              <div class="home-genre-card-body">
                <div class="home-genre-card-topline">
                  <span class="home-genre-card-index">${String(index + 1).padStart(2, '0')}</span>
                  <span class="home-genre-card-mood">${esc(entry.mood)}</span>
                </div>
                <h5 class="home-genre-card-title">${esc(entry.title)}</h5>
                <p class="home-genre-card-caption">${esc(entry.caption)}</p>
                <div class="home-genre-card-track">
                  <strong>${esc(entry.track?.title || entry.title)}</strong>
                  <span>${esc(artistName)}</span>
                </div>
              </div>
              <div class="home-genre-card-art" aria-hidden="true">
                ${entry.pixel}
              </div>
              <button data-action="play-track" data-track-id="${esc(entry.track.id)}" class="home-genre-card-play" aria-label="Играть ${esc(entry.title)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
              </button>
            </article>
          `
          }).join('')
        : '<div class="home-genre-empty">Жанры появятся после загрузки треков.</div>'
    }

    const homeGenresToolbar = document.querySelector('[data-home-genres-toolbar]')
    if (homeGenresToolbar && !homeGenresToolbar.dataset.bound) {
      homeGenresToolbar.querySelectorAll('[data-home-genres-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          homeGenresToolbar
            .querySelectorAll('[data-home-genres-tab]')
            .forEach((item) => item.classList.remove('is-active'))
          button.classList.add('is-active')
        })
      })
      homeGenresToolbar.dataset.bound = '1'
    }

    if (el.homeArtists) {
      const artists = getArtistEntries(baseTracks).slice(0, 8)
      el.homeArtists.innerHTML = artists.length
        ? artists.map((entry, index) => {
            const artistName = entry.artist?.name || 'Wavee Artist'
            const artistAvatarUrl = getArtistAvatarUrl(entry)
            const artistId = extractCatalogArtistId(entry.artist?.id)
            const metaLine = getArtistMetaLine(entry.artist)
            return `
              <article class="artist-spotlight-card">
                <div class="artist-spotlight-top">
                  <span class="artist-spotlight-rank">${String(index + 1).padStart(2, '0')}</span>
                </div>
                <div class="artist-spotlight-main">
                  <div class="artist-spotlight-stage">
                    <div class="artist-spotlight-cover-shell">
                      ${artistAvatarUrl
                        ? `<img src="${esc(artistAvatarUrl)}" alt="${esc(artistName)}" class="h-full w-full object-cover" loading="lazy">`
                        : `<div class="artist-spotlight-cover-fallback">${esc(getArtistInitials(artistName))}</div>`}
                    </div>
                  </div>
                  <div class="artist-spotlight-copy">
                    <h5 class="artist-spotlight-name">${esc(artistName)}</h5>
                    <p class="artist-spotlight-meta" data-artist-monthly data-artist-id="${esc(artistId)}" data-artist-name="${esc(artistName)}">${esc(metaLine)}</p>
                  </div>
                </div>
                <div class="artist-spotlight-actions">
                  <button data-action="play-track" data-track-id="${esc(entry.track.id)}" class="artist-spotlight-play" aria-label="Играть ${esc(artistName)}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
                    <span>Слушать</span>
                  </button>
                  <button type="button" class="artist-spotlight-follow" aria-label="Подписаться на ${esc(artistName)}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                  </button>
                </div>
              </article>
            `
          }).join('')
        : '<div class="rounded-2xl border border-white/10 bg-[#21232b] p-4 text-sm text-white/55">Пока нет артистов для персональных рекомендаций.</div>'

      requestAnimationFrame(syncArtistsCarouselControls)
      void hydrateHomeArtistMonthlyListeners()
    }

    if (el.homeEditorial) {
      const editorialTracks = [...pickTracks(baseTracks, Math.min(baseTracks.length, 12), 0)]
        .sort((left, right) => scoreBySeed(`${right.id}:editorial`) - scoreBySeed(`${left.id}:editorial`))
        .slice(0, 4)
      const editorialLabels = ['Редакция', 'Выбор недели', 'Большая подборка', 'Сцена дня']

      el.homeEditorial.innerHTML = editorialTracks.length
        ? editorialTracks.map((track, index) => `
            <article class="group cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06]" data-action="play-track" data-track-id="${esc(track.id)}">
              <div class="relative aspect-[16/10] overflow-hidden">
                ${coverMarkup(track, track.title, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"></div>
                <span class="absolute left-4 top-4 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-white/80" style="font-family:'Public Pixel','Unbounded',sans-serif">${esc(editorialLabels[index] || 'Подборка')}</span>
                <button data-action="play-track" data-track-id="${esc(track.id)}" class="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105" aria-label="Играть ${esc(track.title)}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
                </button>
              </div>
              <div class="p-4">
                <h3 class="truncate text-white" style="font-family:'Public Pixel','Unbounded',sans-serif;font-size:14px">${esc(track.title)}</h3>
                <p class="mt-1 truncate text-white/55" style="font-family:'Onest',sans-serif;font-size:12px">${esc(track.artist?.name || 'Wavee')}</p>
              </div>
            </article>
          `).join('')
        : '<div class="rounded-2xl border border-white/10 bg-[#21232b] p-4 text-sm text-white/55">Редакционные подборки готовятся.</div>'
    }

    if (el.homeDiscovery) {
      const discovery = [...pickTracks(baseTracks, Math.min(baseTracks.length, 20), 0)]
        .sort((left, right) => stablePercent(`${left.id}:discovery`, 0, 100) - stablePercent(`${right.id}:discovery`, 0, 100))
        .slice(0, 8)
      buildHorizontalTrackCards(el.homeDiscovery, discovery)
    }

    requestAnimationFrame(syncHomeTrackRailControls)

    if (el.hero) {
      const myWaveTracks = getMyWaveTracks()
      const canStart = myWaveTracks.length > 0 || baseTracks.length > 0
      const hasPersonalWave = myWaveTracks.length > 0

      el.hero.disabled = !canStart
      const heroVariant = pickHeroArtVariant()
      const heroAnimalTitle = heroVariant?.title || 'Зверек'
      const heroLabelBase = hasPersonalWave ? 'Слушать мою волну' : 'Слушать волну'
      el.hero.setAttribute('aria-label', heroLabelBase + ': ' + heroAnimalTitle)
      el.hero.classList.toggle('is-muted', !canStart)
      if (!heroArtState.active) {
        renderHeroArtIdle()
      }
    }
  }

  function renderMyWave() {
    if (!el.myWaveStreamRow || !el.myWaveEmpty) return
    const items = state.myWave.filter((item) => item?.track?.id)
    const hasSession = Boolean(localStorage.getItem(TOKEN))
    const heroEntry = items[0] || null
    const heroTrack = heroEntry?.track || null
    const palette = getMyWavePalette(items)

    applyMyWavePalette(palette, !items.length)

    if (el.myWaveHeroTrack) {
      el.myWaveHeroTrack.textContent = heroTrack?.title || 'Ð’Ð¾Ð»Ð½Ð° ÐµÑ‰Ðµ ÑÐ»ÑƒÑˆÐ°ÐµÑ‚ Ñ‚ÐµÐ±Ñ'
    }
      if (el.myWaveHeroArtist) {
        el.myWaveHeroArtist.textContent = heroTrack
          ? `${heroTrack.artist?.name || 'Unknown Artist'} â€¢ ${fmt(heroTrack.durationSec || 0)}`
          : hasSession
            ? 'Ð”Ð¾Ð±Ð°Ð²ÑŒ Ð¿Ð°Ñ€Ñƒ ÑÐ¸Ð³Ð½Ð°Ð»Ð¾Ð².'
            : 'Ð’Ð¾Ð¹Ð´Ð¸ Ð² Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚.'
      }
      if (el.myWaveHeroReason) {
        el.myWaveHeroReason.textContent = heroEntry ? reasonLabel(heroEntry.reason) : 'Ð¢Ð¸Ñ…Ð¾'
      }
      if (el.myWaveHeroGenre) {
        el.myWaveHeroGenre.textContent = heroEntry ? palette.genreLabel : 'ÐŸÐ¾Ñ‚Ð¾Ðº'
      }
    if (el.myWaveStageTone) {
      el.myWaveStageTone.textContent = palette.tone
    }
      if (el.myWaveStageSubtitle) {
        el.myWaveStageSubtitle.textContent = heroEntry
          ? `${palette.genreLabel || 'Ð¢Ð²Ð¾Ð¹ Ð²ÐºÑƒÑ'} Ð²ÐµÐ´Ñ‘Ñ‚ Ð¿Ð¾Ñ‚Ð¾Ðº.`
          : hasSession
            ? 'ÐÑƒÐ¶Ð½Ñ‹ ÑÐ¸Ð³Ð½Ð°Ð»Ñ‹.'
            : 'ÐÑƒÐ¶ÐµÐ½ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚.'
      }
      if (el.myWaveHeroPlay) {
        if (heroTrack?.id) {
          el.myWaveHeroPlay.disabled = false
          el.myWaveHeroPlay.textContent = 'Ð¡Ð»ÑƒÑˆÐ°Ñ‚ÑŒ Ð¿Ð¾Ñ‚Ð¾Ðº'
        el.myWaveHeroPlay.setAttribute('data-action', 'play-track')
        el.myWaveHeroPlay.setAttribute('data-track-id', heroTrack.id)
        el.myWaveHeroPlay.setAttribute('aria-label', `Ð¡Ð»ÑƒÑˆÐ°Ñ‚ÑŒ Ð¿Ð¾Ñ‚Ð¾Ðº: ${heroTrack.title}`)
        } else {
          el.myWaveHeroPlay.disabled = true
          el.myWaveHeroPlay.textContent = 'Ð–Ð´Ñ‘Ð¼ ÑÐ¸Ð³Ð½Ð°Ð»'
          el.myWaveHeroPlay.removeAttribute('data-action')
          el.myWaveHeroPlay.removeAttribute('data-track-id')
        }
      }

    if (!items.length) {
      if (el.myWaveStreamSection) el.myWaveStreamSection.style.display = 'none'
      if (el.myWaveSecondarySection) el.myWaveSecondarySection.style.display = 'none'
      el.myWaveStreamRow.innerHTML = ''
      if (el.myWaveSecondaryGrid) el.myWaveSecondaryGrid.innerHTML = ''
      el.myWaveEmpty.style.display = 'flex'
        if (el.myWaveEmptyText) {
          el.myWaveEmptyText.textContent = hasSession
            ? 'ÐŸÐ¾ÑÑ‚Ð°Ð²ÑŒ Ð»Ð°Ð¹ÐºÐ¸ Ð¸Ð»Ð¸ Ð²ÐºÐ»ÑŽÑ‡Ð¸ Ð¿Ð°Ñ€Ñƒ Ñ‚Ñ€ÐµÐºÐ¾Ð².'
            : 'Ð’Ð¾Ð¹Ð´Ð¸ Ð² Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚.'
        }
        return
      }

    if (el.myWaveStreamSection) el.myWaveStreamSection.style.display = ''
    el.myWaveEmpty.style.display = 'none'
    const streamItems = items.slice(0, 8)
    const secondaryTracks = items.slice(8, 16)
    const fallbackMixes = getMixEntries()
      .filter((entry) => entry?.track?.id && entry.track.id !== heroTrack?.id)
      .slice(0, 4)

    el.myWaveStreamRow.innerHTML = streamItems.map((item, index) => {
      const track = item.track
      return `
        <article class="my-wave-stream-card ${index === 0 ? 'is-featured' : ''} group" data-action="play-track" data-track-id="${esc(track.id)}">
          <div class="my-wave-stream-frame">
            <div class="my-wave-stream-cover">
              ${track.coverUrl
                ? `<img src="${esc(track.coverUrl)}" alt="${esc(track.title)}" loading="lazy">`
                : '<div class="flex h-full w-full items-center justify-center bg-white/10 text-3xl text-white/60">â™ª</div>'}
            </div>
            ${index === 0 ? '<div class="my-wave-stream-badge">Ð’Ñ…Ð¾Ð´ Ð² Ð¿Ð¾Ñ‚Ð¾Ðº</div>' : ''}
            <div class="my-wave-stream-overlay">
              <button data-action="play-track" data-track-id="${esc(track.id)}" class="my-wave-play-badge" aria-label="Ð˜Ð³Ñ€Ð°Ñ‚ÑŒ ${esc(track.title)}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
              </button>
            </div>
            <div class="my-wave-stream-content">
              <h3 class="my-wave-stream-title">${esc(track.title)}</h3>
              <p class="my-wave-stream-artist">${esc(track.artist?.name || 'Unknown Artist')}</p>
              <div class="my-wave-stream-meta">
                <span>${fmt(track.durationSec || 0)}</span>
                <span class="my-wave-stream-reason">${esc(reasonLabel(item.reason))}</span>
              </div>
            </div>
          </div>
        </article>
      `
    }).join('')

    const secondaryMarkup = secondaryTracks.length
      ? secondaryTracks.map((item) => {
        const track = item.track
        return `
          <article class="my-wave-secondary-card group" data-action="play-track" data-track-id="${esc(track.id)}">
            <div class="my-wave-secondary-media">
              ${track.coverUrl
                ? `<img src="${esc(track.coverUrl)}" alt="${esc(track.title)}" loading="lazy">`
                : '<div class="flex h-full w-full items-center justify-center bg-white/10 text-2xl text-white/60">â™ª</div>'}
              <div class="my-wave-secondary-overlay">
                <button data-action="play-track" data-track-id="${esc(track.id)}" class="my-wave-play-badge" aria-label="Ð˜Ð³Ñ€Ð°Ñ‚ÑŒ ${esc(track.title)}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
                </button>
              </div>
            </div>
            <div class="my-wave-secondary-body">
              <h3 class="my-wave-secondary-title">${esc(track.title)}</h3>
              <p class="my-wave-secondary-artist">${esc(track.artist?.name || 'Unknown Artist')}</p>
              <p class="my-wave-secondary-reason">${esc(reasonLabel(item.reason))}</p>
            </div>
          </article>
        `
      }).join('')
      : fallbackMixes.map((mix) => `
          <article class="my-wave-secondary-card group" data-action="play-track" data-track-id="${esc(mix.track?.id || '')}">
            <div class="my-wave-secondary-media">
              ${mix.track?.coverUrl
                ? `<img src="${esc(mix.track.coverUrl)}" alt="${esc(mix.title)}" loading="lazy">`
                : '<div class="flex h-full w-full items-center justify-center bg-white/10 text-2xl text-white/60">â™ª</div>'}
              <div class="my-wave-secondary-overlay">
                <button data-action="play-track" data-track-id="${esc(mix.track?.id || '')}" class="my-wave-play-badge" aria-label="Ð˜Ð³Ñ€Ð°Ñ‚ÑŒ ${esc(mix.title)}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
                </button>
              </div>
            </div>
            <div class="my-wave-secondary-body">
              <h3 class="my-wave-secondary-title">${esc(mix.title)}</h3>
              <p class="my-wave-secondary-artist">${esc(mix.track?.artist?.name || 'Wavee')}</p>
              <p class="my-wave-secondary-reason">${esc(mix.subtitle)}</p>
            </div>
          </article>
        `).join('')

    if (el.myWaveSecondarySection) el.myWaveSecondarySection.style.display = secondaryMarkup ? '' : 'none'
    if (el.myWaveSecondaryGrid) el.myWaveSecondaryGrid.innerHTML = secondaryMarkup
  }

  function wire() {
    document.querySelectorAll('[data-nav-route]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault()
      navigateInHost(a.getAttribute('data-nav-route') || '/')
    }))

    if (!embedMode && el.play) el.play.onclick = () => (state.track ? (state.playing ? pause() : resume()) : play(state.list[0] || state.tracks[0], 'player-first'))
    if (!embedMode && el.prev) el.prev.onclick = prev
    if (!embedMode && el.next) el.next.onclick = next
    if (!embedMode && el.back) el.back.onclick = () => seek(state.t - 10)
    if (!embedMode && el.fwd) el.fwd.onclick = () => seek(state.t + 10)
    if (el.like) el.like.onclick = () => state.track && toggleLike(state.track.id)
    if (el.queue) el.queue.onclick = () => { navigateInHost('/library') }
    if (!embedMode && el.shuf) el.shuf.onclick = () => { state.shuffle = !state.shuffle; el.shuf.style.opacity = state.shuffle ? '1' : '' }
    if (!embedMode && el.rep) el.rep.onclick = () => { state.repeat = !state.repeat; el.rep.style.opacity = state.repeat ? '1' : '' }
    if (!embedMode && el.prog) el.prog.onclick = (e) => { const r = el.prog.getBoundingClientRect(); if (r.width > 0) seek(((e.clientX - r.left) / r.width) * state.d) }
    if (!embedMode && el.vol) el.vol.onclick = (e) => { const bar = el.vol.querySelector('div'); if (!bar || !audio) return; const r = bar.getBoundingClientRect(); if (r.width > 0) { state.v = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100); audio.volume = state.v / 100; yt.player?.setVolume?.(state.v); syncPlayer() } }
    if (el.hero) {
      const triggerHero = () => {
        const waveTracks = getMyWaveTracks()
        const playbackList = waveTracks.length ? waveTracks : dedupeTracks(state.tracks)
        const leadTrack = playbackList[0]
        if (!leadTrack) return
        setHomeWaveActive(true)
        play(leadTrack, 'home-wave-trigger', { list: playbackList })
      }
      el.hero.onclick = (event) => {
        event.preventDefault?.()
        triggerHero()
      }
      el.hero.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          triggerHero()
        }
      }
    }
    if (el.myWaveRefresh) el.myWaveRefresh.onclick = async () => {
      const wave = localStorage.getItem(TOKEN)
        ? await api('/recommendations/my-wave', { auth: 'required' }).catch(() => ({ items: [] }))
        : { items: [] }
      state.myWave = wave.items || []
      renderMyWave()
    }
    wireHomeTrackRails()
    wireArtistsCarousel()

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]')
      if (!t) return
      e.preventDefault()
      const id = t.getAttribute('data-track-id') || ''
      if (t.getAttribute('data-action') === 'play-track') { const tr = findTrack(id); if (tr) play(tr, 'list-click') }
      if (t.getAttribute('data-action') === 'like-track') toggleLike(id)
    })

    if (audio) {
      audio.onloadedmetadata = () => { state.d = Number.isFinite(audio.duration) ? audio.duration : state.d; syncPlayer() }
      audio.ontimeupdate = () => { state.t = audio.currentTime || 0; syncPlayer() }
      audio.onended = () => next()
      audio.onplay = () => { state.playing = true; syncPlayer() }
      audio.onpause = () => { if (state.track?.sourceType !== 'youtube') { state.playing = false; syncPlayer() } }
    }
  }

  ;(async () => {
    const disposeHomeVisualizer = initHomeVisualizer()
    wire()
    const hasSession = Boolean(localStorage.getItem(TOKEN))
    const cachedTracks = readCachedTracks()

    const renderCurrentPage = ({ initial = false } = {}) => {
      if (page === 'home') renderHome()
      if (page === 'my-wave') renderMyWave()
    }

    if (cachedTracks.length) {
      state.tracks = cachedTracks
      state.list = [...cachedTracks]
      renderCurrentPage({ initial: true })
      if (state.tracks[0] && !embedMode) {
        setCurrent(state.tracks[0])
        state.d = state.tracks[0].durationSec || 0
        syncPlayer()
      }
    }

    const catalogFeed = await api('/catalog/feed?limit=40', { auth: 'optional' }).catch(() => ({ items: [] }))
    const tracks = (Array.isArray(catalogFeed.items) && catalogFeed.items.length)
      ? { items: [] }
      : await api('/tracks?query=&limit=40&offset=0', { auth: 'optional' }).catch(() => ({ items: [] }))

    const nextTracks = Array.isArray(catalogFeed.items) && catalogFeed.items.length
      ? catalogFeed.items
      : (Array.isArray(tracks.items) ? tracks.items : [])

    if (nextTracks.length) {
      state.tracks = nextTracks
      writeCachedTracks(nextTracks)
    } else if (!state.tracks.length) {
      state.tracks = []
    }

    state.list = [...state.tracks]
    renderCurrentPage({ initial: true })

    schedulePlaybackPrefetch(state.list.length ? state.list : state.tracks)

    if (state.tracks[0] && !embedMode) {
      setCurrent(state.tracks[0])
      state.d = state.tracks[0].durationSec || 0
      syncPlayer()
    }

    if (hasSession) {
      void Promise.all([
        api('/library/likes', { auth: 'required' }).catch(() => ({ items: [] })),
        api('/recommendations/my-wave', { auth: 'required' }).catch(() => ({ items: [] })),
        api('/playlists', { auth: 'required' }).catch(() => ({ items: [] })),
      ]).then(([likes, wave, playlists]) => {
        state.likes = new Set((likes.items || []).map((t) => t.id))
        state.myWave = wave.items || []
        state.playlists = playlists.items || []
        renderCurrentPage({ initial: false })
        syncLikes()
      }).catch(() => {})
    }

    window.addEventListener('pagehide', () => {
      disposeHomeVisualizer()
      stopHeroArtAnimation()
    }, { once: true })
  })()
})()



