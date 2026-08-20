// ==UserScript==
// @name        [COMIC] AUTO SCROLL
// @namespace   Violentmonkey Scripts
// @icon        https://comix.to/assets/uploads/35595e3de3c99889c1bd2c56f3e3714fc0c457.png
// @version     1.0.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BCOMIC%5D%20AUTO%20SCROLL.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BCOMIC%5D%20AUTO%20SCROLL.user.js
// @match       https://comix.to/*
// @grant       none
// @author      -
// @description Optimized auto scroll for comic reader
// ==/UserScript==

// ============ CONFIGURATION ============
const CONFIG = {
  PAUSE_DURATION: 500,
  LOAD_TIMEOUT: 15000,
  MIN_SPEED: 1,
  MAX_SPEED: 20,
  DEFAULT_SPEED: 3,
  SPEED_PRESETS: [1, 2, 3, 4, 5, 8, 10, 15, 20],
  CHECK_INTERVAL: 100,
  CONTROLS_CHECK_INTERVAL: 500,
  MAX_CONTROLS_ATTEMPTS: 50,
}

// ============ STATE MANAGEMENT ============
const state = {
  scrolling: false,
  speed: CONFIG.DEFAULT_SPEED,
  animationFrame: null,
  isRestarting: false,
  scrollElement: null,
  scrollStartPosition: 0,
  currentPageHeight: 0,
}

// ============ THEME ============
const blackTheme = {
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
}

// ============ DOM CACHE ============
const DOM = {
  root: document.documentElement,
  autoScrollBtn: null,
  speedDisplay: null,
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
function applyTheme() {
  const entries = Object.entries(blackTheme)
  requestAnimationFrame(() => {
    entries.forEach(([property, value]) => {
      DOM.root.style.setProperty(property, value)
    })
  })
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

function scrollToNextPage() {
  const pages = DOM.pages()
  if (!pages.length || state.currentPageIndex >= pages.length - 1) {
    return false
  }

  const nextPage = pages[state.currentPageIndex + 1]
  if (nextPage) {
    nextPage.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  return false
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
        if (!state.scrolling) {
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
  updateButtonState()

  const el = getScrollElement()
  state.scrollStartPosition = el ? el.scrollTop : window.scrollY

  scrollLoop()
}

function stopAutoScroll() {
  state.scrolling = false
  state.isRestarting = false
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
  updateSpeedDisplay()
}

function cycleSpeed() {
  const currentIndex = CONFIG.SPEED_PRESETS.indexOf(state.speed)
  const nextIndex = (currentIndex + 1) % CONFIG.SPEED_PRESETS.length
  state.speed = CONFIG.SPEED_PRESETS[nextIndex]
  updateSpeedDisplay()
}

// ============ CHAPTER NAVIGATION ============
function goToChapter(direction) {
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
  }

  DOM.autoScrollBtn = document.createElement('button')
  DOM.autoScrollBtn.type = 'button'
  DOM.autoScrollBtn.id = 'autoScrollBtn'
  DOM.autoScrollBtn.className = 'rpage-floatctl__btn'
  DOM.autoScrollBtn.setAttribute('aria-label', 'Start auto scroll (Space)')
  DOM.autoScrollBtn.title = 'Start auto scroll (Space)'
  DOM.autoScrollBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`

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

  DOM.autoScrollBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleAutoScroll()
  })
  DOM.speedDisplay.addEventListener('click', cycleSpeed)

  const settingsBtn = floatCtl.querySelector('[aria-label="Settings"]')
  if (settingsBtn) {
    floatCtl.insertBefore(DOM.speedDisplay, settingsBtn)
    floatCtl.insertBefore(DOM.autoScrollBtn, DOM.speedDisplay)
  } else {
    floatCtl.appendChild(DOM.autoScrollBtn)
    floatCtl.appendChild(DOM.speedDisplay)
  }
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

// ============ INITIALIZATION ============
function init() {
  applyTheme()
  waitForControls()

  const observer = new MutationObserver(
    debounce(() => {
      if (!DOM.autoScrollBtn || !DOM.autoScrollBtn.isConnected) {
        DOM.autoScrollBtn = null
        DOM.speedDisplay = null
        injectUI()
      }
      state.scrollElement = null
    }, 250),
  )

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Auto-fullscreen
  autoFullscreen()
  document.addEventListener('click', autoFullscreen, { once: true })

  console.log(
    'Auto scroll controls integrated. Controls: Space=Start/Stop, +/-=Speed, ←/→=Chapters',
  )
}

// Start the script
init()
