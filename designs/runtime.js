(() => {
  if (window.__waveeDesignRuntimeMounted) return
  window.__waveeDesignRuntimeMounted = true

  const TOKEN = 'wavee_access_token'
  const REFRESH = 'wavee_refresh_token'
  const API_DEFAULT = 'http://127.0.0.1:8787'
  const REQUEST_TIMEOUT_MS = 8_000
  const TRACKS_CACHE_TTL_MS = 3 * 60 * 1000
  const TRACKS_CACHE_STALE_TTL_MS = 24 * 60 * 60 * 1000
  const HOME_RECO_CACHE_TTL_MS = 5 * 60 * 1000
  const HOME_RECO_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000
  const API_GET_CACHE_DEFAULT_TTL_MS = 20 * 1000
  const HOME_PERSONALIZATION_REFRESH_TTL_MS = 45 * 1000
  const HOME_PLAYBACK_PREFETCH_LIMIT = 6
  const PLAYBACK_SOURCE_CACHE_TTL_MS = 10 * 60 * 1000
  const HOME_ARTIST_MONTHLY_HYDRATION_LIMIT = 12
  const HOME_FORCE_DISCONNECTED_PLACEHOLDERS = false
  const page = document.body?.dataset?.waveePage || ''
  const ACTIVE_RUNTIME_PAGES = new Set(['home', 'my-wave'])
  if (!ACTIVE_RUNTIME_PAGES.has(page)) return
  const HAPTICS_ENABLED_KEY = 'wavee_settings_haptics_enabled'
  const HAPTIC_PATTERNS = {
    selection: 6,
    light: 10,
    medium: 15,
    like: [10, 26, 14],
    warning: [14, 32, 14],
  }
  let lastRuntimeHapticAt = 0
  function isMobileTouchRuntime() {
    if (typeof window === 'undefined') return false
    const hasTouch = (
      (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints ?? 0) > 0)
      || 'ontouchstart' in window
    )
    const coarsePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches
      : false
    return coarsePointer || window.innerWidth <= 767 || (hasTouch && window.innerWidth <= 1024)
  }
  function triggerRuntimeHaptic(style = 'light') {
    try {
      const storedHaptics = localStorage.getItem(HAPTICS_ENABLED_KEY)
      if (storedHaptics !== null && storedHaptics !== '1' && storedHaptics !== 'true') return
      if (!isMobileTouchRuntime()) return
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
      const now = Date.now()
      if (style !== 'like' && now - lastRuntimeHapticAt < 28) return
      lastRuntimeHapticAt = now
      navigator.vibrate(HAPTIC_PATTERNS[style] ?? HAPTIC_PATTERNS.light)
    } catch {
      // Ignore vibration failures
    }
  }
  const searchParams = new URLSearchParams(location.search)
  const isEmbeddedFrame = window.self !== window.top
  const embedMode = searchParams.get('embed') === 'app' || isEmbeddedFrame
  const apiBase = (() => {
    const q = searchParams.get('api')
    if (q) localStorage.setItem('wavee_api_base', q)
    return q || localStorage.getItem('wavee_api_base') || API_DEFAULT
  })()
  const TRACKS_CACHE_KEY = `wavee_tracks_cache_${apiBase}`
  const HOME_RECO_CACHE_KEY_PREFIX = `wavee_home_reco_v14_${apiBase}`
  const MY_WAVE_CACHE_KEY_PREFIX = `wavee_my_wave_v3_${apiBase}`
  const HOME_NEW_RELEASE_STRICT_AGE_MS = 90 * 24 * 60 * 60 * 1000
  const HOME_NEW_RELEASE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000
  const PLAYBACK_SOURCE_CACHE_KEY = `wavee_playback_sources_v1_${apiBase}`
  const COVER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMxMDNhOWYiLz48dGV4dCB4PSI1MCUiIHk9IjUzJSIgZmlsbD0iI2YxZjVmOSIgc3R5bGU9ImZvbnQ6IGJvbGQgNDJweCBtb25vc3BhY2U7IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7imao8L3RleHQ+PC9zdmc+'

  document.body.dataset.waveeEmbed = embedMode ? 'app' : 'standalone'

  function resetEmbedScrollPosition() {
    if (!embedMode) return
    try {
      if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
        history.scrollRestoration = 'manual'
      }
    } catch {
      // ignore
    }

    try {
      window.scrollTo(0, 0)
    } catch {
      // ignore
    }

    try {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0
        document.scrollingElement.scrollLeft = 0
      }
    } catch {
      // ignore
    }
  }

  function scheduleEmbedScrollReset() {
    if (!embedMode) return
    resetEmbedScrollPosition()
    requestAnimationFrame(() => {
      resetEmbedScrollPosition()
      requestAnimationFrame(() => {
        resetEmbedScrollPosition()
      })
    })
    setTimeout(resetEmbedScrollPosition, 0)
    setTimeout(resetEmbedScrollPosition, 120)
    setTimeout(resetEmbedScrollPosition, 400)
    setTimeout(resetEmbedScrollPosition, 900)
  }

  function stripRecoPrefix(id) {
    if (typeof id !== 'string') return id
    return id.startsWith('reco-') ? id.slice(5) : id
  }

  function getArtistNames(track, fallback = 'Wavee') {
    const names = []
    if (Array.isArray(track?.artists)) {
      track.artists.forEach((artist) => {
        const name = String(artist?.name ?? '').trim()
        if (name) names.push(name)
      })
    }
    const primaryName = String(track?.artist?.name ?? '').trim()
    if (primaryName) names.push(primaryName)
    const uniqueNames = [...new Set(names)]
    return uniqueNames.length ? uniqueNames : [fallback]
  }

  function formatArtistNames(track, fallback = 'Wavee') {
    return getArtistNames(track, fallback).join(', ')
  }

  function notifyParent(type, payload) {
    if (typeof window !== 'undefined' && window.top && window.top !== window) {
      window.top.postMessage(
        {
          source: 'wavee-design-runtime',
          type,
          ...payload,
        },
        window.location.origin
      )
    }
  }

  const state = {
    tracks: [],
    list: [],
    likes: new Set(),
    likedTracks: [],
    dislikes: new Set(),
    playlists: [],
    myWave: [],
    hostSynced: false,
    myWaveSettings: {
      character: 'favorite',
      mood: 'calm',
      activity: 'work',
      language: null,
    },
    queue: [],
    idx: -1,
    track: null,
    playing: false,
    t: 0,
    d: 0,
    v: 80,
    shuffle: false,
    repeat: false,
    authInvalid: false,
    homeCatalogReady: false,
    homePersonalLoading: Boolean(localStorage.getItem(TOKEN)),
    lastRenderedHomeMode: '',
    lastRenderedHomeHasBlocks: false,
    homeRecommendationsByMode: {
      'for-you': null,
      trends: null,
    },
    homeRecommendationsLoadingByMode: {
      'for-you': false,
      trends: false,
    },
    homeRailPositions: {
      'for-you': {},
      trends: {},
    },
    playbackSession: null,
    ctx: null,
  }
  const personalizationRefreshState = {
    inflight: null,
    lastAt: 0,
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
    homeWaveCovers: $('home-wave-covers'),
    homeWaveSettingsToggle: $('home-wave-settings-toggle'),
    homeWaveSettingsPanel: $('home-wave-settings-panel'),
    homeFilterSection: $('home-filter-section'),
    homeFilterChips: $('home-filter-chips'),
    homeQuickAccessSection: $('home-quick-access-section'),
    homeQuickAccessHeader: $('home-quick-access-header'),
    homeQuickAccess: $('home-quick-access-row'),
    homeQuickAccessPrev: $('home-quick-access-prev'),
    homeQuickAccessNext: $('home-quick-access-next'),
    homeFavoriteArtistsSection: $('home-favorite-artists-section'),
    homeFavoriteArtistsHeader: $('home-favorite-artists-header'),
    homeFavoriteArtists: $('home-favorite-artists-row'),
    homeFavoriteArtistsPrev: $('home-favorite-artists-prev'),
    homeFavoriteArtistsNext: $('home-favorite-artists-next'),
    homePopularArtistsSection: $('home-popular-artists-section'),
    homePopularArtistsHeader: $('home-popular-artists-header'),
    homePopularArtists: $('home-popular-artists-row'),
    homePopularArtistsPrev: $('home-popular-artists-prev'),
    homePopularArtistsNext: $('home-popular-artists-next'),
    homeSubtitleSection: $('home-subtitle-section'),
    homeTopTracksSection: $('home-top-tracks-section'),
    homeTopTracksHeader: $('home-top-tracks-header'),
    homeTopTracks: $('home-top-tracks-row'),
    homeTopTracksPrev: $('home-top-tracks-prev'),
    homeTopTracksNext: $('home-top-tracks-next'),
    homeNewReleasesSection: $('home-new-releases-section'),
    homeNewReleasesHeader: $('home-new-releases-header'),
    homeNewReleases: $('home-new-releases-row'),
    homeNewReleasesPrev: $('home-new-releases-prev'),
    homeNewReleasesNext: $('home-new-releases-next'),
    homeMixesSection: $('home-mixes-section'),
    homeMixesHeader: $('home-mixes-header'),
    homeMixes: $('home-mixes-row'),
    homeMixesPrev: $('home-mixes-prev'),
    homeMixesNext: $('home-mixes-next'),
    homeExtraSection: $('home-extra-section'),
    homeExtraHeader: $('home-extra-header'),
    homeExtra: $('home-extra-row'),
    homeExtraPrev: $('home-extra-prev'),
    homeExtraNext: $('home-extra-next'),
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
    scheduleEmbedScrollReset()
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
  const homeRailBindings = new WeakMap()
  const homeRecommendationsInflight = new Map()
  const homePersonalReleaseInflight = new Map()
  const runtimeGetCache = new Map()
  const runtimeGetInflight = new Map()
  const HOME_DEFAULT_MODE = hasSessionToken() ? 'for-you' : 'trends'
  const HOME_RECOMMENDATIONS_LIMIT = 20
  const HOME_NEW_RELEASES_LIMIT = 36
  const MY_WAVE_RECOMMENDATIONS_LIMIT = 80
  const WAVE_SETTING_VALUES = {
    character: new Set(['any', 'favorite', 'unfamiliar', 'popular']),
    mood: new Set(['any', 'energetic', 'happy', 'calm', 'sad']),
    activity: new Set(['any', 'sleep', 'road', 'work', 'training']),
    language: new Set(['any', 'ru', 'foreign', 'instrumental']),
  }
  const HOME_RAIL_REGISTRY = [
    { slot: 'home-quick-access', rowKey: 'homeQuickAccess', prevKey: 'homeQuickAccessPrev', nextKey: 'homeQuickAccessNext' },
    { slot: 'home-favorite-artists', rowKey: 'homeFavoriteArtists', prevKey: 'homeFavoriteArtistsPrev', nextKey: 'homeFavoriteArtistsNext' },
    { slot: 'home-popular-artists', rowKey: 'homePopularArtists', prevKey: 'homePopularArtistsPrev', nextKey: 'homePopularArtistsNext' },
    { slot: 'home-top-tracks', rowKey: 'homeTopTracks', prevKey: 'homeTopTracksPrev', nextKey: 'homeTopTracksNext' },
    { slot: 'home-new-releases', rowKey: 'homeNewReleases', prevKey: 'homeNewReleasesPrev', nextKey: 'homeNewReleasesNext' },
    { slot: 'home-mixes', rowKey: 'homeMixes', prevKey: 'homeMixesPrev', nextKey: 'homeMixesNext' },
    { slot: 'home-extra', rowKey: 'homeExtra', prevKey: 'homeExtraPrev', nextKey: 'homeExtraNext' },
  ]
  const homeUiFxState = {
    revealBound: false,
    modeFxTimer: null,
    filterSwipeTimer: null,
  }
  const HOME_RAIL_SCROLL_AMOUNT = 500
  const ARTIST_STATS_CACHE_TTL_MS = 15 * 60 * 1000
  const artistStatsCache = new Map()
  const artistStatsInflight = new Map()
  let artistMonthlyHydrationTimer = 0
  const MONTHLY_LISTENERS_FORMATTER = new Intl.NumberFormat('ru-RU')
  const RELEASE_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const RELEASE_DATE_PREMIUM_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

  const esc = (s) => String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  const fmt = (n) => `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, '0')}`
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
  const fastHash = (text) => {
    let hash = 2166136261
    const source = String(text || '')
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0).toString(36)
  }
  // Native wheel/touch scrolling avoids competing 520ms scroll tweens.
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
    },
    {
      key: 'electronic',
      match: ['electronic', 'house', 'techno', 'edm', 'garage'],
      accent: '#a8a8a8',
      rgb: '168,168,168',
      soft: 'rgba(168,168,168,0.16)',
      muted: 'rgba(168,168,168,0.07)',
      tone: 'Ð Ð¾Ñ‡Ð½Ð¾Ð¹ Ñ‚Ð¾Ðº',
    },
  ]
  const MY_WAVE_FALLBACK_ACCENT = {
    key: 'fallback',
    accent: '#d6d6d6',
    rgb: '214,214,214',
    soft: 'rgba(214,214,214,0.16)',
    muted: 'rgba(214,214,214,0.07)',
    tone: 'Ð¢ÐµÐ¿Ð»Ñ‹Ð¹ Ñ Ñ„Ð¸Ñ€',
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

  function setHomeWaveActive(active) {
    if (page !== 'home' || !document.body) {
      return
    }

    const next = Boolean(active)
    if (el.hero) {
      el.hero.classList.toggle('is-active', next)
      el.hero.setAttribute('aria-pressed', next ? 'true' : 'false')
      el.hero.setAttribute('aria-label', next ? 'Приостановить мою волну' : 'Слушать мою волну')
      const listenLabel = el.hero.querySelector('.home-listen-label')
      if (listenLabel) listenLabel.textContent = next ? 'Пауза' : 'Моя волна'
    }
  }

  function renderHomeWaveCovers({ musicTracks = [], allowCatalogFallback = false } = {}) {
    if (!el.homeWaveCovers) {
      return
    }

    const candidateTracks = [
      ...getMyWaveTracks(),
      ...filterDislikedTracks(state.likedTracks),
      ...(allowCatalogFallback ? filterDislikedTracks(musicTracks) : []),
    ]
    const seenCoverUrls = new Set()
    const coverUrls = []

    for (const track of candidateTracks) {
      const coverUrl = String(track?.coverUrl || '').trim()
      if (!coverUrl || seenCoverUrls.has(coverUrl)) {
        continue
      }

      seenCoverUrls.add(coverUrl)
      coverUrls.push(coverUrl)
      if (coverUrls.length >= 3) {
        break
      }
    }

    const markup = coverUrls.length
      ? coverUrls.map((coverUrl) => (
        `<span class="home-wave-cover"><img src="${esc(optimizedCoverUrl(coverUrl, 400))}" alt=""></span>`
      )).join('')
      : '<span class="home-wave-cover home-wave-cover-empty" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13M9 9l12-2"></path><ellipse cx="6" cy="18" rx="3" ry="3"></ellipse><ellipse cx="18" cy="16" rx="3" ry="3"></ellipse></svg></span>'

    if (el.homeWaveCovers.dataset.waveeRenderedMarkup === markup) {
      return
    }

    el.homeWaveCovers.innerHTML = markup
    el.homeWaveCovers.dataset.waveeRenderedMarkup = markup
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
    if (reason === 'artist-match' || reason === 'artist-taste-hit') return 'По любимым артистам'
    if (reason === 'genre-match') return 'По твоим жанрам'
    if (reason === 'personal-favorite-hit') return 'Из твоих лайков'
    if (reason === 'fresh-release') return 'Свежий релиз'
    if (reason === 'vector-exploration') return 'Новое для тебя'
    return 'Собрано для тебя'
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

  function isTrackDisliked(track) {
    return Boolean(track?.id) && state.dislikes.has(stripRecoPrefix(track.id))
  }

  function filterDislikedTracks(items) {
    return dedupeTracks((Array.isArray(items) ? items : []).filter((track) => track?.id && !isTrackDisliked(track)))
  }

  function filterDislikedWaveItems(items) {
    return (Array.isArray(items) ? items : []).filter((item) => item?.track?.id && !isTrackDisliked(item.track))
  }

  function optimizedCoverUrl(source, size = 400) {
    const rawUrl = String(source || '').trim()
    if (!rawUrl) return ''
    try {
      const url = new URL(rawUrl, window.location.origin)
      if (!/(^|\.)avatars(?:\.mds)?\.yandex\.(?:net|ru)$/i.test(url.hostname)) return rawUrl
      if (!/\/\d+x\d+\/?$/.test(url.pathname)) return rawUrl
      const steps = [100, 200, 300, 400, 600, 800, 1000]
      const target = steps.find((step) => step >= size) || 1000
      url.pathname = url.pathname.replace(/\/\d+x\d+\/?$/, `/${target}x${target}`)
      return url.toString()
    } catch {
      return rawUrl
    }
  }

  const HOME_CHART_REASONS = new Set(['chart-best', 'chart-popular', 'recent-release', 'genre-mix'])

  function isPersonalHomeRecommendationEntry(item) {
    return Boolean(item?.track?.id) && !HOME_CHART_REASONS.has(String(item?.reason || ''))
  }

  function getPersonalTracksFromRecommendationBlock(items) {
    return getTracksFromRecommendationBlock((Array.isArray(items) ? items : []).filter(isPersonalHomeRecommendationEntry))
  }

  function getMyWaveTracks() {
    return filterDislikedTracks(state.myWave.map((item) => item?.track).filter((track) => track?.id))
  }

  function getAllHomeRecommendationTracks(mode = 'all') {
    const sourceEntries = mode === 'all'
      ? Object.values(state.homeRecommendationsByMode || {})
      : [state.homeRecommendationsByMode?.[mode]]
    const buckets = sourceEntries.map((entry) => entry?.blocks || null).filter(Boolean)

    const tracks = []
    for (const blocks of buckets) {
      for (const [key, items] of Object.entries(blocks)) {
        const shouldFilterCharts = mode === 'for-you'
          && ['bestTracks', 'mixes', 'newReleases', 'genresAndMoods'].includes(key)
        tracks.push(...(shouldFilterCharts
          ? getPersonalTracksFromRecommendationBlock(items)
          : getTracksFromRecommendationBlock(items)))
      }
    }

    return filterDislikedTracks(tracks)
  }

  function getMixEntries() {
    if (state.myWave.length) {
      return filterDislikedWaveItems(state.myWave)
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
          subtitle: formatArtistNames(track, 'Wavee selection'),
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

  function getHomeTrackPool(mode = 'all') {
    const playlistTracks = state.playlists.flatMap((playlist) => (
      Array.isArray(playlist?.tracks) ? playlist.tracks : []
    ))
    const recommendationTracks = getAllHomeRecommendationTracks(mode)

    if (mode === 'for-you') {
      return filterDislikedTracks([
        ...getMyWaveTracks(),
        ...recommendationTracks,
        ...state.likedTracks,
        ...playlistTracks,
        ...state.tracks,
      ])
    }

    return filterDislikedTracks([
      ...getMyWaveTracks(),
      ...recommendationTracks,
      ...state.tracks,
      ...playlistTracks,
    ])
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
    const prefixedMatch = source.match(/^(?:ym-artist-|yandex-artist:)(\d+)$/i)
    if (prefixedMatch) return prefixedMatch[1]
    if (/^\d+$/.test(source)) return source
    return ''
  }

  function formatMonthlyListeners(value) {
    const monthly = toPositiveFiniteNumber(value)
    if (!monthly) {
      return '—'
    }
    return MONTHLY_LISTENERS_FORMATTER.format(monthly)
  }

  function getArtistMetaLine(artist) {
    return formatMonthlyListeners(artist?.lastMonthListeners)
  }

  function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime())
  }

  function resolveTrackReleaseLabel(track = {}) {
    const candidates = [
      track?.releasedAt,
      track?.releaseDate,
      track?.released_at,
      track?.release_date,
      track?.publishedAt,
      track?.publishDate,
      track?.createdAt,
      track?.uploadedAt,
      track?.releaseYear,
      track?.year,
      track?.album?.releasedAt,
      track?.album?.releaseDate,
      track?.album?.released_at,
      track?.album?.release_date,
      track?.album?.year,
    ]

    const format = (date) => {
      if (!isValidDate(date)) return 'Дата не указана'
      const now = new Date()
      // Сбрасываем часы для точного сравнения дней
      const dayStart = (d) => new Date(d).setHours(0, 0, 0, 0)
      const diffDays = Math.floor((dayStart(now) - dayStart(date)) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Сегодня'
      if (diffDays === 1) return 'Вчера'
      
      const isSameYear = date.getFullYear() === now.getFullYear()
      if (isSameYear) return RELEASE_DATE_PREMIUM_FORMATTER.format(date)
      
      return RELEASE_DATE_FORMATTER.format(date)
    }

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === '') continue

      if (typeof candidate === 'string') {
        const trimmed = candidate.trim()
        if (/^(19|20)\d{2}$/.test(trimmed)) return trimmed
        const parsed = new Date(trimmed)
        if (isValidDate(parsed)) return format(parsed)
        continue
      }

      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        if (candidate >= 1900 && candidate <= 2100) return String(Math.trunc(candidate))
        const timestamp = candidate > 1e12 ? candidate : (candidate > 1e9 ? candidate * 1000 : 0)
        if (timestamp) {
          const parsed = new Date(timestamp)
          if (isValidDate(parsed)) return format(parsed)
        }
        continue
      }

      if (candidate instanceof Date && isValidDate(candidate)) {
        return format(candidate)
      }
    }

    return 'Дата не указана'
  }

  function resolveHomeReleaseLabel(track = {}) {
    const directLabel = resolveTrackReleaseLabel(track)
    if ((directLabel === 'Сегодня' || directLabel === 'Вчера') && track?.sourceType === 'catalog') {
      const year = track?.album?.year || track?.year || track?.releaseYear || null
      if (year) {
        return String(year)
      }
      return 'Новый релиз'
    }
    return directLabel
  }

  function resolveArtistMonthlyListeners(entry = {}) {
    const candidates = [
      entry?.artist?.lastMonthListeners,
      entry?.artist?.stats?.lastMonthListeners,
      entry?.artist?.stats?.last_month_listeners,
      entry?.artist?.stats?.monthlyListeners,
      entry?.artist?.counts?.listeners,
    ]

    for (const candidate of candidates) {
      const explicit = toPositiveFiniteNumber(candidate)
      if (explicit) return Math.round(explicit)
    }

    return null
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

  async function fetchArtistCatalog({ artistId = '', artistName = '' } = {}) {
    const normalizedArtistId = extractCatalogArtistId(artistId)
    const normalizedArtistName = normalizeArtistLookupName(artistName)
    if (!normalizedArtistId && !normalizedArtistName) {
      return null
    }

    const path = normalizedArtistId
      ? `/catalog/artist?artistId=${encodeURIComponent(normalizedArtistId)}&limit=4`
      : `/catalog/artist?name=${encodeURIComponent(artistName)}&limit=4`

    return api(path, { auth: 'optional' }).catch(() => null)
  }

  async function fetchAlbumCatalogById(albumId = '') {
    const normalizedAlbumId = String(albumId || '').trim()
    if (!normalizedAlbumId) {
      return null
    }
    return api(`/catalog/album?albumId=${encodeURIComponent(normalizedAlbumId)}&limit=4`, { auth: 'optional' }).catch(() => null)
  }

  async function hydrateMissingHomeNewReleases(payload, mode) {
    if (mode !== 'for-you' || !payload?.blocks) {
      return payload
    }

    const existingEntries = Array.isArray(payload.blocks?.newReleases) ? payload.blocks.newReleases : []
    if (state.hostSynced && existingEntries.some((entry) => entry?.track?.id)) {
      return payload
    }

    const favoriteArtists = Array.isArray(payload.blocks?.favoriteArtists)
      ? payload.blocks.favoriteArtists
      : []
    if (!favoriteArtists.length) {
      return payload
    }

    const cacheKey = `${mode}:${favoriteArtists.map((entry) => entry?.artist?.id || entry?.artist?.name || '').join('|')}`
    const pending = homePersonalReleaseInflight.get(cacheKey)
    if (pending) {
      return pending
    }

    const request = (async () => {
      const targetArtists = favoriteArtists.slice(0, 24)
      const catalogs = await Promise.all(
        targetArtists.map((entry) => fetchArtistCatalog({
          artistId: entry?.artist?.id,
          artistName: entry?.artist?.name,
        })),
      )

      const now = Date.now()
      const parseTs = (value) => {
        if (!value) return 0
        if (typeof value === 'number' && Number.isFinite(value)) return value > 1e12 ? value : value * 1000
        const ts = Date.parse(String(value).trim())
        return Number.isFinite(ts) ? ts : 0
      }
      const isFreshReleaseTs = (ts) => ts > 0 && ts <= now + (7 * 24 * 60 * 60 * 1000) && (now - ts) <= HOME_NEW_RELEASE_MAX_AGE_MS

      const artistRankMap = new Map()
      targetArtists.forEach((entry, index) => {
        const key = String(entry?.artist?.name || entry?.artist?.id || '').trim().toLowerCase()
        if (key && !artistRankMap.has(key)) {
          artistRankMap.set(key, targetArtists.length - index)
        }
      })

      const releaseTracks = []
      const seenAlbumIds = new Set()
      for (let idx = 0; idx < catalogs.length; idx += 1) {
        const catalog = catalogs[idx]
        if (!catalog) continue
        const albumCandidates = [
          catalog?.newestRelease,
          ...(Array.isArray(catalog?.albums) ? catalog.albums : []),
        ].filter((album, index, arr) => {
          if (!album?.id) return false
          return arr.findIndex((item) => item?.id === album.id) === index
        })

        let collectedForArtist = 0
        for (const candidateAlbum of albumCandidates) {
          if (collectedForArtist >= 3) break
          if (seenAlbumIds.has(candidateAlbum.id)) continue
          const albumTs = parseTs(candidateAlbum?.releaseDate)
          if (!isFreshReleaseTs(albumTs)) continue
          seenAlbumIds.add(candidateAlbum.id)

          const albumCatalog = await fetchAlbumCatalogById(candidateAlbum.id)
          const track = (Array.isArray(albumCatalog?.tracks) ? albumCatalog.tracks[0] : null)
            || (Array.isArray(catalog?.tracks)
              ? (catalog.tracks.find((item) => item?.album?.id === candidateAlbum.id) || null)
              : null)
          if (!track?.id) continue

          const releaseDate = candidateAlbum?.releaseDate || track?.releasedAt || track?.createdAt || null
          if (!isFreshReleaseTs(parseTs(releaseDate))) continue

          collectedForArtist += 1
          releaseTracks.push({
            ...track,
            releasedAt: releaseDate,
            createdAt: releaseDate,
            album: track?.album
              ? {
                  ...track.album,
                  releaseDate: releaseDate || track.album?.releaseDate || null,
                }
              : track?.album,
          })
        }
      }

      if (!releaseTracks.length) {
        return payload
      }

      const dayMs = 24 * 60 * 60 * 1000
      const maxArtistRank = Math.max(1, targetArtists.length)
      const getEffectiveTs = (track) => {
        const ts = parseTs(track?.releasedAt || track?.createdAt)
        const rank = artistRankMap.get(String(track?.artist?.name || track?.artist?.id || '').trim().toLowerCase()) || 0
        const boostDays = rank > 0 ? (1.5 + (rank / maxArtistRank) * 7.5) : 0
        return ts + (boostDays * dayMs)
      }

      const hydratedEntries = releaseTracks
        .sort((left, right) => {
          const rightEff = getEffectiveTs(right)
          const leftEff = getEffectiveTs(left)
          if (rightEff !== leftEff) return rightEff - leftEff
          const rightTs = parseTs(right?.releasedAt || right?.createdAt)
          const leftTs = parseTs(left?.releasedAt || left?.createdAt)
          return rightTs - leftTs
        })
        .map((track, index) => ({
          id: `reco-${track.id}`,
          score: Number((2 - (index * 0.04)).toFixed(6)),
          reason: 'favorite-artist-latest',
          track,
        }))

      const seenTrackIds = new Set(hydratedEntries.map((entry) => stripRecoPrefix(entry?.track?.id)))
      const mergedEntries = [
        ...hydratedEntries,
        ...existingEntries.filter((entry) => {
          const track = entry?.track
          const id = stripRecoPrefix(track?.id)
          if (!id || seenTrackIds.has(id)) return false
          const ts = parseTs(track?.releasedAt || track?.releaseDate || track?.yandex?.releaseDate || track?.album?.releaseDate || track?.createdAt)
          if (!isFreshReleaseTs(ts)) return false
          seenTrackIds.add(id)
          return true
        }),
      ].slice(0, HOME_NEW_RELEASES_LIMIT)

      return {
        ...payload,
        blocks: {
          ...payload.blocks,
          newReleases: mergedEntries,
        },
      }
    })().finally(() => {
      homePersonalReleaseInflight.delete(cacheKey)
    })

    homePersonalReleaseInflight.set(cacheKey, request)
    return request
  }

  async function hydrateHomeArtistMonthlyListeners() {
    const rows = [...document.querySelectorAll('[data-artist-monthly]')]
    if (!rows.length) return

    await Promise.all(rows.slice(0, HOME_ARTIST_MONTHLY_HYDRATION_LIMIT).map(async (row) => {
      const artistId = row.getAttribute('data-artist-id') || ''
      const artistName = row.getAttribute('data-artist-name') || ''
      const artist = await fetchArtistStats({ artistId, artistName })
      if (!row.isConnected || !artist) return
      const resolvedMonthly = resolveArtistMonthlyListeners({ artist })
      if (resolvedMonthly) {
        row.textContent = formatMonthlyListeners(resolvedMonthly)
      }
      if (artist.coverUrl) {
        const card = row.closest('.home-artist-card')
        const coverShell = card?.querySelector('.home-artist-cover-shell')
        if (coverShell && coverShell.querySelector('.home-artist-cover-fallback')) {
          coverShell.innerHTML = `<img src="${esc(optimizedCoverUrl(artist.coverUrl, 300))}" alt="" aria-label="${esc(artistName || artist.name || '')}" class="home-lazy-cover" loading="lazy" decoding="async">`
          wireHomeLazyCoverFx(coverShell)
        }
      }
    }))
  }

  function scheduleHydrateHomeArtistMonthlyListeners() {
    if (artistMonthlyHydrationTimer) {
      return
    }

    const trigger = () => {
      artistMonthlyHydrationTimer = 0
      void hydrateHomeArtistMonthlyListeners()
    }

    const cancel = runDeferred(trigger, 900)
    artistMonthlyHydrationTimer = 1
    return () => {
      if (!artistMonthlyHydrationTimer) {
        return
      }
      artistMonthlyHydrationTimer = 0
      cancel?.()
    }
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

  function readCachedTracks({ allowStale = true } = {}) {
    try {
      const raw = localStorage.getItem(TRACKS_CACHE_KEY)
      if (!raw) return []
      const payload = JSON.parse(raw)
      if (!payload || !Array.isArray(payload.items)) return []
      const age = Date.now() - Number(payload.at || 0)
      const items = normalizeTrackItems(payload.items)
      if (age <= TRACKS_CACHE_TTL_MS) return items
      if (allowStale && age <= TRACKS_CACHE_STALE_TTL_MS) return items
      return []
    } catch {
      return []
    }
  }

  function writeCachedTracks(items) {
    try {
      localStorage.setItem(TRACKS_CACHE_KEY, JSON.stringify({ at: Date.now(), items: normalizeTrackItems(items) }))
    } catch {
      // ignore cache write errors
    }
  }

  function normalizeTrackItems(items) {
    if (!Array.isArray(items)) return []
    return dedupeTracks(items
      .map((item) => (item?.track?.id ? item.track : item))
      .filter((track) => track?.id))
  }

  function getUserCacheScope() {
    try {
      const raw = localStorage.getItem('wavee_user')
      if (!raw) return 'guest'
      const user = JSON.parse(raw)
      const id = String(user?.id || user?.email || '').trim().toLowerCase()
      return id || 'guest'
    } catch {
      return 'guest'
    }
  }

  function getHomeRecoCacheKey(mode, tokenPresent) {
    const scope = tokenPresent ? getUserCacheScope() : 'guest'
    return `${HOME_RECO_CACHE_KEY_PREFIX}:${scope}:${mode}`
  }

  function getMyWaveCacheKey() {
    return `${MY_WAVE_CACHE_KEY_PREFIX}:${getUserCacheScope()}`
  }

  function readCachedHomeRecommendations(mode, tokenPresent) {
    try {
      const key = getHomeRecoCacheKey(mode, tokenPresent)
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const payload = JSON.parse(raw)
      if (!payload || typeof payload !== 'object') return null
      if (!payload.data || typeof payload.data !== 'object') return null
      if (tokenPresent && mode === 'for-you' && !hasPersonalHomeRecommendationContent(payload.data.blocks)) return null
      const cachedAt = Number(payload.cachedAt || 0)
      if (!Number.isFinite(cachedAt) || cachedAt <= 0) return null
      if (Date.now() - cachedAt > HOME_RECO_STALE_TTL_MS) return null
      return {
        ...payload.data,
        __cachedAt: cachedAt,
      }
    } catch {
      return null
    }
  }

  function writeCachedHomeRecommendations(mode, tokenPresent, data) {
    if (!data?.blocks) return
    if (tokenPresent && mode === 'for-you' && !hasPersonalHomeRecommendationContent(data.blocks)) return
    try {
      const key = getHomeRecoCacheKey(mode, tokenPresent)
      localStorage.setItem(key, JSON.stringify({
        cachedAt: Date.now(),
        data,
      }))
    } catch {
      // ignore cache write errors
    }
  }

  function readCachedMyWaveRecommendations() {
    try {
      const raw = localStorage.getItem(getMyWaveCacheKey())
      if (!raw) return null
      const payload = JSON.parse(raw)
      if (!payload || typeof payload !== 'object') return null
      if (!Array.isArray(payload.items) || !payload.items.length) return null
      const cachedAt = Number(payload.cachedAt || 0)
      if (!Number.isFinite(cachedAt) || cachedAt <= 0) return null
      if (Date.now() - cachedAt > HOME_RECO_STALE_TTL_MS) return null
      return {
        items: payload.items,
        settings: payload.settings || null,
        __cachedAt: cachedAt,
      }
    } catch {
      return null
    }
  }

  function writeCachedMyWaveRecommendations(payload) {
    if (!Array.isArray(payload?.items) || !payload.items.length) return
    try {
      localStorage.setItem(getMyWaveCacheKey(), JSON.stringify({
        cachedAt: Date.now(),
        items: payload.items,
        settings: payload.settings || state.myWaveSettings,
      }))
    } catch {
      // ignore cache write errors
    }
  }

  function readPlaybackSourceCache() {
    try {
      const raw = localStorage.getItem(PLAYBACK_SOURCE_CACHE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  function readCachedPlaybackSource(trackId) {
    const id = String(trackId ?? '').trim()
    if (!id) return null
    const cache = readPlaybackSourceCache()
    const entry = cache[id]
    if (!entry?.track || !entry.cachedAt) return null
    if ((Date.now() - Number(entry.cachedAt)) > PLAYBACK_SOURCE_CACHE_TTL_MS) return null
    return entry.track
  }

  function writeCachedPlaybackSource(track) {
    if (!track?.id || !hasDirectPlayback(track)) return
    try {
      const cache = readPlaybackSourceCache()
      cache[track.id] = {
        cachedAt: Date.now(),
        track,
      }
      const entries = Object.entries(cache)
        .filter(([, entry]) => entry?.track && (Date.now() - Number(entry.cachedAt || 0)) <= PLAYBACK_SOURCE_CACHE_TTL_MS)
        .sort((left, right) => Number(right[1].cachedAt || 0) - Number(left[1].cachedAt || 0))
        .slice(0, 80)
      localStorage.setItem(PLAYBACK_SOURCE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      // ignore cache write errors
    }
  }

  function hydrateHomeRecommendationsFromCache() {
    const tokenPresent = hasSessionToken()
    const modes = tokenPresent ? ['for-you', 'trends'] : ['trends']
    let hydrated = false

    modes.forEach((mode) => {
      const cached = readCachedHomeRecommendations(mode, tokenPresent)
      if (!cached?.blocks) return
      state.homeRecommendationsByMode[mode] = cached
      hydrated = true
    })

    return hydrated
  }

  function hydrateMyWaveRecommendationsFromCache() {
    if (!hasSessionToken()) return false
    const cached = readCachedMyWaveRecommendations()
    if (!cached?.items?.length) return false
    state.myWave = filterDislikedWaveItems(cached.items)
    if (cached.settings) {
      state.myWaveSettings = normalizeWaveSettings(cached.settings)
    }
    return state.myWave.length > 0
  }

  function resolveRuntimeGetCacheTtl(path = '') {
    const normalized = String(path || '')
    if (normalized.startsWith('/catalog/artist?') || normalized.startsWith('/catalog/album?')) {
      return 10 * 60 * 1000
    }
    if (normalized.startsWith('/catalog/feed')) {
      return 2 * 60 * 1000
    }
    if (normalized.startsWith('/tracks?')) {
      return 2 * 60 * 1000
    }
    if (normalized.startsWith('/recommendations/home')) {
      return 30 * 1000
    }
    if (normalized.startsWith('/recommendations/my-wave')) {
      return 20 * 1000
    }
    if (normalized.startsWith('/library/likes') || normalized.startsWith('/library/dislikes')) {
      return 20 * 1000
    }
    if (normalized.includes('/playback-source')) {
      return 10 * 60 * 1000
    }
    return API_GET_CACHE_DEFAULT_TTL_MS
  }

  function getRuntimeRequestScope() {
    return hasSessionToken() ? getUserCacheScope() : 'guest'
  }

  function getRuntimeGetCacheKey(path = '', authMode = 'none') {
    return `${getRuntimeRequestScope()}:${authMode}:${String(path || '')}`
  }

  function createEmptyHomeRecommendations(mode = HOME_DEFAULT_MODE) {
    return {
      mode,
      generatedAt: new Date().toISOString(),
      blocks: {
        newReleases: [],
        favoriteArtists: [],
        popularArtists: [],
        bestTracks: [],
        mixes: [],
        genresAndMoods: [],
      },
      source: 'empty-fallback',
    }
  }

  function clearAuthSession({ switchHomeToTrends = true } = {}) {
    state.authInvalid = true
    localStorage.removeItem(TOKEN)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem('wavee_user')
    state.homeRecommendationsByMode['for-you'] = null
    state.homeRecommendationsLoadingByMode['for-you'] = false
    if (switchHomeToTrends && page === 'home' && el.homeFilterChips) {
      el.homeFilterChips.dataset.active = 'trends'
    }
  }

  function readRuntimeGetCache(path = '', authMode = 'none') {
    const key = getRuntimeGetCacheKey(path, authMode)
    const cached = runtimeGetCache.get(key)
    if (!cached) return null
    if (cached.expiresAt <= Date.now()) {
      runtimeGetCache.delete(key)
      return null
    }
    return cached.value
  }

  function writeRuntimeGetCache(path = '', authMode = 'none', value) {
    const key = getRuntimeGetCacheKey(path, authMode)
    runtimeGetCache.set(key, {
      value,
      expiresAt: Date.now() + resolveRuntimeGetCacheTtl(path),
    })
  }

  async function refreshToken() {
    const rt = localStorage.getItem(REFRESH) || ''
    if (!rt) return ''
    const r = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) })
    if (!r.ok) {
      if (r.status === 401) {
        clearAuthSession()
      }
      return ''
    }
    const p = await r.json().catch(() => ({}))
    if (p.accessToken) {
      state.authInvalid = false
      localStorage.setItem(TOKEN, p.accessToken)
    }
    if (p.refreshToken) localStorage.setItem(REFRESH, p.refreshToken)
    if (p.user) localStorage.setItem('wavee_user', JSON.stringify(p.user))
    return p.accessToken || ''
  }

  async function publicApi(path, { method = 'GET', body, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const normalizedMethod = String(method || 'GET').toUpperCase()
    const cacheable = normalizedMethod === 'GET' && !body && !signal
    if (cacheable) {
      const cached = readRuntimeGetCache(path, 'public')
      if (cached !== null) {
        return cached
      }
      const inflightKey = `public:${getRuntimeGetCacheKey(path, 'public')}`
      const pending = runtimeGetInflight.get(inflightKey)
      if (pending) {
        return pending
      }
    }

    const headers = { 'Content-Type': 'application/json' }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const abortFromParent = () => controller.abort()
    if (signal) {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', abortFromParent, { once: true })
      }
    }

    const run = async () => {
      let r
      try {
        r = await fetch(`${apiBase}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw Object.assign(new Error(`Request timeout after ${timeoutMs}ms`), { status: 504 })
        }
        throw error
      } finally {
        clearTimeout(timer)
        if (signal) {
          signal.removeEventListener('abort', abortFromParent)
        }
      }

      if (r.status === 204) return null
      const p = await r.json().catch(() => ({}))
      if (!r.ok) throw Object.assign(new Error(p.error || `HTTP ${r.status}`), { status: r.status })
      if (cacheable) {
        writeRuntimeGetCache(path, 'public', p)
      }
      return p
    }

    if (!cacheable) {
      return run()
    }

    const inflightKey = `public:${getRuntimeGetCacheKey(path, 'public')}`
    const request = run().finally(() => {
      runtimeGetInflight.delete(inflightKey)
    })
    runtimeGetInflight.set(inflightKey, request)
    return request
  }

  async function api(path, { method = 'GET', body, auth = 'none', retry = true, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const normalizedMethod = String(method || 'GET').toUpperCase()
    const authMode = auth === 'required' ? 'required' : (auth === 'optional' ? 'optional' : 'none')
    const cacheable = normalizedMethod === 'GET' && !body && !signal && !retry
    if (cacheable) {
      const cached = readRuntimeGetCache(path, authMode)
      if (cached !== null) {
        return cached
      }
      const inflightKey = `${authMode}:${getRuntimeGetCacheKey(path, authMode)}`
      const pending = runtimeGetInflight.get(inflightKey)
      if (pending) {
        return pending
      }
    }

    let token = (auth === 'required' || auth === 'optional') ? (localStorage.getItem(TOKEN) || '') : ''
    if ((auth === 'required' || auth === 'optional') && !token && retry) {
      token = await refreshToken()
    }
    if (auth === 'required' && !token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const abortFromParent = () => controller.abort()
    if (signal) {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', abortFromParent, { once: true })
      }
    }

    const run = async () => {
      let r
      try {
        r = await fetch(`${apiBase}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw Object.assign(new Error(`Request timeout after ${timeoutMs}ms`), { status: 504 })
        }
        throw error
      } finally {
        clearTimeout(timer)
        if (signal) {
          signal.removeEventListener('abort', abortFromParent)
        }
      }

      if (r.status === 204) return null
      if (r.status === 401 && auth !== 'none' && retry) {
        const t = await refreshToken()
        if (t) return api(path, { method, body, auth, retry: false, signal, timeoutMs })
        clearAuthSession()
        if (auth === 'optional') {
          return api(path, { method, body, auth: 'none', retry: false, signal, timeoutMs })
        }
      }
      const p = await r.json().catch(() => ({}))
      if (!r.ok) throw Object.assign(new Error(p.error || `HTTP ${r.status}`), { status: r.status })
      if (cacheable) {
        writeRuntimeGetCache(path, authMode, p)
      }
      return p
    }

    if (!cacheable) {
      return run()
    }

    const inflightKey = `${authMode}:${getRuntimeGetCacheKey(path, authMode)}`
    const request = run().finally(() => {
      runtimeGetInflight.delete(inflightKey)
    })
    runtimeGetInflight.set(inflightKey, request)
    return request
  }

  function hasSessionToken() {
    return !state.authInvalid && Boolean(localStorage.getItem(TOKEN))
  }

  function normalizeWaveSettings(settings = {}) {
    const next = { ...state.myWaveSettings, ...settings }
    const n = (val, set, def = null) => (val === null || val === undefined || val === '' || val === 'any' || set.has(val)) ? (val === 'any' || val === '' || val === undefined ? null : val) : def
    return {
      character: n(next.character, WAVE_SETTING_VALUES.character, 'favorite'),
      mood: n(next.mood, WAVE_SETTING_VALUES.mood, 'calm'),
      activity: n(next.activity, WAVE_SETTING_VALUES.activity, 'work'),
      language: n(next.language, WAVE_SETTING_VALUES.language, null),
    }
  }

  function buildMyWaveQuery(settings = state.myWaveSettings, limit = MY_WAVE_RECOMMENDATIONS_LIMIT) {
    const normalized = normalizeWaveSettings(settings)
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('character', normalized.character)
    params.set('mood', normalized.mood)
    params.set('activity', normalized.activity)
    if (normalized.language) params.set('language', normalized.language)
    return params.toString()
  }

  async function ingestEvents(events = []) {
    if (!hasSessionToken() || !Array.isArray(events) || events.length === 0) return
    await api('/events', {
      method: 'POST',
      auth: 'required',
      body: { events },
    }).catch(() => {})
  }

  function createPlaybackContext(track, contextType = 'manual') {
    return {
      artistId: track?.artist?.id ?? null,
      contextType,
      page,
      surface: embedMode ? 'embed' : 'standalone',
    }
  }

  function beginPlaybackSession(track, contextType = 'manual') {
    if (embedMode || !track?.id) {
      state.playbackSession = null
      return
    }

    const occurredAt = new Date().toISOString()
    state.playbackSession = {
      trackId: track.id,
      artistId: track.artist?.id ?? null,
      contextType,
      maxSeconds: 0,
      startedAt: occurredAt,
    }

    void ingestEvents([
      {
        entityType: 'track',
        entityId: track.id,
        eventType: 'play_start',
        eventValue: 0,
        occurredAt,
        context: createPlaybackContext(track, contextType),
      },
    ])
  }

  function touchPlaybackSession() {
    const session = state.playbackSession
    if (!session || !state.track || session.trackId !== state.track.id) {
      return
    }
    const current = Math.max(0, Math.floor(Number(state.t) || 0))
    if (current > session.maxSeconds) {
      session.maxSeconds = current
    }
  }

  function endPlaybackSession({ completed = false, contextType = 'playback' } = {}) {
    const session = state.playbackSession
    if (!session) return
    state.playbackSession = null

    if (embedMode) {
      return
    }

    const track = findTrack(session.trackId) || state.track
    if (!track?.id) {
      return
    }

    const duration = Math.max(0, Math.floor(Number(track.durationSec) || 0))
    const playedSeconds = Math.max(
      0,
      Math.floor(Number(state.t) || 0),
      Math.floor(Number(session.maxSeconds) || 0),
      completed ? duration : 0,
    )
    if (playedSeconds <= 0 && !completed) {
      return
    }

    const completeByRatio = duration > 0 && playedSeconds >= Math.max(30, Math.floor(duration * 0.85))
    const eventType = completed || completeByRatio ? 'play_complete' : 'skip'
    const occurredAt = new Date().toISOString()

    void ingestEvents([
      {
        entityType: 'track',
        entityId: track.id,
        eventType,
        eventValue: Math.min(32767, playedSeconds),
        occurredAt,
        context: createPlaybackContext(track, session.contextType || contextType),
      },
    ])
  }

  function syncMyWaveSettingChips() {
    const chips = [...document.querySelectorAll('[data-wave-setting][data-wave-value]')]
    if (!chips.length) return
    chips.forEach((chip) => {
      const key = chip.getAttribute('data-wave-setting')
      const rawValue = chip.getAttribute('data-wave-value')
      const value = rawValue === 'any' ? null : rawValue
      const active = Boolean(key && (state.myWaveSettings?.[key] ?? null) === value)
      chip.classList.toggle('is-accent', active)
      chip.setAttribute('aria-pressed', active ? 'true' : 'false')
    })
  }

  function buildLocalHomeRecommendations(mode = HOME_DEFAULT_MODE) {
    const effectiveMode = mode === 'trends' || !hasSessionToken() ? 'trends' : 'for-you'
    const waveTracks = getMyWaveTracks()
    const cleanLikes = filterDislikedTracks(state.likedTracks)
    const cleanCatalog = filterDislikedTracks(state.tracks)
    const trendingSorted = [...cleanCatalog].sort(
      (left, right) => Number(right?.playCount ?? 0) - Number(left?.playCount ?? 0),
    )

    const artistMap = new Map()
    const nameToKey = new Map()
    cleanLikes.forEach((track, index) => {
      const artist = track?.artist
      const name = String(artist?.name || '').trim()
      if (!name || !track?.id) return
      const normalized = name.toLowerCase()
      const rawKey = artist?.id ? `id:${artist.id}` : `name:${normalized}`
      const key = nameToKey.get(normalized) || rawKey
      if (!nameToKey.has(normalized)) nameToKey.set(normalized, key)
      const weight = 3 + Math.max(0, 1.2 - index * 0.015)
      const existing = artistMap.get(key)
      if (!existing) {
        artistMap.set(key, { artist: { ...artist, name }, track, score: weight })
      } else {
        existing.score += weight
        if (!existing.artist?.id && artist?.id) existing.artist = { ...existing.artist, ...artist }
        if (!existing.track?.coverUrl && track?.coverUrl) existing.track = track
      }
    })

    const favoriteArtists = effectiveMode === 'trends'
      ? []
      : [...artistMap.values()]
          .sort((left, right) => right.score - left.score)
          .slice(0, HOME_RECOMMENDATIONS_LIMIT)
          .map((entry) => ({
            artist: entry.artist,
            track: entry.track,
            score: Number(entry.score.toFixed(4)),
            reason: 'favorite-artist',
          }))

    const favoriteArtistNames = new Set(
      favoriteArtists.map((entry) => String(entry?.artist?.name || '').trim().toLowerCase()).filter(Boolean),
    )

    const popularArtists = getArtistEntries(trendingSorted)
      .slice(0, HOME_RECOMMENDATIONS_LIMIT)
      .map((entry) => ({
        artist: entry.artist,
        track: entry.track,
        score: Number(entry.track?.playCount ?? 0) || 1,
        reason: 'chart-popular',
      }))

    const now = Date.now()
    const getReleaseTs = (track) => {
      const candidates = [
        track?.releasedAt,
        track?.releaseDate,
        track?.yandex?.releaseDate,
        track?.album?.releasedAt,
        track?.album?.releaseDate,
        track?.createdAt,
      ]
      for (const candidate of candidates) {
        if (!candidate) continue
        if (typeof candidate === 'number') return candidate > 1e12 ? candidate : candidate * 1000
        const ts = Date.parse(String(candidate).trim())
        if (Number.isFinite(ts)) return ts
      }
      return 0
    }

    if (effectiveMode === 'for-you' && !cleanLikes.length && !waveTracks.length) {
      return {
        mode: effectiveMode,
        generatedAt: new Date().toISOString(),
        source: 'client-pending',
        blocks: {
          newReleases: [],
          favoriteArtists: [],
          popularArtists: [],
          bestTracks: [],
          mixes: [],
          genresAndMoods: [],
        },
      }
    }

    const releaseCandidates = effectiveMode === 'trends'
      ? cleanCatalog
      : filterDislikedTracks([...waveTracks, ...cleanLikes])
    const dayMs = 24 * 60 * 60 * 1000
    const maxArtistScore = Math.max(1, ...[...artistMap.values()].map((entry) => Number(entry?.score ?? 0)))
    const getEffectiveReleaseTs = (track) => {
      const ts = getReleaseTs(track)
      const key = String(track?.artist?.name || track?.artist?.id || '').trim().toLowerCase()
      const score = artistMap.get(`name:${key}`)?.score || (favoriteArtistNames.has(key) ? 3 : 0)
      const boostDays = score > 0 ? (1.5 + Math.min(1, score / maxArtistScore) * 7.5) : 0
      return ts + (boostDays * dayMs)
    }
    const freshReleasesSorted = [...releaseCandidates]
      .filter((track) => {
        const ts = getReleaseTs(track)
        return ts > 0 && ts <= now + (7 * 24 * 60 * 60 * 1000) && (now - ts) <= HOME_NEW_RELEASE_MAX_AGE_MS
      })
      .sort((left, right) => {
        const rightEff = getEffectiveReleaseTs(right)
        const leftEff = getEffectiveReleaseTs(left)
        if (rightEff !== leftEff) return rightEff - leftEff
        return getReleaseTs(right) - getReleaseTs(left)
      })

    const artistReleaseCounts = new Map()
    const newReleases = []
    for (const track of freshReleasesSorted) {
      const artistKey = String(track?.artist?.name || track?.artist?.id || '').trim().toLowerCase()
      const currentCount = artistReleaseCounts.get(artistKey) || 0
      if (artistKey && currentCount >= 3) continue
      if (artistKey) artistReleaseCounts.set(artistKey, currentCount + 1)
      newReleases.push({
        id: `reco-${track.id}`,
        score: Number((2 - newReleases.length * 0.04).toFixed(6)),
        reason: effectiveMode === 'trends' ? 'recent-release' : 'favorite-artist-latest',
        track,
      })
      if (newReleases.length >= HOME_NEW_RELEASES_LIMIT) break
    }
    const newReleaseIds = new Set(newReleases.map((entry) => stripRecoPrefix(entry.track.id)))

    const bestPool = (effectiveMode === 'trends'
      ? trendingSorted
      : filterDislikedTracks([...waveTracks, ...cleanLikes])
    ).filter((track) => !newReleaseIds.has(stripRecoPrefix(track.id)))

    const bestTracks = bestPool
      .slice(0, HOME_RECOMMENDATIONS_LIMIT)
      .map((track, index) => ({
        id: `reco-${track.id}`,
        score: Number((1 - index * 0.02).toFixed(6)),
        reason: effectiveMode === 'trends' ? 'chart-best' : (index < waveTracks.length ? 'vector-top' : 'personal-favorite-hit'),
        track,
      }))
    const bestTrackIds = new Set(bestTracks.map((entry) => stripRecoPrefix(entry.track.id)))

    const mixes = []
    if (effectiveMode === 'for-you') {
      const seenMixArtists = new Set()
      const mixSource = filterDislikedTracks([...waveTracks, ...cleanLikes])
      const pushMixTrack = (track, allowOverlap = false) => {
        if (!track?.id) return false
        const id = stripRecoPrefix(track.id)
        if (!allowOverlap && (newReleaseIds.has(id) || bestTrackIds.has(id))) return false
        const key = String(track?.artist?.name || track?.artist?.id || '').trim().toLowerCase()
        if (key && seenMixArtists.has(key)) return false
        if (key) seenMixArtists.add(key)
        const isFav = favoriteArtistNames.has(key)
        mixes.push({
          id: `mix-${track.id}`,
          title: `${titleCase(track.artist?.name || 'Wave')} микс`,
          subtitle: isFav ? 'Хиты и похожие треки' : 'Похоже на твоих любимых артистов',
          kicker: isFav ? 'THIS IS' : 'Для тебя',
          seed: `${track.id}:local-mix`,
          reason: isFav ? 'artist-mix' : 'discovery-mix',
          track,
        })
        return true
      }

      for (const track of mixSource) {
        pushMixTrack(track, false)
        if (mixes.length >= 16) break
      }
      if (mixes.length < 6) {
        for (const track of mixSource) {
          pushMixTrack(track, true)
          if (mixes.length >= 16) break
        }
      }
    }

    const genresSource = effectiveMode === 'trends'
      ? cleanCatalog
      : filterDislikedTracks([...waveTracks, ...cleanLikes])
    const genresAndMoods = genresSource.length ? getGenreMoodBuckets(genresSource) : []

    return {
      mode: effectiveMode,
      generatedAt: new Date().toISOString(),
      source: waveTracks.length || cleanLikes.length ? 'client-vector' : 'client-catalog',
      blocks: {
        newReleases,
        favoriteArtists,
        popularArtists,
        bestTracks,
        mixes,
        genresAndMoods,
      },
    }
  }

  async function fetchHomeRecommendationsMode(mode) {
    const tokenPresent = hasSessionToken()
    const effectiveMode = tokenPresent ? mode : 'trends'
    if (!(effectiveMode in state.homeRecommendationsByMode)) return null

    if (!tokenPresent && mode !== effectiveMode && el.homeFilterChips) {
      el.homeFilterChips.dataset.active = effectiveMode
    }

    const current = state.homeRecommendationsByMode[effectiveMode]
    const hasBlocks = current?.blocks && typeof current.blocks === 'object'
    if (state.hostSynced && hasBlocks) {
      return current
    }

    const activeRequest = homeRecommendationsInflight.get(effectiveMode)
    if (activeRequest) {
      return hasBlocks ? current : activeRequest
    }

    state.homeRecommendationsLoadingByMode[effectiveMode] = true
    const request = (async () => {
      const localPayload = buildLocalHomeRecommendations(effectiveMode)
      const hydratedPayload = await hydrateMissingHomeNewReleases(localPayload, effectiveMode).catch(() => localPayload)
      const enriched = { ...hydratedPayload, __cachedAt: Date.now() }
      if (!state.hostSynced || !state.homeRecommendationsByMode[effectiveMode]?.blocks) {
        state.homeRecommendationsByMode[effectiveMode] = enriched
      }
      writeCachedHomeRecommendations(effectiveMode, tokenPresent, hydratedPayload)
      return state.homeRecommendationsByMode[effectiveMode] || enriched
    })()
      .catch(() => {
        const fallback = readCachedHomeRecommendations(effectiveMode, tokenPresent)
        if (fallback?.blocks) {
          state.homeRecommendationsByMode[effectiveMode] = fallback
          return fallback
        }
        const empty = { ...createEmptyHomeRecommendations(effectiveMode), __cachedAt: Date.now() }
        state.homeRecommendationsByMode[effectiveMode] = empty
        return empty
      })
      .finally(() => {
        state.homeRecommendationsLoadingByMode[effectiveMode] = false
        homeRecommendationsInflight.delete(effectiveMode)
        if (page === 'home') renderHome()
      })

    homeRecommendationsInflight.set(effectiveMode, request)
    return hasBlocks ? current : request
  }

  async function loadMyWaveRecommendations({ rerender = true } = {}) {
    if (!hasSessionToken()) {
      state.myWave = []
      if (rerender) {
        if (page === 'my-wave') renderMyWave()
        if (page === 'home') renderHome()
      }
      return null
    }

    if (rerender) {
      if (page === 'my-wave') renderMyWave()
      if (page === 'home') renderHome()
    }
    return { items: state.myWave, settings: state.myWaveSettings }
  }

  async function refreshPersonalization({ rerender = true, force = false } = {}) {
    if (!hasSessionToken()) {
      state.likes = new Set()
      state.likedTracks = []
      state.dislikes = new Set()
      state.myWave = []
      if (rerender) {
        if (page === 'my-wave') renderMyWave()
        if (page === 'home') renderHome()
      }
      return null
    }

    if (state.hostSynced && state.likedTracks.length && !force) {
      return { items: state.myWave }
    }

    const now = Date.now()
    if (!force && personalizationRefreshState.inflight) {
      return personalizationRefreshState.inflight
    }
    if (!force && (now - personalizationRefreshState.lastAt) < HOME_PERSONALIZATION_REFRESH_TTL_MS) {
      return null
    }

    const request = (async () => {
      const [likes, dislikes] = await Promise.all([
        api('/library/likes?limit=1000', { auth: 'required' }).catch(() => null),
        api('/library/dislikes', { auth: 'required' }).catch(() => null),
      ])

      if (Array.isArray(likes?.items)) {
        state.likedTracks = likes.items.filter((track) => track?.id)
        state.likes = new Set(state.likedTracks.map((track) => stripRecoPrefix(track?.id)).filter(Boolean))
      }
      if (Array.isArray(dislikes?.items)) {
        state.dislikes = new Set(dislikes.items.map((id) => stripRecoPrefix(id)).filter(Boolean))
      }
      state.homePersonalLoading = false
      if (!state.hostSynced) {
        const localPayload = buildLocalHomeRecommendations(HOME_DEFAULT_MODE)
        const hydrated = await hydrateMissingHomeNewReleases(localPayload, HOME_DEFAULT_MODE).catch(() => localPayload)
        state.homeRecommendationsByMode[localPayload.mode] = { ...hydrated, __cachedAt: Date.now() }
      }
      personalizationRefreshState.lastAt = Date.now()
      syncMyWaveSettingChips()
      syncLikes()
      if (rerender) {
        if (page === 'my-wave') renderMyWave()
        if (page === 'home') renderHome()
      }
      return { items: state.myWave }
    })().finally(() => {
      personalizationRefreshState.inflight = null
    })

    personalizationRefreshState.inflight = request
    return request
  }

  function syncLikes() {
    document.querySelectorAll('[data-track-like-id]').forEach((b) => {
      const id = stripRecoPrefix(b.getAttribute('data-track-like-id'))
      b.textContent = state.likes.has(id) ? 'â™¥' : 'â™¡'
    })
    if (el.like) {
      const active = Boolean(state.track && state.likes.has(stripRecoPrefix(state.track.id)))
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
    markRows()
    syncLikes()
  }

  function setCurrent(track) {
    state.track = track
    if (el.title) el.title.textContent = track?.title || 'Untitled'
    if (el.artist) el.artist.textContent = track?.artist?.name || 'Unknown Artist'
    if (el.cover) el.cover.src = optimizedCoverUrl(track?.coverUrl, 200) || COVER_PLACEHOLDER
  }

  function findTrack(id) {
    const myWaveTracks = getMyWaveTracks()
    const recommendationTracks = getAllHomeRecommendationTracks()
    for (const arr of [state.list, myWaveTracks, recommendationTracks, state.likedTracks, state.tracks, ...state.playlists.map((p) => p.tracks || [])]) {
      const f = arr.find((t) => t.id === id)
      if (f && !isTrackDisliked(f)) return f
    }
    return null
  }

  function markRows() {
    document.querySelectorAll('[data-track-row-id]').forEach((row) => {
      const on = row.getAttribute('data-track-row-id') === state.track?.id
      row.classList.toggle('bg-white/10', on)
    })
    document.querySelectorAll('[data-carousel-card][data-track-id]').forEach((card) => {
      const active = stripRecoPrefix(card.dataset.trackId) === stripRecoPrefix(state.track?.id)
      const playing = active && state.playing
      card.classList.toggle('is-active', active)
      card.classList.toggle('is-playing', playing)
      if (active) card.setAttribute('aria-current', 'true')
      else card.removeAttribute('aria-current')
      const button = card.querySelector('.home-card-play, .home-artist-play')
      if (!button) return
      button.setAttribute('aria-pressed', String(playing))
      button.setAttribute('aria-label', playing
        ? `Поставить «${button.dataset.playbackTitle}» на паузу`
        : `Воспроизвести «${button.dataset.playbackTitle}»`)
    })
  }

  function stopYt() {
    if (yt.timer) clearInterval(yt.timer)
    yt.timer = null
    yt.player?.pauseVideo?.()
  }

  function getPlaybackListForPage() {
    if (page === 'my-wave') {
      const waveTracks = getMyWaveTracks()
      if (waveTracks.length) return dedupeTracks(waveTracks)
    }

    if (page === 'home') {
      const homeTracks = getHomeTrackPool()
      if (homeTracks.length) return homeTracks
    }

    return filterDislikedTracks(state.tracks)
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
    state.ctx = ctx
    setHomeWaveActive(ctx === 'my-wave')
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
    writeCachedPlaybackSource(resolved)
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
    const cached = readCachedPlaybackSource(track.id)
    if (cached?.id && hasDirectPlayback(cached)) {
      applyResolvedTrack(cached)
      return
    }

    const resolved = await api(`/tracks/${encodeURIComponent(track.id)}/playback-source`, {
      auth: 'optional',
      retry: false,
    }).catch(() => null)
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
      .slice(0, HOME_PLAYBACK_PREFETCH_LIMIT)

    if (!targets.length) {
      return
    }

    clearTimeout(playbackPrefetchState.timer)
    playbackPrefetchState.timer = setTimeout(() => {
      targets.forEach((track, index) => {
        setTimeout(() => {
          void prefetchPlaybackTrack(track)
        }, index * 120)
      })
    }, 120)
  }

  async function play(track, ctx = 'manual', options = {}) {
    if (!track) return
    if (isTrackDisliked(track)) return

    if (embedMode) {
      playViaHost(track, ctx, options)
      return
    }

    let playbackTrack = track
    if (!(track.sourceType === 'youtube' && track.sourceId)) {
      const cached = readCachedPlaybackSource(track.id)
      const resolved = cached?.id
        ? cached
        : await api(`/tracks/${encodeURIComponent(track.id)}/playback-source`, {
            auth: 'optional',
            retry: false,
          }).catch(() => null)
      if (resolved?.sourceType === 'youtube' && resolved?.sourceId) {
        playbackTrack = resolved
        applyResolvedTrack(resolved)
      }
    }

    if (!(playbackTrack.sourceType === 'youtube' && playbackTrack.sourceId)) {
      endPlaybackSession({ completed: false, contextType: 'unavailable-source' })
      state.playing = false
      syncPlayer()
      setHomeWaveActive(false)
      return
    }

    if (state.playbackSession?.trackId && state.playbackSession.trackId !== playbackTrack.id) {
      endPlaybackSession({ completed: false, contextType: 'switch-track' })
    }

    state.ctx = ctx
    setHomeWaveActive(ctx === 'my-wave')
    setCurrent(playbackTrack)
    beginPlaybackSession(playbackTrack, ctx)
    state.t = 0
    state.d = playbackTrack.durationSec || 0
    const overrideList = Array.isArray(options.list) ? filterDislikedTracks(options.list) : []
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
            if (e.data === YT.PlayerState.ENDED) next('ended')
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
      touchPlaybackSession()
      syncPlayer()
    }, 250)

    state.playing = true
    syncPlayer()
    markRows()
  }

  function pause() {
    if (embedMode) {
      notifyParent('wavee-pause')
      return
    }
    if (!state.track) return
    if (state.track.sourceType === 'youtube') yt.player?.pauseVideo?.()
    else audio?.pause()
    state.playing = false
    syncPlayer()
  }

  function resume() {
    if (embedMode) {
      notifyParent('wavee-resume')
      return
    }
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
    touchPlaybackSession()
    syncPlayer()
  }

  function next(reason = 'next') {
    if (embedMode) return
    if (!state.queue.length) return
    const completed = reason === 'ended'
    endPlaybackSession({ completed, contextType: reason })
    if (state.repeat && state.track) return play(state.track, 'repeat')
    if (state.shuffle) return play(state.queue[Math.floor(Math.random() * state.queue.length)], 'shuffle-next')
    const n = state.queue[state.idx + 1]
    if (!n) { state.playing = false; syncPlayer(); return }
    play(n, 'next')
  }

  function prev() {
    if (embedMode) return
    if (!state.queue.length) return
    endPlaybackSession({ completed: false, contextType: 'previous' })
    play(state.queue[Math.max(state.idx - 1, 0)], 'previous')
  }

  async function toggleLike(id) {
    if (!id || !localStorage.getItem(TOKEN)) return
    const cleanId = stripRecoPrefix(id)
    const active = state.likes.has(cleanId)

    try {
      if (active) {
        await api(`/library/likes/${encodeURIComponent(cleanId)}`, { method: 'DELETE', auth: 'required' })
        state.likes.delete(cleanId)
      } else {
        await api(`/library/likes/${encodeURIComponent(cleanId)}`, { method: 'POST', auth: 'required' })
        state.likes.add(cleanId)
      }
      syncLikes()
      notifyParent('wavee-toggle-like', { trackId: cleanId, active: !active })
    } catch (e) {
      console.error('Failed to toggle like', e)
    }
  }

  function getHomeRailTriples() {
    return HOME_RAIL_REGISTRY.map((item) => ({
      slot: item.slot,
      row: el[item.rowKey],
      prevButton: el[item.prevKey],
      nextButton: el[item.nextKey],
    }))
  }

  function rememberHomeRailPosition(row) {
    if (!row) return
    const activeMode = el.homeFilterChips?.dataset.active || HOME_DEFAULT_MODE
    const slot = row.dataset.homeRailSlot || row.id || ''
    if (!slot) return
    if (!state.homeRailPositions[activeMode]) state.homeRailPositions[activeMode] = {}
    state.homeRailPositions[activeMode][slot] = row.scrollLeft || 0
  }

  function captureHomeRailPositions(mode) {
    if (!mode) return
    const snapshot = {}
    getHomeRailTriples().forEach(({ slot, row }) => {
      if (!row) return
      snapshot[slot] = row.scrollLeft || 0
    })
    state.homeRailPositions[mode] = snapshot
  }

  function restoreHomeRailPositions(mode) {
    const snapshot = state.homeRailPositions[mode]
    if (!snapshot) return
    getHomeRailTriples().forEach(({ slot, row }) => {
      if (!row) return
      const rawValue = snapshot[slot]
      if (!Number.isFinite(rawValue)) return
      row.scrollTo({ left: rawValue, behavior: 'instant' })
    })
  }

  function syncHomeRailControls(row, prevButton, nextButton) {
    if (!row || !prevButton || !nextButton) return
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth)
    const scrollLeft = row.scrollLeft
    prevButton.disabled = scrollLeft <= 5
    nextButton.disabled = scrollLeft >= maxScrollLeft - 5
  }

  function scrollHomeRail(row, direction = 1) {
    // Match smoothScrollElement used by ScrollControls in the React pages.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollBy({
      left: HOME_RAIL_SCROLL_AMOUNT * direction,
      behavior: reduceMotion ? 'instant' : 'smooth',
    })
  }

  function wireHomeRail(row, prevButton, nextButton) {
    if (!row || !prevButton || !nextButton) return
    let binding = homeRailBindings.get(row)
    if (!binding) {
      binding = { prevButton, nextButton, frame: 0, activityTimer: 0, resizeTimer: 0 }
      const sync = () => {
        syncHomeRailControls(row, binding.prevButton, binding.nextButton)
        rememberHomeRailPosition(row)
      }
      const scheduleSync = () => {
        if (binding.frame) return
        binding.frame = requestAnimationFrame(() => {
          binding.frame = 0
          sync()
        })
      }
      binding.scheduleSync = scheduleSync
      row.addEventListener('scroll', () => {
        row.classList.add('is-scrolling')
        clearTimeout(binding.activityTimer)
        binding.activityTimer = setTimeout(() => row.classList.remove('is-scrolling'), 110)
        scheduleSync()
      }, { passive: true })
      window.addEventListener('resize', () => {
        clearTimeout(binding.resizeTimer)
        binding.resizeTimer = setTimeout(scheduleSync, 90)
      }, { passive: true })
      if (typeof ResizeObserver !== 'undefined') {
        binding.observer = new ResizeObserver(scheduleSync)
        binding.observer.observe(row)
      }
      homeRailBindings.set(row, binding)
    }

    // Headers can be replaced when recommendations change; keep one listener
    // per rail and bind its current controls instead of retaining old buttons.
    binding.prevButton = prevButton
    binding.nextButton = nextButton
    prevButton.onclick = () => {
      scrollHomeRail(row, -1)
      binding.scheduleSync()
    }
    nextButton.onclick = () => {
      scrollHomeRail(row, 1)
      binding.scheduleSync()
    }
    binding.scheduleSync()
  }

  function syncHomeTrackRailControls() {
    getHomeRailTriples().forEach(({ row, prevButton, nextButton }) => {
      syncHomeRailControls(row, prevButton, nextButton)
    })
  }

  function wireHomeTrackRails() {
    getHomeRailTriples().forEach(({ row, prevButton, nextButton }) => {
      wireHomeRail(row, prevButton, nextButton)
    })
  }

  function playHomeModeTransitionFx() {
    const sections = [...document.querySelectorAll('.section-shell')]
      .filter((section) => section.id !== 'home-filter-section')
    if (!sections.length) return
    if (homeUiFxState.modeFxTimer) {
      clearTimeout(homeUiFxState.modeFxTimer)
      homeUiFxState.modeFxTimer = null
    }

    sections.forEach((section, index) => {
      section.style.setProperty('--mode-enter-delay', `${Math.min(index * 26, 220)}ms`)
      section.classList.remove('is-mode-enter')
    })
    requestAnimationFrame(() => {
      sections.forEach((section) => section.classList.add('is-mode-enter'))
    })
    homeUiFxState.modeFxTimer = setTimeout(() => {
      sections.forEach((section) => section.classList.remove('is-mode-enter'))
      homeUiFxState.modeFxTimer = null
    }, 620)
  }

  function wireHomeSectionRevealFx() {
    if (homeUiFxState.revealBound) return
    const sections = [...document.querySelectorAll('.section-shell')]
    if (!sections.length) return

    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-in-view'))
      homeUiFxState.revealBound = true
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in-view')
        observer.unobserve(entry.target)
      })
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.15,
    })

    sections.forEach((section, index) => {
      section.style.setProperty('--section-delay', `${Math.min(index * 30, 220)}ms`)
      if (section.id === 'home-filter-section') {
        section.classList.add('is-in-view')
        return
      }
      observer.observe(section)
    })

    homeUiFxState.revealBound = true
  }

  function wireHomeFilterChips() {
    if (!el.homeFilterChips) return
    const chips = [...el.homeFilterChips.querySelectorAll('[data-filter-chip]')]
    if (!chips.length) return

    chips.forEach((button) => {
      if (button.dataset.bound) return
      button.addEventListener('click', () => {
        const active = button.getAttribute('data-filter') || HOME_DEFAULT_MODE
        const previousMode = el.homeFilterChips.dataset.active || HOME_DEFAULT_MODE
        if (active === previousMode) return
        triggerRuntimeHaptic('selection')

        const swipeDirection = active === 'trends' ? 'right' : 'left'
        el.homeFilterChips.dataset.swipeFx = swipeDirection
        if (homeUiFxState.filterSwipeTimer) {
          clearTimeout(homeUiFxState.filterSwipeTimer)
          homeUiFxState.filterSwipeTimer = null
        }
        homeUiFxState.filterSwipeTimer = setTimeout(() => {
          if (el.homeFilterChips) {
            delete el.homeFilterChips.dataset.swipeFx
          }
          homeUiFxState.filterSwipeTimer = null
        }, 420)

        captureHomeRailPositions(previousMode)
        el.homeFilterChips.dataset.active = active
        chips.forEach((chip) => {
          const isActive = chip === button
          chip.classList.toggle('is-active', isActive)
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false')
        })
        renderHome({ modeSwitch: true, previousMode, activeMode: active })
        if (!state.homeRecommendationsByMode[active]) {
          void fetchHomeRecommendationsMode(active).then((payload) => {
            if (!payload) return
            if ((el.homeFilterChips?.dataset.active || HOME_DEFAULT_MODE) !== active) return
            renderHome({ modeSwitch: false, activeMode: active })
          })
        }
      })
      button.dataset.bound = '1'
    })
  }

  function getArtistAvatarUrl(entry) {
    return (
      entry?.artist?.avatarUrl ||
      entry?.artist?.coverUrl ||
      entry?.artist?.imageUrl ||
      entry?.artist?.pictureUrl ||
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

  function FilterChips({ active = 'all', items = [] } = {}) {
    return items.map((item) => {
      const value = String(item?.value || '')
      const label = String(item?.label || '')
      const isActive = value === active
      return `
        <button
          type="button"
          class="home-filter-chip${isActive ? ' is-active' : ''}"
          data-filter-chip
          data-filter="${esc(value)}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        >
          <span class="home-filter-chip-label">${esc(label)}</span>
        </button>
      `
    }).join('')
  }

  function SectionHeader({
    title = '',
    subtitle = '',
    actionHref = '/library',
    actionLabel = 'Показать все',
    controlsPrefix = '',
    controlsAriaLabel = '',
  } = {}) {
    const controls = controlsPrefix
      ? `
        <div class="artists-carousel-controls home-section-controls" aria-label="${esc(controlsAriaLabel || `Навигация по секции ${title}`)}">
          <button id="${esc(`${controlsPrefix}-prev`)}" type="button" class="artists-carousel-control" aria-label="Прокрутить секцию ${esc(title)} назад">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><use href="../icons/angle-left-solid.svg#angle-left-solid"></use></svg>
          </button>
          <button id="${esc(`${controlsPrefix}-next`)}" type="button" class="artists-carousel-control" aria-label="Прокрутить секцию ${esc(title)} вперёд">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><use href="../icons/angle-right-solid.svg#angle-right-solid"></use></svg>
          </button>
        </div>
      `
      : ''

    return `
      <div class="home-section-header">
        <a href="${esc(actionHref)}" data-nav-route="${esc(actionHref)}" class="home-section-title-link">
          <div class="home-section-head-copy">
            <h2 class="home-section-title">${esc(title)}</h2>
            ${subtitle ? `<p class="home-section-subline">${esc(subtitle)}</p>` : ''}
          </div>
        </a>
        <div class="home-section-actions">
          ${controls}
        </div>
      </div>
    `
  }

  function cardBadgeMarkup() {
    return ''
  }

  function cardMetaMarkup() {
    return ''
  }

  function buildSkeletonCards(variant = 'medium', count = 6) {
    return [`
      <div class="home-runtime-loading" aria-label="Загрузка" role="status">
        <span class="home-runtime-loading-spinner" aria-hidden="true"></span>
      </div>
    `]
  }

  function buildDisconnectedCards(variant = 'medium', count = 6) {
    const safeVariant = ['small', 'medium', 'large', 'artist'].includes(variant) ? variant : 'medium'
    return Array.from({ length: count }, (_, index) => `
      <article class="home-skeleton-card home-skeleton-card--${safeVariant}" data-carousel-card aria-hidden="true" style="--card-delay:${Math.min(index * 40, 260)}ms">
        <span class="home-skeleton-shimmer"></span>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;padding:12px;height:100%;pointer-events:none;">
          <div style="position:relative;flex:1;min-height:0;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.02) 100%),rgba(20,20,20,0.15);border:0;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" style="color:rgba(255,255,255,0.86);opacity:0.92;">
              <path d="M3 9.5c2.1-2 4.6-3 7.5-3 2.1 0 4 .5 5.8 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M5.6 12.3c1.4-1.2 3-1.8 4.9-1.8 1.2 0 2.3.2 3.4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8.7 15.2c.6-.5 1.2-.7 1.9-.7.5 0 1 .1 1.4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              <circle cx="10.6" cy="18.1" r="1.2" fill="currentColor"></circle>
              <path d="M18.8 5.2 4.9 19.1" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"></path>
            </svg>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <span style="height:10px;border-radius:999px;background:rgba(255,255,255,0.42);width:72%;"></span>
            <span style="height:8px;border-radius:999px;background:rgba(255,255,255,0.22);width:56%;"></span>
          </div>
        </div>
      </article>
    `)
  }

  function wireHomeLazyCoverFx(root = document) {
    if (!root?.querySelectorAll) return
    const images = [...root.querySelectorAll('img.home-lazy-cover:not([data-lazy-bound])')]
    images.forEach((img) => {
      img.dataset.lazyBound = '1'
      const markLoaded = () => img.classList.add('is-loaded')
      if (img.complete && img.naturalWidth > 0) {
        requestAnimationFrame(markLoaded)
        return
      }
      img.addEventListener('load', markLoaded, { once: true })
      img.addEventListener('error', markLoaded, { once: true })
    })
  }

  function wireHomePlayRippleFx(root = document) {
    if (!root?.querySelectorAll) return
    const buttons = [...root.querySelectorAll('.home-card-play:not([data-ripple-bound]), .home-artist-play:not([data-ripple-bound])')]
    buttons.forEach((button) => {
      button.dataset.rippleBound = '1'
      button.addEventListener('pointerdown', () => {
        button.classList.remove('is-rippling')
        requestAnimationFrame(() => button.classList.add('is-rippling'))
      })
      button.addEventListener('animationend', () => {
        button.classList.remove('is-rippling')
      })
    })
  }

  function homeCardPlayback(trackId, title, className = 'home-card-play') {
    const starPath = document.querySelector('#wavee-star-clip path')?.getAttribute('d') || ''
    return `
      <button type="button" data-action="play-track" data-track-id="${esc(trackId)}" data-playback-title="${esc(title)}" class="${className}" aria-label="Воспроизвести «${esc(title)}»" aria-pressed="false">
        <svg class="home-card-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/play-solid.svg#play-solid"></use></svg>
        <svg class="home-card-icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><use href="../icons/pause-solid.svg#pause-solid"></use></svg>
      </button>
      <span class="home-card-playing-mark" aria-hidden="true">
        <svg viewBox="0 0 1 1" focusable="false">
          <path d="${esc(starPath)}" />
          <g class="home-card-playing-bars">
            <rect x="0.31" y="0.41" width="0.08" height="0.18" rx="0.04" />
            <rect x="0.46" y="0.32" width="0.08" height="0.36" rx="0.04" />
            <rect x="0.61" y="0.38" width="0.08" height="0.24" rx="0.04" />
          </g>
        </svg>
      </span>
    `
  }

  function ArtistCard({ entry = {}, badge = '', meta = '' } = {}) {
    const artistName = entry?.artist?.name || 'Wavee Artist'
    const artistAvatarUrl = getArtistAvatarUrl(entry)
    const trackId = entry?.track?.id || ''
    const artistId = entry?.artist?.id || ''
    const monthlyListenersLine = formatMonthlyListeners(resolveArtistMonthlyListeners(entry))
    const artistNameLength = [...artistName].length
    const artistNameSizeClass = artistNameLength >= 16
      ? ' is-xlong'
      : (artistNameLength >= 11 ? ' is-long' : '')

    return `
      <article class="home-artist-card group" data-carousel-card data-action="play-track" data-track-id="${esc(trackId)}">
        <div class="home-artist-media">
          <div class="home-artist-cover-shell">
            ${artistAvatarUrl
              ? `<img src="${esc(optimizedCoverUrl(artistAvatarUrl, 300))}" alt="" aria-label="${esc(artistName)}" class="home-lazy-cover" loading="lazy" decoding="async">`
              : `<div class="home-artist-cover-fallback">${esc(getArtistInitials(artistName))}</div>`}
          </div>
          ${cardBadgeMarkup()}
          ${homeCardPlayback(trackId, artistName, 'home-artist-play')}
        </div>
        <div class="home-artist-info">
          <h3 class="home-artist-name${artistNameSizeClass}">${esc(artistName)}</h3>
          <p class="home-artist-monthly" data-artist-monthly data-artist-id="${esc(artistId)}" data-artist-name="${esc(artistName)}">${esc(monthlyListenersLine)}</p>
          ${cardMetaMarkup(meta)}
        </div>
      </article>
    `
  }

  function PlaylistCard({
    track = null,
    coverMarkup = () => '',
    kicker = 'THIS IS',
    badge = '',
    meta = '',
    featured = false,
    compact = false,
    mixId = '',
  } = {}) {
    if (!track?.id) return ''
    const artistName = track?.artist?.name || 'Wavee'
    const trackTitle = track?.title || artistName
    const mixAttr = mixId ? ` data-mix-id="${esc(mixId)}"` : ''

    return `
      <article class="home-playlist-card group${featured ? ' is-featured' : ''}${compact ? ' is-compact' : ''}" data-carousel-card data-action="play-track" data-track-id="${esc(track.id)}"${mixAttr}>
        <div class="home-playlist-cover">
          ${coverMarkup(track, `${artistName} — This Is`, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
          <div class="home-playlist-overlay${compact ? ' is-compact' : ''}"></div>
          ${cardBadgeMarkup()}
          ${compact
            ? ''
            : `
              <span class="home-playlist-logo">W</span>
              <div class="home-playlist-copy">
                <span class="home-playlist-kicker">${esc(kicker)}</span>
                <h3 class="home-playlist-artist">${esc(artistName)}</h3>
              </div>
            `}
          ${homeCardPlayback(track.id, track.title || artistName)}
        </div>
        ${compact
          ? `
            <div class="home-top-track-meta">
              <h3 class="home-top-track-title">${esc(trackTitle)}</h3>
              <p class="home-top-track-artist">${esc(artistName)}</p>
            </div>
          `
          : ''}
        ${cardMetaMarkup(meta)}
      </article>
    `
  }

  function AlbumCard({
    track = null,
    coverMarkup = () => '',
    title = '',
    subtitle = '',
    badge = '',
    meta = '',
    featured = false,
  } = {}) {
    if (!track?.id) return ''
    const cardTitle = title || track.title || 'Релиз'
    const cardSubtitle = subtitle || formatArtistNames(track)

    return `
      <article class="home-album-card group${featured ? ' is-featured' : ''}" data-carousel-card data-action="play-track" data-track-id="${esc(track.id)}">
        <div class="home-album-cover">
          ${coverMarkup(track, cardTitle, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
          ${cardBadgeMarkup()}
          ${homeCardPlayback(track.id, cardTitle)}
        </div>
        <h3 class="home-album-title">${esc(cardTitle)}</h3>
        <p class="home-album-subtitle">${esc(cardSubtitle)}</p>
        ${cardMetaMarkup(meta)}
      </article>
    `
  }

  function SmallCard({
    track = null,
    coverMarkup = () => '',
    title = '',
    subtitle = '',
    badge = '',
    meta = '',
    size = 'small',
  } = {}) {
    if (!track?.id) return ''
    const cardTitle = title || track.title || 'Wavee'
    const cardSubtitle = subtitle || formatArtistNames(track)
    const sizeClass = size === 'large' ? ' is-large' : (size === 'medium' ? ' is-medium' : '')

    return `
      <article class="home-small-card group${sizeClass}" data-carousel-card data-action="play-track" data-track-id="${esc(track.id)}">
        <div class="home-small-media">
          ${coverMarkup(track, cardTitle, 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105')}
          ${cardBadgeMarkup({ label: badge, tone: size === 'large' ? 'hot' : 'soft' })}
          ${homeCardPlayback(track.id, cardTitle)}
        </div>
        <div class="home-small-body">
          <h3 class="home-small-title">${esc(cardTitle)}</h3>
          <p class="home-small-subtitle">${esc(cardSubtitle)}</p>
          ${cardMetaMarkup(meta)}
        </div>
      </article>
    `
  }

  function HorizontalCarousel({ target = null, cards = [], emptyText = '' } = {}) {
    if (!target) return
    const nextMarkup = cards.length
      ? cards.join('')
      : `<div class="home-carousel-empty">${esc(emptyText || 'Контент появится после загрузки треков.')}</div>`
    const nextSignature = fastHash(nextMarkup)
    const prevSignature = target.dataset.carouselSignature || ''
    const markupChanged = prevSignature !== nextSignature

    if (markupChanged) {
      target.innerHTML = nextMarkup
      target.dataset.carouselSignature = nextSignature
      target.dataset.carouselHadContent = cards.length ? '1' : '0'
    }

    const shouldAnimateEnter = markupChanged && target.dataset.carouselEnterPlayed !== '1'
    if (shouldAnimateEnter) {
      const rowCards = [...target.querySelectorAll('[data-carousel-card]')]
      requestAnimationFrame(() => {
        rowCards.forEach((card, index) => {
          card.style.setProperty('--card-delay', `${Math.min(index * 42, 260)}ms`)
          card.classList.add('is-stagger-ready')
        })
      })
      target.dataset.carouselEnterPlayed = '1'
    }
    wireHomeLazyCoverFx(target)
    wireHomePlayRippleFx(target)
  }

  function bindNavRoutes(container) {
    if (!container || container.dataset.navBound === '1') return
    container.querySelectorAll('[data-nav-route]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault()
        navigateInHost(link.getAttribute('data-nav-route') || '/')
      })
    })
    container.dataset.navBound = '1'
  }

  function setSectionVisibility(section, visible) {
    if (!section) return
    section.style.display = visible ? '' : 'none'
  }

  function SectionBlock({
    section = null,
    headerTarget = null,
    rowTarget = null,
    title = '',
    subtitle = '',
    actionHref = '/library',
    actionLabel = 'Показать все',
    controlsPrefix = '',
    controlsAriaLabel = '',
    controlsKeys = [],
    cards = [],
    emptyText = '',
    visible = true,
  } = {}) {
    setSectionVisibility(section, visible)
    if (!visible) return
    if (section) section.classList.add('home-section-mounted')

    if (headerTarget) {
      const signature = `${title}|${subtitle}|${actionHref}|${actionLabel}|${controlsPrefix}|${controlsAriaLabel}`
      if (headerTarget.dataset.signature !== signature) {
        headerTarget.innerHTML = SectionHeader({
          title,
          subtitle,
          actionHref,
          actionLabel,
          controlsPrefix,
          controlsAriaLabel,
        })
        headerTarget.dataset.signature = signature
      }
      bindNavRoutes(headerTarget)
    }

    if (controlsPrefix && Array.isArray(controlsKeys) && controlsKeys.length === 2) {
      const [prevKey, nextKey] = controlsKeys
      el[prevKey] = $(`${controlsPrefix}-prev`)
      el[nextKey] = $(`${controlsPrefix}-next`)
    }
    if (rowTarget) {
      rowTarget.dataset.homeRailSlot = controlsPrefix || rowTarget.id || ''
    }

    HorizontalCarousel({
      target: rowTarget,
      cards,
      emptyText,
    })
  }

  function renderHome({ modeSwitch = false, activeMode = '' } = {}) {
    const forceDisconnectedPlaceholders = HOME_FORCE_DISCONNECTED_PLACEHOLDERS
    let activeFilter = activeMode || el.homeFilterChips?.dataset.active || HOME_DEFAULT_MODE
    if (activeFilter === 'for-you' && !hasSessionToken()) {
      activeFilter = 'trends'
    }
    const isForYouMode = activeFilter === 'for-you'
    const isTrendsMode = activeFilter === 'trends'
    const requiresPersonalBlocks = isForYouMode && hasSessionToken()
    const pool = forceDisconnectedPlaceholders ? [] : getHomeTrackPool(activeFilter)
    const fallbackTracks = forceDisconnectedPlaceholders ? [] : filterDislikedTracks(state.tracks)
    const baseTracks = pool.length ? pool : fallbackTracks
    const musicTracks = baseTracks.filter((track) => track?.id)
    let isLoadingContent = !state.homeCatalogReady && !baseTracks.length
    let priorityImageBudget = 6

    const withSkeleton = (cards, variant = 'medium', count = 6, forceLoading = false) => (
      forceDisconnectedPlaceholders
        ? buildDisconnectedCards(variant, count)
        : (
            cards.length ? cards : ((isLoadingContent || forceLoading) ? buildSkeletonCards(variant, count) : [])
          )
    )

    const coverMarkup = (track, altText, classes = 'h-full w-full object-cover') => {
      if (!track?.coverUrl) {
        return '<div class="flex h-full w-full items-center justify-center bg-[#2d303a] text-3xl text-white/60">♪</div>'
      }

      const priority = priorityImageBudget > 0
      priorityImageBudget -= 1
      return `<img src="${esc(optimizedCoverUrl(track.coverUrl, 400))}" alt="" aria-label="${esc(altText)}" class="home-lazy-cover ${classes}" loading="${priority ? 'eager' : 'lazy'}" decoding="async"${priority ? ' fetchpriority="high"' : ''}>`
    }

    const recommendationBlocks = getHomeRecommendationBlocks(activeFilter)
    const hasRecommendationBlocks = Boolean(recommendationBlocks)
    const hasAnyRecommendationContent = hasHomeRecommendationContent(recommendationBlocks)
    const isRecommendationModeLoading = Boolean(state.homeRecommendationsLoadingByMode[activeFilter])
    const canUseCatalogFallback = !forceDisconnectedPlaceholders && musicTracks.length > 0
    const hasPersonalRecommendationContent = isForYouMode && hasPersonalHomeRecommendationContent(recommendationBlocks)
    const hasPersonalRuntimeTracks = getMyWaveTracks().length > 0 || state.likedTracks.length > 0
    const isWaitingForPersonal = requiresPersonalBlocks
      && (
        Boolean(state.homePersonalLoading)
        || (!hasPersonalRecommendationContent && !hasPersonalRuntimeTracks && (isRecommendationModeLoading || (!state.hostSynced && !hasAnyRecommendationContent)))
      )
    const canUsePersonalFallback = !isWaitingForPersonal && !hasPersonalRuntimeTracks && canUseCatalogFallback
    const shouldShowPersonalSkeleton = isForYouMode && isWaitingForPersonal

    if (!hasRecommendationBlocks && (state.homeRecommendationsLoadingByMode[activeFilter] || isWaitingForPersonal)) {
      isLoadingContent = true
    }
    if (el.homeFilterChips) {
      el.homeFilterChips.dataset.active = activeFilter
    }

    if (el.homeFilterChips) {
      el.homeFilterChips.innerHTML = FilterChips({
        active: activeFilter,
        items: [
          { value: 'for-you', label: 'Для тебя' },
          { value: 'trends', label: 'Тренды' },
        ],
      })
    }
    wireHomeFilterChips()

    const trendingTracks = [...pickTracks(musicTracks, Math.min(musicTracks.length, 28), 1)]
      .sort((left, right) => {
        const leftScore = stablePercent(`${left.id}:trending`, 35, 100) + (state.likes.has(left.id) ? 8 : 0)
        const rightScore = stablePercent(`${right.id}:trending`, 35, 100) + (state.likes.has(right.id) ? 8 : 0)
        return rightScore - leftScore
      })
      .slice(0, 20)

    const recommendedReleaseTracks = isForYouMode
      ? getPersonalTracksFromRecommendationBlock(recommendationBlocks?.newReleases)
      : getTracksFromRecommendationBlock(recommendationBlocks?.newReleases)
    const getTrackReleaseTs = (t) => {
      const candidates = [t?.releasedAt, t?.releaseDate, t?.yandex?.releaseDate, t?.album?.releasedAt, t?.album?.releaseDate]
      for (const c of candidates) {
        if (!c) continue
        if (typeof c === 'number') return c > 1e12 ? c : c * 1000
        const s = String(c).trim()
        const ruMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
        if (ruMatch) return new Date(ruMatch[3], ruMatch[2] - 1, ruMatch[1]).getTime() || 0
        const ts = new Date(s).getTime()
        if (Number.isFinite(ts)) return ts
      }
      return 0
    }
    const nowTs = Date.now()
    const isRecentRelease = (track) => {
      const ts = getTrackReleaseTs(track)
      return ts > 0 && ts <= nowTs && nowTs - ts <= HOME_NEW_RELEASE_STRICT_AGE_MS
    }
    const freshFallbackReleases = (isTrendsMode ? canUseCatalogFallback : canUsePersonalFallback)
      ? musicTracks.filter(isRecentRelease)
      : []
    const releaseSource = dedupeTracks([
      ...recommendedReleaseTracks.filter(isRecentRelease),
      ...freshFallbackReleases,
    ]).sort((a, b) => getTrackReleaseTs(b) - getTrackReleaseTs(a))

    const releaseTracks = releaseSource.slice(0, HOME_NEW_RELEASES_LIMIT)
    const releaseCards = releaseTracks.map((track, index) => AlbumCard({
      track,
      coverMarkup,
      title: track.title,
      subtitle: `${formatArtistNames(track)} • ${resolveHomeReleaseLabel(track)}`,
      badge: index < 5 ? 'NEW' : '',
      meta: 'Свежий релиз',
      featured: false,
    }))
    SectionBlock({
      section: el.homeQuickAccessSection,
      headerTarget: el.homeQuickAccessHeader,
      rowTarget: el.homeQuickAccess,
      title: 'Новые релизы',
      actionHref: '/library',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-quick-access',
      controlsAriaLabel: 'Навигация по новым релизам',
      controlsKeys: ['homeQuickAccessPrev', 'homeQuickAccessNext'],
      cards: withSkeleton(releaseCards, 'medium', 6, shouldShowPersonalSkeleton),
      emptyText: isTrendsMode
        ? 'Релизы появятся после загрузки каталога.'
        : 'Персональные релизы появятся после построения рекомендаций.',
      visible: true,
    })

    setSectionVisibility(el.homeNewReleasesSection, false)

    const recommendedFavoriteArtists = Array.isArray(recommendationBlocks?.favoriteArtists)
      ? recommendationBlocks.favoriteArtists
        .map((item) => ({ artist: item?.artist, track: item?.track }))
        .filter((item) => item?.artist?.id || item?.artist?.name)
        .slice(0, 20)
      : []
    const favoriteArtists = isForYouMode
      ? recommendedFavoriteArtists
      : []
    const favoriteArtistCards = favoriteArtists.map((entry, index) => ArtistCard({
      entry,
      badge: index < 3 ? 'TOP' : '',
      meta: index < 4 ? 'Ты слушал' : 'Для тебя',
    }))
    SectionBlock({
      section: el.homeFavoriteArtistsSection,
      headerTarget: el.homeFavoriteArtistsHeader,
      rowTarget: el.homeFavoriteArtists,
      title: 'Любимые исполнители',
      actionHref: '/library',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-favorite-artists',
      controlsAriaLabel: 'Навигация по любимым исполнителям',
      controlsKeys: ['homeFavoriteArtistsPrev', 'homeFavoriteArtistsNext'],
      cards: withSkeleton(favoriteArtistCards, 'artist', 8, shouldShowPersonalSkeleton),
      emptyText: 'Любимые исполнители появятся после первых лайков.',
      visible: isForYouMode,
    })

    const recommendedPopularArtists = Array.isArray(recommendationBlocks?.popularArtists)
      ? recommendationBlocks.popularArtists
        .map((item) => ({ artist: item?.artist, track: item?.track }))
        .filter((item) => item?.artist?.id || item?.artist?.name)
        .slice(0, 20)
      : []
    const popularArtists = recommendedPopularArtists.length
      ? recommendedPopularArtists
      : (canUseCatalogFallback ? [...getArtistEntries(musicTracks)]
        .sort((left, right) => {
          const leftScore = stablePercent(`${left.artist?.id || left.artist?.name}:popular-artist`, 20, 100)
          const rightScore = stablePercent(`${right.artist?.id || right.artist?.name}:popular-artist`, 20, 100)
          return rightScore - leftScore
        })
        .slice(0, 20) : [])
    const popularArtistCards = popularArtists.map((entry, index) => ArtistCard({
      entry,
      badge: index < 5 ? 'TOP' : '',
      meta: isTrendsMode ? 'Популярно сейчас' : 'Популярно среди пользователей',
    }))
    SectionBlock({
      section: el.homePopularArtistsSection,
      headerTarget: el.homePopularArtistsHeader,
      rowTarget: el.homePopularArtists,
      title: 'Популярные исполнители',
      actionHref: '/search',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-popular-artists',
      controlsAriaLabel: 'Навигация по популярным исполнителям',
      controlsKeys: ['homePopularArtistsPrev', 'homePopularArtistsNext'],
      cards: withSkeleton(popularArtistCards, 'artist', 8),
      emptyText: 'Исполнители появятся после загрузки каталога.',
      visible: isTrendsMode,
    })

    setSectionVisibility(el.homeSubtitleSection, isForYouMode)

    const recommendedBestTracks = isForYouMode
      ? getPersonalTracksFromRecommendationBlock(recommendationBlocks?.bestTracks)
      : getTracksFromRecommendationBlock(recommendationBlocks?.bestTracks)
    const topTracksSource = recommendedBestTracks.length
      ? recommendedBestTracks
      : (isTrendsMode
          ? (canUseCatalogFallback ? trendingTracks : [])
          : (canUsePersonalFallback ? trendingTracks : []))
    const topTracks = topTracksSource.slice(0, 20)
    const topTrackCards = topTracks.map((track, index) => PlaylistCard({
      track,
      coverMarkup,
      kicker: isTrendsMode ? 'TRENDING' : 'THIS IS',
      badge: isTrendsMode ? (index < 3 ? 'TOP' : 'В РОСТЕ') : (index < 3 ? 'ДЛЯ ТЕБЯ' : ''),
      meta: isTrendsMode ? 'Популярно среди пользователей' : 'Похоже на то, что тебе нравится',
      featured: false,
      compact: true,
    }))
    SectionBlock({
      section: el.homeTopTracksSection,
      headerTarget: el.homeTopTracksHeader,
      rowTarget: el.homeTopTracks,
      title: isTrendsMode ? 'Популярные треки' : 'Лучшие треки',
      actionHref: '/search',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-top-tracks',
      controlsAriaLabel: 'Навигация по лучшим трекам',
      controlsKeys: ['homeTopTracksPrev', 'homeTopTracksNext'],
      cards: withSkeleton(topTrackCards, 'medium', 6, shouldShowPersonalSkeleton),
      emptyText: 'Треки появятся после загрузки музыки.',
      visible: true,
    })

    const recommendedMixEntries = Array.isArray(recommendationBlocks?.mixes)
      ? recommendationBlocks.mixes
        .filter((entry) => entry?.track?.id && (!isForYouMode || isPersonalHomeRecommendationEntry(entry)))
        .slice(0, 20)
      : []
    const mixEntries = isForYouMode
      ? (
          recommendedMixEntries.length
            ? recommendedMixEntries
            : (canUsePersonalFallback ? pickTracks(musicTracks, Math.min(musicTracks.length, 20), 6)
              .filter((track) => track?.id)
              .map((track, index) => {
                const genre = track?.genres?.[0]
                return {
                  id: track.id,
                  title: genre ? `${titleCase(genre)} mix` : `${titleCase(track.artist?.name || 'Wave')} mix`,
                  subtitle: formatArtistNames(track, 'Wavee selection'),
                  seed: `${track.id}:fallback-mix:${index}`,
                  track,
                }
              }) : [])
        )
      : []
    const mixKickers = ['THIS IS', 'Для тебя', 'По жанру', 'В ротации']
    const mixCards = mixEntries.map((entry, index) => PlaylistCard({
      track: entry.track,
      index,
      coverMarkup,
      kicker: entry.kicker || mixKickers[index % mixKickers.length],
      description: entry.subtitle || 'Персональная подборка Wavee.',
      badge: 'ДЛЯ ТЕБЯ',
      meta: index < 3 ? 'Персональная рекомендация' : 'Собрано из твоих прослушиваний',
      mixId: entry.id || '',
    }))
    SectionBlock({
      section: el.homeMixesSection,
      headerTarget: el.homeMixesHeader,
      rowTarget: el.homeMixes,
      title: 'Подборки и миксы',
      actionHref: '/library',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-mixes',
      controlsAriaLabel: 'Навигация по подборкам и миксам',
      controlsKeys: ['homeMixesPrev', 'homeMixesNext'],
      cards: withSkeleton(mixCards, 'medium', 5, shouldShowPersonalSkeleton),
      emptyText: 'Персональные миксы подгружаются.',
      visible: isForYouMode,
    })

    const recommendedGenresAndMoods = Array.isArray(recommendationBlocks?.genresAndMoods)
      ? recommendationBlocks.genresAndMoods
        .filter((entry) => !isForYouMode || !entry?.track?.id || isPersonalHomeRecommendationEntry(entry))
      : []
    const genresAndMoodsEntries = recommendedGenresAndMoods.length
      ? recommendedGenresAndMoods
      : (isTrendsMode
          ? (canUseCatalogFallback ? getGenreMoodBuckets(musicTracks) : [])
          : (canUsePersonalFallback ? getGenreMoodBuckets(pickTracks(musicTracks, Math.min(musicTracks.length, 30), 10)) : []))
    const extraCards = genresAndMoodsEntries.slice(0, 20).map((entry, index) => SmallCard({
      track: entry.track,
      coverMarkup,
      kicker: isTrendsMode ? 'Чарт' : 'Тренд',
      title: entry.title,
      subtitle: entry.mood || getTopGenres(entry.track, 1).join(' • ') || `Сцена #${index + 1}`,
      badge: isTrendsMode ? (index < 4 ? 'POPULAR' : 'В РОСТЕ') : 'ДЛЯ ТЕБЯ',
      meta: isTrendsMode ? 'Жанр набирает обороты' : 'Похоже на твои любимые треки',
      size: index < 2 ? 'medium' : 'small',
    }))
    SectionBlock({
      section: el.homeExtraSection,
      headerTarget: el.homeExtraHeader,
      rowTarget: el.homeExtra,
      title: isTrendsMode ? 'Тренды по жанрам' : 'Жанры и настроение',
      actionHref: '/search',
      actionLabel: 'Показать все',
      controlsPrefix: 'home-extra',
      controlsAriaLabel: 'Навигация по жанрам и трендам',
      controlsKeys: ['homeExtraPrev', 'homeExtraNext'],
      cards: withSkeleton(extraCards, 'small', 6, shouldShowPersonalSkeleton),
      emptyText: 'Карточки появятся после обновления рекомендаций.',
      visible: true,
    })

    wireHomeTrackRails()
    if (modeSwitch) restoreHomeRailPositions(activeFilter)
    requestAnimationFrame(syncHomeTrackRailControls)
    wireHomeSectionRevealFx()
    if (modeSwitch) playHomeModeTransitionFx()
    scheduleHydrateHomeArtistMonthlyListeners()

    const myWaveTracks = getMyWaveTracks()
    renderHomeWaveCovers({
      musicTracks,
      allowCatalogFallback: !state.homePersonalLoading && !isWaitingForPersonal && canUseCatalogFallback,
    })

    if (el.hero) {
      const hasSession = hasSessionToken()
      const canStart = hasSession || myWaveTracks.length > 0
      const hasPersonalWave = myWaveTracks.length > 0

      el.hero.disabled = !canStart
      const heroLabelBase = hasPersonalWave ? 'Слушать мою волну' : 'Слушать волну'
      const isWavePlaying = Boolean(state.playing && state.ctx === 'my-wave')
      el.hero.setAttribute('aria-label', isWavePlaying ? 'Приостановить мою волну' : heroLabelBase)
      el.hero.classList.toggle('is-muted', !canStart)
    }
    markRows()
  }

  function renderMyWave() {
    if (!el.myWaveStreamRow || !el.myWaveEmpty) return
    const items = filterDislikedWaveItems(state.myWave)
    const hasSession = Boolean(localStorage.getItem(TOKEN))
    syncMyWaveSettingChips()
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
                ? `<img src="${esc(optimizedCoverUrl(track.coverUrl, 400))}" alt="" loading="lazy" decoding="async">`
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
                ? `<img src="${esc(optimizedCoverUrl(track.coverUrl, 300))}" alt="" loading="lazy" decoding="async">`
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
                ? `<img src="${esc(optimizedCoverUrl(mix.track.coverUrl, 300))}" alt="" loading="lazy" decoding="async">`
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
      triggerRuntimeHaptic('light')
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
      const triggerHero = async () => {
        if (state.playing && state.ctx === 'my-wave') {
          pause()
          return
        }
        if (state.track && state.ctx === 'my-wave' && !state.playing) {
          resume()
          return
        }

        if (embedMode) {
          notifyParent('wavee-start-wave', {})
          return
        }

        let playbackList = getMyWaveTracks()
        if (!playbackList.length) {
          playbackList = getHomeTrackPool()
        }

        const leadTrack = playbackList[0]
        if (!leadTrack) {
          el.hero.disabled = !hasSessionToken()
          return
        }

        setHomeWaveActive(true)
        await play(leadTrack, 'my-wave', { list: playbackList })
      }
      el.hero.onclick = (event) => {
        event.preventDefault?.()
        triggerRuntimeHaptic('medium')
        void triggerHero()
      }
      el.hero.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void triggerHero()
        }
      }
    }
    if (el.homeWaveSettingsToggle && el.homeWaveSettingsPanel) {
      el.homeWaveSettingsToggle.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        triggerRuntimeHaptic('light')
        const expanded = el.homeWaveSettingsToggle.getAttribute('aria-expanded') === 'true'
        el.homeWaveSettingsToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true')
        el.homeWaveSettingsPanel.hidden = expanded
        
        document.body.classList.toggle('is-modal-open', !expanded)
        
        // Notify parent about modal state
        if (window.parent !== window) {
          window.parent.postMessage({
            source: 'wavee-design-runtime',
            type: 'wavee-modal-state',
            payload: { open: !expanded }
          }, '*')
        }
      }
      document.addEventListener('click', (event) => {
        if (el.homeWaveSettingsPanel.hidden) return
        if (el.homeWaveSettingsPanel.contains(event.target) || el.homeWaveSettingsToggle.contains(event.target)) return
        el.homeWaveSettingsToggle.setAttribute('aria-expanded', 'false')
        el.homeWaveSettingsPanel.hidden = true
        
        document.body.classList.remove('is-modal-open')
        
        // Notify parent about modal close
        if (window.parent !== window) {
          window.parent.postMessage({
            source: 'wavee-design-runtime',
            type: 'wavee-modal-state',
            payload: { open: false }
          }, '*')
        }
      })
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || el.homeWaveSettingsPanel.hidden) return
        el.homeWaveSettingsToggle.setAttribute('aria-expanded', 'false')
        el.homeWaveSettingsPanel.hidden = true
        el.homeWaveSettingsToggle.focus()
        
        document.body.classList.remove('is-modal-open')
        
        // Notify parent about modal close
        if (window.parent !== window) {
          window.parent.postMessage({
            source: 'wavee-design-runtime',
            type: 'wavee-modal-state',
            payload: { open: false }
          }, '*')
        }
      })
    }
    if (el.myWaveRefresh) el.myWaveRefresh.onclick = async () => {
      triggerRuntimeHaptic('light')
      await loadMyWaveRecommendations({
        settings: state.myWaveSettings,
        persistSettings: false,
        rerender: true,
      })
    }

    document.querySelectorAll('[data-wave-setting][data-wave-value]').forEach((button) => {
      if (button.dataset.bound === '1') return
      button.addEventListener('click', async () => {
        if (!hasSessionToken()) {
          syncMyWaveSettingChips()
          return
        }

        const key = button.getAttribute('data-wave-setting') || ''
        const rawValue = button.getAttribute('data-wave-value') || ''
        const value = rawValue === 'any' ? null : rawValue
        if (!(key in WAVE_SETTING_VALUES)) return
        if (!WAVE_SETTING_VALUES[key].has(rawValue)) return
        if (state.myWaveSettings[key] === value) return
        triggerRuntimeHaptic('selection')

        const nextSettings = normalizeWaveSettings({
          ...state.myWaveSettings,
          [key]: value,
        })
        state.myWaveSettings = nextSettings
        syncMyWaveSettingChips()

        await loadMyWaveRecommendations({
          settings: nextSettings,
          persistSettings: true,
          rerender: true,
        })
      })
      button.dataset.bound = '1'
    })
    wireHomeFilterChips()
    wireHomeTrackRails()

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]')
      if (!t) return
      e.preventDefault()
      const id = t.getAttribute('data-track-id') || ''
      if (t.getAttribute('data-action') === 'play-track') {
        const tr = findTrack(id)
        if (tr) {
          triggerRuntimeHaptic('medium')
          if (page === 'home' && stripRecoPrefix(tr.id) === stripRecoPrefix(state.track?.id)) {
            if (state.playing) pause()
            else resume()
            return
          }
          const mixNode = t.closest('[data-mix-id]')
          const mixId = mixNode?.getAttribute('data-mix-id') || ''
          let list = page === 'home' ? getHomeTrackPool() : getPlaybackListForPage()
          if (page === 'home' && mixId) {
            const activeMode = el.homeFilterChips?.dataset.active || HOME_DEFAULT_MODE
            const mixEntry = (getHomeRecommendationBlocks(activeMode)?.mixes || []).find((m) => m?.id === mixId)
            if (mixEntry) {
              const mixTrackIds = Array.isArray(mixEntry.mixTrackIds) ? mixEntry.mixTrackIds : []
              const mixList = dedupeTracks([
                tr,
                ...mixTrackIds.map((trackId) => findTrack(trackId)).filter(Boolean),
                ...list.filter((item) => item?.artist?.name === tr?.artist?.name),
              ])
              if (mixList.length > 0) {
                list = mixList
              }
            }
          }
          play(tr, mixId ? 'home-mix' : 'list-click', { list })
        }
      }
      if (t.getAttribute('data-action') === 'like-track') {
        const cleanId = stripRecoPrefix(id)
        const willLike = !state.likes.has(cleanId)
        triggerRuntimeHaptic(willLike ? 'like' : 'light')
        toggleLike(id)
      }
    })

    if (audio) {
      audio.onloadedmetadata = () => { state.d = Number.isFinite(audio.duration) ? audio.duration : state.d; syncPlayer() }
      audio.ontimeupdate = () => { state.t = audio.currentTime || 0; touchPlaybackSession(); syncPlayer() }
      audio.onended = () => next('ended')
      audio.onplay = () => { state.playing = true; syncPlayer() }
      audio.onpause = () => { if (state.track?.sourceType !== 'youtube') { state.playing = false; syncPlayer() } }
    }
  }

  function getHomeRecommendationBlocks(mode) {
    return state.homeRecommendationsByMode?.[mode]?.blocks || null
  }

  function hasHomeRecommendationContent(blocks) {
    if (!blocks || typeof blocks !== 'object') return false
    const trackSections = ['bestTracks', 'mixes', 'newReleases', 'genresAndMoods']
    if (trackSections.some((key) => Array.isArray(blocks[key]) && blocks[key].some((item) => item?.track?.id))) {
      return true
    }
    const artistSections = ['favoriteArtists', 'popularArtists']
    return artistSections.some((key) => (
      Array.isArray(blocks[key])
      && blocks[key].some((item) => item?.artist?.id || item?.artist?.name)
    ))
  }

  function hasPersonalHomeRecommendationContent(blocks) {
    if (!blocks || typeof blocks !== 'object') return false
    if (Array.isArray(blocks.favoriteArtists) && blocks.favoriteArtists.some((item) => item?.artist?.id || item?.artist?.name)) {
      return true
    }
    return Array.isArray(blocks.bestTracks)
      && blocks.bestTracks.some(isPersonalHomeRecommendationEntry)
  }

  function getTracksFromRecommendationBlock(items) {
    if (!Array.isArray(items)) return []
    return dedupeTracks(items.map((item) => item?.track).filter((track) => track?.id))
  }

  function runDeferred(task, timeout = 1200) {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const callbackId = window.requestIdleCallback(task, { timeout })
      return () => window.cancelIdleCallback(callbackId)
    }

    const timer = setTimeout(task, Math.min(400, timeout))
    return () => clearTimeout(timer)
  }

  function getHomeBlocksSignature(blocks) {
    if (!blocks || typeof blocks !== 'object') return ''
    const keys = ['newReleases', 'favoriteArtists', 'popularArtists', 'bestTracks', 'mixes', 'genresAndMoods']
    return keys
      .map((key) => {
        const list = Array.isArray(blocks[key]) ? blocks[key] : []
        return `${key}:${list.map((entry) => entry?.track?.id || entry?.artist?.id || entry?.artist?.name || entry?.id || '').join(',')}`
      })
      .join('|')
  }

  function applyHostPlaybackSync(playback) {
    if (!playback || typeof playback !== 'object') return
    if (playback.currentTrack) {
      state.track = playback.currentTrack
    } else if (playback.currentTrack === null) {
      state.track = null
    }
    state.playing = Boolean(playback.isPlaying)
    const waveActive = Boolean(playback.isWaveActive)
    if (waveActive) {
      state.ctx = 'my-wave'
    } else if (state.ctx === 'my-wave') {
      state.ctx = 'manual'
    }
    setHomeWaveActive(Boolean(state.playing && waveActive))
    markRows()
    syncLikes()
  }

  function applyHostHomeSync(payload) {
    if (!payload || typeof payload !== 'object') return
    state.hostSynced = true
    state.homePersonalLoading = Boolean(payload.isPersonalLoading)

    if (Array.isArray(payload.dislikedTrackIds)) {
      state.dislikes = new Set(payload.dislikedTrackIds.map(stripRecoPrefix).filter(Boolean))
    }
    if (Array.isArray(payload.likedTrackIds)) {
      state.likes = new Set(payload.likedTrackIds.map(stripRecoPrefix).filter(Boolean))
    }
    if (Array.isArray(payload.likedTracks)) {
      state.likedTracks = normalizeTrackItems(payload.likedTracks)
    }
    if (Array.isArray(payload.playlists)) {
      state.playlists = payload.playlists
    }

    const incomingTracks = normalizeTrackItems(payload.tracks)
    if (incomingTracks.length) {
      state.tracks = dedupeTracks([...state.tracks, ...incomingTracks])
      state.list = [...state.tracks]
      writeCachedTracks(state.tracks)
    }

    if (Array.isArray(payload.myWave)) {
      state.myWave = filterDislikedWaveItems(payload.myWave)
      if (state.myWave.length) {
        writeCachedMyWaveRecommendations({ items: state.myWave, settings: state.myWaveSettings })
      }
    }

    let blocksChanged = false
    if (payload.homeRecommendations?.blocks) {
      const rec = payload.homeRecommendations
      const mode = rec.mode === 'trends' ? 'trends' : 'for-you'
      const prevBlocks = state.homeRecommendationsByMode?.[mode]?.blocks || null
      const nextBlocks = rec.blocks
      const prevSig = `${state.lastRenderedHomeMode || ''}:${getHomeBlocksSignature(prevBlocks)}`
      const nextSig = `${mode}:${getHomeBlocksSignature(nextBlocks)}`
      blocksChanged = prevSig !== nextSig || !state.lastRenderedHomeHasBlocks

      const nextPayload = { ...rec, blocks: nextBlocks, __cachedAt: Date.now() }
      state.homeRecommendationsByMode[mode] = nextPayload
      state.homeRecommendationsLoadingByMode[mode] = Boolean(state.homePersonalLoading)
      if (!state.homePersonalLoading) {
        writeCachedHomeRecommendations(mode, hasSessionToken(), nextPayload)
      }

      if (
        mode === 'for-you'
        && !state.homePersonalLoading
        && Array.isArray(nextBlocks.favoriteArtists)
        && nextBlocks.favoriteArtists.length
        && (!Array.isArray(nextBlocks.newReleases) || nextBlocks.newReleases.length === 0)
      ) {
        void hydrateMissingHomeNewReleases(nextPayload, mode).then((hydrated) => {
          if (!hydrated?.blocks) return
          if (getHomeBlocksSignature(hydrated.blocks) === getHomeBlocksSignature(state.homeRecommendationsByMode[mode]?.blocks)) {
            return
          }
          state.homeRecommendationsByMode[mode] = { ...hydrated, __cachedAt: Date.now() }
          writeCachedHomeRecommendations(mode, hasSessionToken(), hydrated)
          if (page === 'home') renderHome()
        }).catch(() => null)
      }
    }

    const nextCatalogReady = Boolean(payload.catalogReady)
      || (!state.homePersonalLoading && Boolean(state.tracks.length || state.myWave.length || state.likedTracks.length))
    if (nextCatalogReady !== state.homeCatalogReady) {
      state.homeCatalogReady = nextCatalogReady
      blocksChanged = true
    }

    if (payload.playback && typeof payload.playback === 'object') {
      applyHostPlaybackSync(payload.playback)
    } else {
      syncLikes()
    }

    if (page === 'home' && (blocksChanged || !state.lastRenderedHomeHasBlocks)) {
      const currentMode = el.homeFilterChips?.dataset.active || HOME_DEFAULT_MODE
      state.lastRenderedHomeMode = currentMode
      state.lastRenderedHomeHasBlocks = Boolean(
        hasHomeRecommendationContent(state.homeRecommendationsByMode?.[currentMode]?.blocks),
      )
      renderHome()
    }
    if (page === 'my-wave') renderMyWave()
  }

  ;(async () => {
    wire()
    if (embedMode) {
      window.addEventListener('message', (event) => {
        if (window.location.origin !== 'null' && event.origin !== window.location.origin) {
          return
        }
        const message = event.data
        if (message?.source === 'wavee-host' && message?.type === 'wavee-home-sync') {
          applyHostHomeSync(message.payload)
        } else if (message?.source === 'wavee-host' && message?.type === 'wavee-home-playback') {
          applyHostPlaybackSync(message.payload)
        }
      })
      notifyParent('wavee-home-ready', {})
    }
    const hasSession = Boolean(localStorage.getItem(TOKEN))
    const cachedTracks = readCachedTracks()
    const hydratedReco = hydrateHomeRecommendationsFromCache()
    const hydratedWave = hasSession ? hydrateMyWaveRecommendationsFromCache() : false
    syncMyWaveSettingChips()

    const renderCurrentPage = ({ initial = false } = {}) => {
      if (page === 'home') renderHome()
      if (page === 'my-wave') renderMyWave()
    }

    if (cachedTracks.length) {
      state.tracks = cachedTracks
      state.list = [...cachedTracks]
      state.homeCatalogReady = true
      renderCurrentPage({ initial: true })
      if (state.tracks[0] && !embedMode) {
        setCurrent(state.tracks[0])
        state.d = state.tracks[0].durationSec || 0
        syncPlayer()
      }
    }
    if (!cachedTracks.length || hydratedWave) {
      renderCurrentPage({ initial: true })
    }

    if (hydratedReco && !cachedTracks.length) {
      renderCurrentPage({ initial: true })
    }

    const primaryMode = hasSession
      ? (HOME_DEFAULT_MODE === 'trends' ? 'trends' : 'for-you')
      : 'trends'
    const primaryRecommendationsRequest = fetchHomeRecommendationsMode(primaryMode)

    const catalogFeedRequest = hasSession
      ? api('/catalog/feed?limit=40', { auth: 'optional', timeoutMs: 1_800, retry: false }).catch(() => ({ items: [] }))
      : publicApi('/catalog/feed?limit=40', { timeoutMs: 1_800 }).catch(() => ({ items: [] }))
    const tracksRequest = hasSession
      ? api('/tracks?query=&limit=40&offset=0', { auth: 'optional', timeoutMs: 4_500, retry: false }).catch(() => ({ items: [] }))
      : publicApi('/tracks?query=&limit=40&offset=0', { timeoutMs: 4_500 }).catch(() => ({ items: [] }))

    let [catalogFeed, tracks] = await Promise.all([catalogFeedRequest, tracksRequest])
    if (hasSession && (!Array.isArray(catalogFeed?.items) || catalogFeed.items.length === 0)) {
      catalogFeed = await publicApi('/catalog/feed?limit=40', { timeoutMs: 1_800 }).catch(() => ({ items: [] }))
    }
    if (hasSession && (!Array.isArray(tracks?.items) || tracks.items.length === 0) && (!Array.isArray(catalogFeed?.items) || catalogFeed.items.length === 0)) {
      tracks = await publicApi('/tracks?query=&limit=40&offset=0', { timeoutMs: 4_500 }).catch(() => ({ items: [] }))
    }

    const catalogTracks = normalizeTrackItems(catalogFeed.items)
    const searchTracks = normalizeTrackItems(tracks.items)
    const nextTracks = dedupeTracks([...catalogTracks, ...searchTracks])

    if (nextTracks.length) {
      state.tracks = dedupeTracks([...nextTracks, ...state.tracks])
      writeCachedTracks(state.tracks)
    } else if (!state.tracks.length) {
      state.tracks = []
    }
    state.homeCatalogReady = true
    if (!state.hostSynced && state.tracks.length) {
      const rebuilt = buildLocalHomeRecommendations(primaryMode)
      state.homeRecommendationsByMode[primaryMode] = { ...rebuilt, __cachedAt: Date.now() }
      if (primaryMode === 'for-you' && rebuilt.blocks?.favoriteArtists?.length) {
        void hydrateMissingHomeNewReleases(rebuilt, primaryMode).then((hydrated) => {
          if (!hydrated?.blocks || state.hostSynced) return
          state.homeRecommendationsByMode[primaryMode] = { ...hydrated, __cachedAt: Date.now() }
          if (page === 'home') renderHome()
        }).catch(() => null)
      }
    }

    state.list = [...state.tracks]
    scheduleEmbedScrollReset()
    renderCurrentPage({ initial: true })

    schedulePlaybackPrefetch(state.list.length ? state.list : state.tracks)

    if (state.tracks[0] && !embedMode) {
      setCurrent(state.tracks[0])
      state.d = state.tracks[0].durationSec || 0
      syncPlayer()
    }

    if (hasSession) {
      void Promise.all([
        state.hostSynced ? Promise.resolve(null) : refreshPersonalization({ rerender: false, force: true }),
        primaryRecommendationsRequest,
      ]).then(() => {
        renderCurrentPage({ initial: false })
        syncLikes()
      }).catch(() => {
        state.homeCatalogReady = true
        renderCurrentPage({ initial: false })
      })
    } else {
      void primaryRecommendationsRequest.then(() => {
        if (!state.hostSynced && state.tracks.length) {
          state.homeRecommendationsByMode[primaryMode] = {
            ...buildLocalHomeRecommendations(primaryMode),
            __cachedAt: Date.now(),
          }
        }
        state.homeCatalogReady = true
        if (page === 'home') renderHome()
      }).catch(() => {
        state.homeCatalogReady = true
        if (page === 'home') renderHome()
      })
    }

    const handleVisibilityRefresh = () => {
      if (state.hostSynced) return
      if (document.visibilityState === 'visible') {
        void refreshPersonalization({ rerender: true, force: false })
      }
    }
    const handleFocusRefresh = () => {
      if (state.hostSynced) return
      void refreshPersonalization({ rerender: true, force: false })
    }
    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleVisibilityRefresh)
    window.addEventListener('pagehide', () => {
      endPlaybackSession({ completed: false, contextType: 'pagehide' })
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityRefresh)
    }, { once: true })
  })()
})()




