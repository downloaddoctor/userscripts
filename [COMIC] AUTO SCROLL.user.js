// ==UserScript==
// @name        [COMIC] AUTO SCROLL
// @namespace   Violentmonkey Scripts
// @icon        https://comix.to/assets/uploads/35595e3de3c99889c1bd2c56f3e3714fc0c457.png
// @version     2.1.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BCOMIC%5D%20AUTO%20SCROLL.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BCOMIC%5D%20AUTO%20SCROLL.user.js
// @match       https://comix.to/*
// @grant       none
// @author      -
// @description Optimized auto scroll for comic reader with persistent settings
// ==/UserScript==

// ============ CONFIGURATION ============
const DEFAULT_CONFIG = {
  PAUSE_DURATION: 500,
  LOAD_TIMEOUT: 10000,
  DEFAULT_SPEED: 3,
  SPEED_PRESETS: [2, 3, 5, 7, 11, 19],
  CHECK_INTERVAL: 100,
  CONTROLS_CHECK_INTERVAL: 500,
  MAX_CONTROLS_ATTEMPTS: 50,
  MANUAL_SCROLL_PAUSE: 800,
}

// ============ PERSISTENT SETTINGS MANAGEMENT ============
const SETTINGS_KEY = 'comicAutoScrollSettings'

function loadSettings() {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY)
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return {
        speed: parsed.speed || DEFAULT_CONFIG.DEFAULT_SPEED,
        autoFullscreen:
          parsed.autoFullscreen !== undefined ? parsed.autoFullscreen : true,
        theme: parsed.theme || 'black',
        autoScrollEnabled: parsed.autoScrollEnabled || false,
        skipStart:
          typeof parsed.skipStart === 'number' ? parsed.skipStart : null,
        skipEnd: typeof parsed.skipEnd === 'number' ? parsed.skipEnd : null,
      }
    }
  } catch (e) {
    console.warn('Failed to load settings:', e)
  }

  return {
    speed: DEFAULT_CONFIG.DEFAULT_SPEED,
    autoFullscreen: true,
    theme: 'black',
    autoScrollEnabled: false,
    skipStart: null,
    skipEnd: null,
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save settings:', e)
  }
}

const settings = loadSettings()
const CONFIG = {
  ...DEFAULT_CONFIG,
  DEFAULT_SPEED: settings.speed,
}

// O(1) speed -> preset-index lookup, built once
const SPEED_PRESET_INDEX = new Map(
  CONFIG.SPEED_PRESETS.map((speed, i) => [speed, i]),
)

// ============ STATE MANAGEMENT ============
const state = {
  scrolling: false,
  speed: settings.speed,
  animationFrame: null,
  isRestarting: false,
  scrollElement: null,
  scrollStartPage: null,
  lastManualScrollTime: 0,
  manualYielding: false,
}

// ============ THEME ============
const themes = {
  black: {
    '--bg': '#000000',
    '--bg-rgb': '0 0 0',
    '--bg-2': '#050505',
    '--bg-2-rgb': '5 5 5',
    '--surface': '#0a0a0a',
    '--surface-rgb': '10 10 10',
    '--surface-2': '#121212',
    '--surface-2-rgb': '18 18 18',
    '--surface-3': '#1a1a1a',
    '--surface-3-rgb': '26 26 26',
  },
  dark: {
    '--bg': '#1a1a1a',
    '--bg-rgb': '26 26 26',
    '--bg-2': '#1f1f1f',
    '--bg-2-rgb': '31 31 31',
    '--surface': '#242424',
    '--surface-rgb': '36 36 36',
    '--surface-2': '#2a2a2a',
    '--surface-2-rgb': '42 42 42',
    '--surface-3': '#333333',
    '--surface-3-rgb': '51 51 51',
  },
  light: {
    '--bg': '#ffffff',
    '--bg-rgb': '255 255 255',
    '--bg-2': '#f5f5f5',
    '--bg-2-rgb': '245 245 245',
    '--surface': '#fafafa',
    '--surface-rgb': '250 250 250',
    '--surface-2': '#f0f0f0',
    '--surface-2-rgb': '240 240 240',
    '--surface-3': '#e0e0e0',
    '--surface-3-rgb': '224 224 224',
  },
}

