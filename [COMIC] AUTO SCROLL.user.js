// ==UserScript==
// @name        [COMIC] AUTO SCROLL
// @namespace   Violentmonkey Scripts
// @icon        https://comix.to/assets/uploads/35595e3de3c99889c1bd2c56f3e3714fc0c457.png
// @version     2.0.0
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
  LOAD_TIMEOUT: 15000,
  MIN_SPEED: 1,
  MAX_SPEED: 20,
  DEFAULT_SPEED: 3,
  SPEED_PRESETS: [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 31],
  CHECK_INTERVAL: 100,
  CONTROLS_CHECK_INTERVAL: 500,
  MAX_CONTROLS_ATTEMPTS: 50,
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

// ============ STATE MANAGEMENT ============
const state = {
  scrolling: false,
  speed: settings.speed,
  animationFrame: null,
  isRestarting: false,
  scrollElement: null,
  scrollStartPosition: 0,
  currentPageHeight: 0,
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
  pages: () => document.querySelectorAll('.rpage-page'),
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
  const pages = DOM.pages()
  if (!pages.length) return null

  let mostVisiblePage = null
  let maxVisibility = 0
  const viewportHeight = window.innerHeight

  for (let i = 0; i < pages.length; i++) {
    const rect = pages[i].getBoundingClientRect()
    const visibleTop = Math.max(0, rect.top)
    const visibleBottom = Math.min(viewportHeight, rect.bottom)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)

    if (visibleHeight > maxVisibility) {
      maxVisibility = visibleHeight
      mostVisiblePage = pages[i]
    }
  }

  if (mostVisiblePage) {
    state.currentPageHeight = mostVisiblePage.getBoundingClientRect().height
  }

  return mostVisiblePage
}

function hasButtonToClick(page) {
  return page?.querySelector('button, [role="button"]') !== null
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
  if (!page) return true

  const children = page.children
  if (children.length !== 1) return false

  const tagName = children[0].tagName.toLowerCase()
  return tagName === 'img' || tagName === 'canvas'
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
function waitForCurrentPageLoad() {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkPage = () => {
      if (Date.now() - startTime > CONFIG.LOAD_TIMEOUT) {
        resolve(true)
        return
      }

      const currentPage = getCurrentVisiblePage()

      if (isPageFullyLoaded(currentPage)) {
        resolve(true)
        return
      }

      if (hasButtonToClick(currentPage)) {
        clickButtonInPage(currentPage)
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

  if (hasButtonToClick(currentPage)) {
    clickButtonInPage(currentPage)
    await waitForCurrentPageLoad()
    if (!state.scrolling) return
  }

  if (!isPageFullyLoaded(currentPage)) {
    await waitForCurrentPageLoad()
    if (!state.scrolling) return
  }

  const el = getScrollElement()
  const currentPosition = el ? el.scrollTop : window.scrollY

  if (
    Math.abs(currentPosition - state.scrollStartPosition) >=
    state.currentPageHeight
  ) {
    state.scrolling = false
    updateButtonState()
    cancelAnimationFrame(state.animationFrame)

    if (!state.isRestarting) {
      state.isRestarting = true
      setTimeout(() => {
        state.isRestarting = false
        if (!state.scrolling && settings.autoScrollEnabled) {
          state.scrolling = true
          state.scrollStartPosition =
            getScrollElement()?.scrollTop ?? window.scrollY
          updateButtonState()
          scrollLoop()
        }
      }, CONFIG.PAUSE_DURATION)
    }
    return
  }

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
  settings.autoScrollEnabled = true
  saveSettings(settings)
  updateButtonState()

  const el = getScrollElement()
  state.scrollStartPosition = el ? el.scrollTop : window.scrollY

  scrollLoop()
}

function stopAutoScroll() {
  state.scrolling = false
  state.isRestarting = false
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
      await waitForCurrentPageLoad()
    }

    if (!state.scrolling) {
      const el = getScrollElement()
      state.scrollStartPosition = el ? el.scrollTop : window.scrollY
      startAutoScroll()
    }
  }
}

// ============ SPEED CONTROL ============
function changeSpeed(delta) {
  state.speed = Math.max(
    CONFIG.MIN_SPEED,
    Math.min(CONFIG.MAX_SPEED, state.speed + delta),
  )
  settings.speed = state.speed
  saveSettings(settings)
  updateSpeedDisplay()
}

function cycleSpeed() {
  const currentIndex = CONFIG.SPEED_PRESETS.indexOf(state.speed)
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

    // If auto-scroll was enabled, restart it after chapter loads
    if (wasScrolling || settings.autoScrollEnabled) {
      settings.autoScrollEnabled = true
      saveSettings(settings)

      // Wait for new chapter to load
      setTimeout(async () => {
        await waitForCurrentPageLoad()

        // Scroll to top of new chapter
        const el = getScrollElement()
        if (el) {
          el.scrollTop = 0
        } else {
          window.scrollTo(0, 0)
        }

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

  const icon = state.scrolling
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`

  DOM.autoScrollBtn.innerHTML = icon
  const label = state.scrolling
    ? 'Stop auto scroll (Space)'
    : 'Start auto scroll (Space)'
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
  DOM.speedDisplay.title = 'Click to cycle speed (1x-20x) / Use +/- keys'

  // Theme button
  DOM.themeBtn = document.createElement('button')
  DOM.themeBtn.type = 'button'
  DOM.themeBtn.id = 'themeToggleBtn'
  DOM.themeBtn.className = 'rpage-floatctl__btn'
  DOM.themeBtn.setAttribute('aria-label', `Theme: ${settings.theme} (T)`)
  DOM.themeBtn.title = `Theme: ${settings.theme} (T)`

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

  // Insert elements
  const settingsBtn = floatCtl.querySelector('[aria-label="Settings"]')
  if (settingsBtn) {
    floatCtl.insertBefore(DOM.themeBtn, settingsBtn)
    floatCtl.insertBefore(DOM.speedDisplay, DOM.themeBtn)
    floatCtl.insertBefore(DOM.autoScrollBtn, DOM.speedDisplay)
  } else {
    floatCtl.appendChild(DOM.autoScrollBtn)
    floatCtl.appendChild(DOM.speedDisplay)
    floatCtl.appendChild(DOM.themeBtn)
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

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  const scrollPercent = (scrollTop / docHeight) * 100

  console.log(`User scrolled ${scrollPercent}% of the page`)

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
})

// ============ INITIALIZATION ============
function init() {
  applyTheme(settings.theme)
  waitForControls()

  const observer = new MutationObserver(
    debounce(() => {
      if (!DOM.autoScrollBtn || !DOM.autoScrollBtn.isConnected) {
        DOM.autoScrollBtn = null
        DOM.speedDisplay = null
        DOM.themeBtn = null
        injectUI()
      }
      state.scrollElement = null
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
      await waitForCurrentPageLoad()
      startAutoScroll()
    }, 1000)
  }

  console.log(
    `Auto scroll controls integrated. Settings loaded: Speed=${settings.speed}x, Theme=${settings.theme}, AutoFullscreen=${settings.autoFullscreen}, AutoScroll=${settings.autoScrollEnabled}`,
  )
  console.log('Controls: Space=Start/Stop, +/-=Speed, ←/→=Chapters, T=Theme')
}

// Start the script
init()