// ============ DOM CACHE ============
const DOM = {
  root: document.documentElement,
  autoScrollBtn: null,
  speedDisplay: null,
  themeBtn: null,
  skipBtn: null,
  floatCtl: () => document.querySelector('.rpage-floatctl__col'),
}

// ============ UTILITY FUNCTIONS ============
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// ============ THEME APPLICATION ============
function applyTheme(themeName = settings.theme) {
  const theme = themes[themeName] || themes.black
  const entries = Object.entries(theme)

  requestAnimationFrame(() => {
    entries.forEach(([property, value]) => {
      DOM.root.style.setProperty(property, value)
    })
  })

  settings.theme = themeName
  saveSettings(settings)
  updateThemeButton()
}

function cycleTheme() {
  const themeNames = Object.keys(themes)
  const currentIndex = themeNames.indexOf(settings.theme)
  const nextIndex = (currentIndex + 1) % themeNames.length
  const nextTheme = themeNames[nextIndex]

  applyTheme(nextTheme)
  console.log(`Theme changed to: ${nextTheme}`)

  return nextTheme
}

function updateThemeButton() {
  if (!DOM.themeBtn) return

  const themeIcons = {
    black: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 15.5"></path></svg>`,
    dark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    light: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
  }

  DOM.themeBtn.innerHTML = themeIcons[settings.theme] || themeIcons.black
  DOM.themeBtn.title = `Theme: ${settings.theme} (T)`
  DOM.themeBtn.setAttribute('aria-label', `Theme: ${settings.theme} (T)`)
}

// ============ PAGE MANAGEMENT ============
function getCurrentVisiblePage() {
  const el = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 1.1,
  )
  return el?.closest('.rpage-page') ?? null
}

function hasButtonToClick(page) {
  if (!page) return false
  return page.querySelector('button, [role="button"]') !== null
}

function clickButtonInPage(page) {
  const button = page?.querySelector('button, [role="button"]')
  if (button) {
    button.click()
    return true
  }
  return false
}

function isPageFullyLoaded(page) {
  // No page found at viewport center (not yet rendered/mounted): treat as
  // not loaded so the caller waits, instead of skipping the pause entirely
  if (!page) return false

  // Fast path: already confirmed loaded, skip re-checking children
  if (page.dataset.pageLoaded === 'true') return true

  const children = page.children
  if (children.length !== 1) return false

  const tagName = children[0].tagName.toLowerCase()
  const loaded = tagName === 'img' || tagName === 'canvas'

  if (loaded) {
    page.dataset.pageLoaded = 'true'
  }

  return loaded
}

// ============ PAGE SKIP (intro/outro) ============
// Removes pages outside the [skipStart, skipEnd] range from the DOM,
// based on each page's data-page attribute (e.g. <div data-page="12">).
function applyPageSkip() {
  if (settings.skipStart == null && settings.skipEnd == null) return

  const pages = Array.from(
    document.querySelectorAll('.rpage-page[data-page]'),
  ).sort((a, b) => parseInt(a.dataset.page, 10) - parseInt(b.dataset.page, 10))
  if (!pages.length) return

  // Remove pages before skipStart, by literal page number
  if (settings.skipStart != null) {
    pages.forEach((page) => {
      const pageNum = parseInt(page.dataset.page, 10)
      if (!Number.isNaN(pageNum) && pageNum < settings.skipStart) {
        page.remove()
      }
    })
  }

  if (settings.skipEnd != null) {
    const remaining = pages.filter((page) => page.isConnected)

    if (settings.skipEnd < 0) {
      // Negative skipEnd trims the last N pages by position (array[:-N]
      // style), without needing to know the actual last page number.
      const cutoff = remaining.length + settings.skipEnd
      remaining.forEach((page, i) => {
        if (i >= cutoff) page.remove()
      })
    } else {
      remaining.forEach((page) => {
        const pageNum = parseInt(page.dataset.page, 10)
        if (!Number.isNaN(pageNum) && pageNum > settings.skipEnd) {
          page.remove()
        }
      })
    }
  }
}

// Updates the skip button's title/aria-label to reflect the current range.
function updateSkipButtonTitle() {
  if (!DOM.skipBtn) return

  let label = 'Skip intro/outro pages'
  if (settings.skipStart != null || settings.skipEnd != null) {
    const start = settings.skipStart ?? 1
    if (settings.skipEnd == null) {
      label = `Skip pages: keep ${start} to end`
    } else if (settings.skipEnd < 0) {
      const count = -settings.skipEnd
      label = `Skip pages: keep ${start}, except last ${count} page${count === 1 ? '' : 's'}`
    } else {
      label = `Skip pages: keep ${start}-${settings.skipEnd}`
    }
  }

  DOM.skipBtn.title = label
  DOM.skipBtn.setAttribute('aria-label', label)
}

function promptSkipRange() {
  const current =
    settings.skipStart != null || settings.skipEnd != null
      ? `${settings.skipStart ?? ''}:${settings.skipEnd ?? ''}`
      : ''

  const input = window.prompt(
    'Skip intro/outro pages.\n' +
      'Format: "start:end" (like a Python slice), e.g. "3:45".\n' +
      'End can be negative to count from the last page, e.g. "1:-2"\n' +
      '  keeps everything except the last 2 pages.\n' +
      'Or just a start page, e.g. "3", to only skip the intro.\n' +
      'Leave empty to disable.',
    current,
  )

  if (input === null) return // user cancelled

  const trimmed = input.trim()

  if (!trimmed) {
    settings.skipStart = null
    settings.skipEnd = null
    saveSettings(settings)
    return
  }

  const parts = trimmed.split(':').map((s) => s.trim())
  const start = parseInt(parts[0], 10)
  const end = parts.length > 1 ? parseInt(parts[1], 10) : NaN

  if (Number.isNaN(start)) {
    window.alert('Invalid page number.')
    return
  }

  settings.skipStart = start
  settings.skipEnd = Number.isNaN(end) ? null : end
  saveSettings(settings)
  applyPageSkip()
  updateSkipButtonTitle()
}

// ============ SCROLL MANAGEMENT ============
function getScrollElement() {
  if (state.scrollElement && state.scrollElement.isConnected) {
    return state.scrollElement
  }

  const fullscreen = document.fullscreenElement
  if (fullscreen?.scrollHeight > fullscreen?.clientHeight) {
    state.scrollElement = fullscreen
    return fullscreen
  }

  let el = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  )

  while (el && el !== document.body) {
    const style = getComputedStyle(el)
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      state.scrollElement = el
      return el
    }
    el = el.parentElement
  }

  state.scrollElement = document.scrollingElement || document.documentElement
  return state.scrollElement
}

// ============ PAGE LOAD WAITING ============
function waitForCurrentPageLoad(page) {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkPage = () => {
      // User scrolled away from `page` mid-wait: stop chasing a stale
      // target and let the caller re-resolve the now-visible page.
      if (state.lastManualScrollTime > startTime) {
        resolve(false)
        return
      }

      if (Date.now() - startTime > CONFIG.LOAD_TIMEOUT) {
        resolve(false)
        return
      }

      if (isPageFullyLoaded(page)) {
        resolve(true)
        return
      }

      if (hasButtonToClick(page)) {
        clickButtonInPage(page)
      }

      setTimeout(checkPage, CONFIG.CHECK_INTERVAL)
    }

    checkPage()
  })
}

// ============ AUTO SCROLL ============
async function scrollLoop() {
  if (!state.scrolling) return

  const currentPage = getCurrentVisiblePage()

  // If we can't identify a page under the viewport point (e.g. between
  // pages, momentarily blank), don't block waiting for a page that isn't
  // there — just keep scrolling and try again next frame.
  if (currentPage) {
    if (hasButtonToClick(currentPage)) {
      clickButtonInPage(currentPage)
      await waitForCurrentPageLoad(currentPage)
      if (!state.scrolling) return
    }

    if (!isPageFullyLoaded(currentPage)) {
      await waitForCurrentPageLoad(currentPage)
      if (!state.scrolling) return
    }
  }

  // Establish the baseline page for this scroll leg (first frame after a
  // (re)start), so the boundary check below has something to compare against
  if (!state.scrollStartPage) {
    state.scrollStartPage = currentPage
  }

  // User is actively scrolling manually: yield to them instead of fighting
  // for scroll position.
  if (Date.now() - state.lastManualScrollTime < CONFIG.MANUAL_SCROLL_PAUSE) {
    if (!state.manualYielding) {
      state.manualYielding = true
      updateButtonState()
    }
    state.animationFrame = requestAnimationFrame(scrollLoop)
    return
  }

  if (state.manualYielding) {
    state.manualYielding = false
    updateButtonState()
  }

  // DOM-boundary check: the page centered in the viewport is no longer the
  // page we started this leg on — we've genuinely crossed into the next page
  if (
    currentPage &&
    state.scrollStartPage &&
    currentPage !== state.scrollStartPage
  ) {
    state.scrolling = false
    state.scrollStartPage = null // re-established on resume
    cancelAnimationFrame(state.animationFrame)

    if (!state.isRestarting) {
      state.isRestarting = true
      updateButtonState()
      setTimeout(() => {
        state.isRestarting = false
        if (!state.scrolling && settings.autoScrollEnabled) {
          state.scrolling = true
          updateButtonState()
          scrollLoop()
        }
      }, CONFIG.PAUSE_DURATION)
    }
    return
  }

  const el = getScrollElement()
  if (el) {
    el.scrollTop += state.speed
  } else {
    window.scrollBy(0, state.speed)
  }

  state.animationFrame = requestAnimationFrame(scrollLoop)
}

function startAutoScroll() {
  if (state.scrolling) return

  state.scrolling = true
  state.scrollStartPage = null
  settings.autoScrollEnabled = true
  saveSettings(settings)
  updateButtonState()

  scrollLoop()
}

function stopAutoScroll() {
  state.scrolling = false
  state.isRestarting = false
  state.manualYielding = false
  settings.autoScrollEnabled = false
  saveSettings(settings)
  updateButtonState()
  cancelAnimationFrame(state.animationFrame)
}

async function toggleAutoScroll() {
  if (state.isRestarting) {
    state.isRestarting = false
  }

  if (state.scrolling) {
    stopAutoScroll()
  } else {
    const currentPage = getCurrentVisiblePage()

    if (hasButtonToClick(currentPage)) {
      clickButtonInPage(currentPage)
    }

    if (!isPageFullyLoaded(currentPage)) {
      await waitForCurrentPageLoad(currentPage)
    }

    if (!state.scrolling) {
      startAutoScroll()
    }
  }
}

// ============ SPEED CONTROL ============
function changeSpeed(direction) {
  const presets = CONFIG.SPEED_PRESETS
  const currentIndex = SPEED_PRESET_INDEX.get(state.speed)
  let nextIndex

  if (currentIndex === undefined) {
    // Not on a preset (legacy/custom value): snap to nearest preset first
    nextIndex = presets.reduce(
      (closest, val, i) =>
        Math.abs(val - state.speed) < Math.abs(presets[closest] - state.speed)
          ? i
          : closest,
      0,
    )
  } else {
    nextIndex = Math.max(
      0,
      Math.min(presets.length - 1, currentIndex + direction),
    )
  }

  state.speed = presets[nextIndex]
  settings.speed = state.speed
  saveSettings(settings)
  updateSpeedDisplay()
}

function cycleSpeed() {
  const currentIndex = SPEED_PRESET_INDEX.get(state.speed) ?? -1
  const nextIndex = (currentIndex + 1) % CONFIG.SPEED_PRESETS.length
  state.speed = CONFIG.SPEED_PRESETS[nextIndex]
  settings.speed = state.speed
  saveSettings(settings)
  updateSpeedDisplay()
}

// ============ CHAPTER NAVIGATION ============
function goToChapter(direction) {
  const wasScrolling = state.scrolling

  if (state.scrolling) {
    stopAutoScroll()
  }

  const buttons = document.querySelectorAll('.rpage-floatctl__btn')
  const label = direction === 'prev' ? 'Previous chapter' : 'Next chapter'

  const targetButton = Array.from(buttons).find(
    (btn) => btn.getAttribute('aria-label') === label || btn.title === label,
  )

  if (targetButton) {
    targetButton.click()
    state.scrollElement = null // new chapter may swap the scroll container

    // If auto-scroll was enabled, restart it after chapter loads
    if (wasScrolling || settings.autoScrollEnabled) {
      settings.autoScrollEnabled = true
      saveSettings(settings)

      // Wait for new chapter to load
      setTimeout(async () => {
        applyPageSkip()

        // Start auto-scroll if it was enabled
        if (settings.autoScrollEnabled && !state.scrolling) {
          startAutoScroll()
        }
      }, 1000) // Wait for chapter transition
    }
  }
}

// ============ UI UPDATES ============
function updateButtonState() {
  if (!DOM.autoScrollBtn) return

  const icons = {
    // Play triangle: idle, user stopped auto-scroll
    idle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    // Pause bars: actively auto-scrolling
    scrolling: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
    // Clock: paused at page end, about to resume
    pageEndPause: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline></svg>`,
    // Stacked chevrons: yielding because the user is scrolling manually
    manualYield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline><polyline points="6 15 12 21 18 15"></polyline></svg>`,
  }

  let iconKey
  let label

  if (state.scrolling) {
    if (state.manualYielding) {
      iconKey = 'manualYield'
      label = 'Paused — manual scroll detected'
    } else {
      iconKey = 'scrolling'
      label = 'Stop auto scroll (Space)'
    }
  } else if (state.isRestarting) {
    iconKey = 'pageEndPause'
    label = 'Paused at page end, resuming shortly…'
  } else {
    iconKey = 'idle'
    label = 'Start auto scroll (Space)'
  }

  DOM.autoScrollBtn.innerHTML = icons[iconKey]
  DOM.autoScrollBtn.setAttribute('aria-label', label)
  DOM.autoScrollBtn.title = label
}

function updateSpeedDisplay() {
  if (DOM.speedDisplay) {
    DOM.speedDisplay.textContent = `${state.speed}x`
  }
}

// ============ UI INJECTION ============
function injectUI() {
  const floatCtl = DOM.floatCtl()
  if (!floatCtl || (DOM.autoScrollBtn && DOM.autoScrollBtn.isConnected)) return

  if (DOM.autoScrollBtn && !DOM.autoScrollBtn.isConnected) {
    DOM.autoScrollBtn = null
    DOM.speedDisplay = null
    DOM.themeBtn = null
    DOM.skipBtn = null
  }

  // Auto-scroll button
  DOM.autoScrollBtn = document.createElement('button')
  DOM.autoScrollBtn.type = 'button'
  DOM.autoScrollBtn.id = 'autoScrollBtn'
  DOM.autoScrollBtn.className = 'rpage-floatctl__btn'
  DOM.autoScrollBtn.setAttribute('aria-label', 'Start auto scroll (Space)')
  DOM.autoScrollBtn.title = 'Start auto scroll (Space)'
  DOM.autoScrollBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`

  // Speed display
  DOM.speedDisplay = document.createElement('span')
  DOM.speedDisplay.id = 'autoScrollSpeed'
  DOM.speedDisplay.className = 'mono'
  DOM.speedDisplay.style.cssText = `
            font-size: 11px;
            color: inherit;
            padding: 0 4px;
            user-select: none;
            cursor: pointer;
            min-width: 30px;
            text-align: center;
        `
  DOM.speedDisplay.textContent = `${state.speed}x`
  const minSpeed = CONFIG.SPEED_PRESETS[0]
  const maxSpeed = CONFIG.SPEED_PRESETS[CONFIG.SPEED_PRESETS.length - 1]
  DOM.speedDisplay.title = `Click to cycle speed (${minSpeed}x-${maxSpeed}x) / Use +/- keys`

  // Theme button
  DOM.themeBtn = document.createElement('button')
  DOM.themeBtn.type = 'button'
  DOM.themeBtn.id = 'themeToggleBtn'
  DOM.themeBtn.className = 'rpage-floatctl__btn'
  DOM.themeBtn.setAttribute('aria-label', `Theme: ${settings.theme} (T)`)
  DOM.themeBtn.title = `Theme: ${settings.theme} (T)`

  // Skip intro/outro button
  DOM.skipBtn = document.createElement('button')
  DOM.skipBtn.type = 'button'
  DOM.skipBtn.id = 'skipRangeBtn'
  DOM.skipBtn.className = 'rpage-floatctl__btn'
  DOM.skipBtn.setAttribute('aria-label', 'Skip intro/outro pages')
  DOM.skipBtn.title = 'Skip intro/outro pages'
  DOM.skipBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`
  updateSkipButtonTitle()

  // Event listeners
  DOM.autoScrollBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleAutoScroll()
  })

  DOM.speedDisplay.addEventListener('click', cycleSpeed)

  DOM.themeBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    cycleTheme()
  })

  DOM.skipBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    promptSkipRange()
  })

  // Insert elements
  const settingsBtn = floatCtl.querySelector('[aria-label="Settings"]')
  if (settingsBtn) {
    floatCtl.insertBefore(DOM.skipBtn, settingsBtn)
    floatCtl.insertBefore(DOM.themeBtn, DOM.skipBtn)
    floatCtl.insertBefore(DOM.speedDisplay, DOM.themeBtn)
    floatCtl.insertBefore(DOM.autoScrollBtn, DOM.speedDisplay)
  } else {
    floatCtl.appendChild(DOM.autoScrollBtn)
    floatCtl.appendChild(DOM.speedDisplay)
    floatCtl.appendChild(DOM.themeBtn)
    floatCtl.appendChild(DOM.skipBtn)
  }

  // Update UI to reflect current state
  updateButtonState()
  updateSpeedDisplay()
  updateThemeButton()
}

// ============ CONTROLS WAITING ============
function waitForControls() {
  let attempts = 0

  const checkForControls = () => {
    const floatCtl = DOM.floatCtl()
    attempts++

    if (floatCtl) {
      injectUI()
    } else if (attempts < CONFIG.MAX_CONTROLS_ATTEMPTS) {
      setTimeout(checkForControls, CONFIG.CONTROLS_CHECK_INTERVAL)
    }
  }

  checkForControls()
}

// ============ FULLSCREEN ============
function autoFullscreen() {
  if (!settings.autoFullscreen) return

  if (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  ) {
    return
  }

  const element = document.documentElement

  if (element.requestFullscreen) {
    element.requestFullscreen().catch(() => {})
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen()
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen()
  }
}

// Detect manual scroll intent (wheel/touch) so scrollLoop yields to the
// user instead of overwriting their scroll position every frame.
document.addEventListener(
  'wheel',
  () => {
    state.lastManualScrollTime = Date.now()
  },
  { passive: true, capture: true },
)
document.addEventListener(
  'touchstart',
  () => {
    state.lastManualScrollTime = Date.now()
  },
  { passive: true, capture: true },
)
document.addEventListener(
  'touchmove',
  () => {
    state.lastManualScrollTime = Date.now()
  },
  { passive: true, capture: true },
)

// Fullscreen entering/exiting changes which element owns the scrollbar
document.addEventListener('fullscreenchange', () => {
  state.scrollElement = null
})

// ============ EVENT HANDLERS ============
document.addEventListener(
  'keydown',
  (e) => {
    // Ignore if user is typing
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      return
    }

    switch (e.key) {
      case ' ':
      case 'Spacebar':
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        toggleAutoScroll()
        autoFullscreen()
        break
      case '+':
      case '=':
        e.preventDefault()
        changeSpeed(1)
        break
      case '-':
      case '_':
        e.preventDefault()
        changeSpeed(-1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        goToChapter('prev')
        break
      case 'ArrowRight':
        e.preventDefault()
        goToChapter('next')
        break
      case 'ArrowUp':
      case 'ArrowDown':
        // Let the browser perform its native scroll; just mark manual
        // intent so scrollLoop() yields instead of overwriting it
        state.lastManualScrollTime = Date.now()
        break
      case 't':
      case 'T':
        if (e.ctrlKey || e.metaKey) break // Allow browser shortcuts
        e.preventDefault()
        cycleTheme()
        break
    }
  },
  true,
) // Use capture phase

// Prevent space keyup default behavior
window.addEventListener(
  'keyup',
  (e) => {
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }
  },
  true,
)

// ============ SCROLL PROGRESS ============
let nextChapterTriggered = false

// Capture phase catches 'scroll' events from nested scroll containers too
// (scroll events on non-window elements don't bubble, only capture)
document.addEventListener(
  'scroll',
  () => {
    const el = getScrollElement()
    const usesWindow =
      el === document.documentElement || el === document.scrollingElement

    const scrollTop = usesWindow ? window.scrollY : el.scrollTop
    const scrollHeight = usesWindow
      ? document.documentElement.scrollHeight
      : el.scrollHeight
    const clientHeight = usesWindow ? window.innerHeight : el.clientHeight
    const docHeight = scrollHeight - clientHeight
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0

    const progressBar = document.getElementById('progress-bar')
    if (progressBar) {
      progressBar.style.width = scrollPercent + '%'
    }

    if (scrollPercent >= 100) {
      if (!nextChapterTriggered) {
        nextChapterTriggered = true
        goToChapter('next')
      }
    } else {
      nextChapterTriggered = false
    }
  },
  true,
)

// ============ INITIALIZATION ============
function init() {
  applyTheme(settings.theme)
  waitForControls()
  applyPageSkip()

  const observer = new MutationObserver(
    debounce(() => {
      applyPageSkip()

      if (!DOM.autoScrollBtn || !DOM.autoScrollBtn.isConnected) {
        DOM.autoScrollBtn = null
        DOM.speedDisplay = null
        DOM.themeBtn = null
        DOM.skipBtn = null
        injectUI()
      }
    }, 250),
  )

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Auto-fullscreen if enabled
  if (settings.autoFullscreen) {
    autoFullscreen()
    document.addEventListener('click', autoFullscreen, { once: true })
  }

  // Restore auto-scroll state if it was enabled
  if (settings.autoScrollEnabled && !state.scrolling) {
    // Wait for page to load before starting auto-scroll
    setTimeout(async () => {
      await waitForCurrentPageLoad(getCurrentVisiblePage())
      startAutoScroll()
    }, 3000)
  }

  console.log(
    `Auto scroll controls integrated. Settings loaded: Speed=${settings.speed}x, Theme=${settings.theme}, AutoFullscreen=${settings.autoFullscreen}, AutoScroll=${settings.autoScrollEnabled}`,
  )
  console.log('Controls: Space=Start/Stop, +/-=Speed, ←/→=Chapters, T=Theme')
}

// Start the script
init()
