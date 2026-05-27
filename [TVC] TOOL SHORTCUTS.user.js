// ==UserScript==
// @name        [TVC] TOOL SHORTCUTS
// @namespace   Violentmonkey Scripts
// @icon        https://static.tradingview.com/static/images/favicon.ico
// @version     2.0.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BTVC%5D%20TOOL%20SHORTCUTS.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BTVC%5D%20TOOL%20SHORTCUTS.user.js
//
// @match       https://*.tradingview.com/*
// @grant       none
//
// @author      -
// @description Dark theme, font customization, and keyboard shortcuts for TradingView chart tools
// ==/UserScript==

// ==================== CONFIGURATION ====================

const CONFIG = {
  theme: {
    '--color-cold-gray-900': '#000000',
    '--color-cold-gray-850': '#080808',
    '--color-cold-gray-800': '#0f0f0f',
  },
  font: {
    family: 'Fira Code Retina',
    size: '11.62px',
    weight: '500',
    features: '"liga" 1, "calt" 1',
    importUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap',
  },
}

// ==================== STYLES ====================

function injectStyles() {
  if (document.getElementById('tvc-styles')) return

  const style = document.createElement('style')
  style.id = 'tvc-styles'
  style.textContent = `
    /* === Font import === */
    @import url('${CONFIG.font.importUrl}');

    /* === Font override === */
    [role="presentation"]:not(.tvc-code-font) {
      font-family: '${CONFIG.font.family}', monospace !important;
      font-weight: ${CONFIG.font.weight} !important;
      font-size: ${CONFIG.font.size} !important;
      font-feature-settings: ${CONFIG.font.features} !important;
    }

    /* === Help panel === */
    .tvc-help-overlay {
      position: fixed;
      inset: 0;
      z-index: 99998;
      background: rgba(0,0,0,0.4);
      display: none;
    }
    .tvc-help-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      background: #000000;
      border: 1px solid #363c4e;
      border-radius: 8px;
      padding: 20px 24px;
      min-width: 420px;
      max-width: 480px;
      color: #d1d4dc;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: none;
      line-height: 1.7;
    }
    .tvc-help-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #e0e3eb;
      padding-bottom: 12px;
      border-bottom: 1px solid #363c4e;
    }
    .tvc-help-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 3px 0;
    }
    .tvc-help-row--gap {
      padding: 1px 0;
    }
    .tvc-help-keys {
      min-width: 185px;
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .tvc-help-desc {
      color: #9598a1;
    }
    .tvc-kbd {
      display: inline-block;
      padding: 2px 7px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif;
      font-weight: 500;
      color: #e0e3eb;
      background: #2a2e39;
      border: 1px solid #4a4f5e;
      border-bottom: 2px solid #5a6070;
      border-radius: 3px;
      line-height: 1.5;
      white-space: nowrap;
    }
    .tvc-kbd--action {
      color: #5b9bd5;
      background: #1c2840;
      border-color: #2a4a6e;
      border-bottom-color: #3a5a8e;
    }
    .tvc-kbd--danger {
      color: #ef5350;
      background: #2a1a1a;
      border-color: #5a3030;
      border-bottom-color: #7a4040;
    }
    .tvc-kbd-plus {
      color: #5a5e6a;
      font-size: 11px;
      font-weight: 400;
    }
    .tvc-help-hint {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #2a2e39;
      font-size: 11px;
      color: #5a5e6a;
    }
  `
  document.head.appendChild(style)
}

// ==================== THEME ====================

function applyTheme() {
  const root = document.documentElement
  for (const [key, value] of Object.entries(CONFIG.theme)) {
    root.style.setProperty(key, value)
  }
}

// ==================== HELP PANEL ====================

let helpPanel = null
let helpOverlay = null

function kbd(text, cls = '') {
  const el = document.createElement('span')
  el.className = 'tvc-kbd' + (cls ? ' ' + cls : '')
  el.textContent = text
  return el
}

function createHelpPanel() {
  if (helpPanel) return

  // Overlay
  helpOverlay = document.createElement('div')
  helpOverlay.className = 'tvc-help-overlay'
  document.body.appendChild(helpOverlay)

  // Panel
  helpPanel = document.createElement('div')
  helpPanel.className = 'tvc-help-panel'

  const title = document.createElement('div')
  title.className = 'tvc-help-title'
  title.textContent = 'TradingView \u2014 Shortcuts'
  helpPanel.appendChild(title)

  const rows = [
    {
      keys: [kbd('Ctrl'), kbd('/', 'tvc-kbd--action')],
      desc: 'Show this panel',
    },
    { gap: true },
    {
      keys: [kbd('Ctrl'), kbd('Z')],
      desc: 'Undo',
    },
    {
      keys: [kbd('Ctrl'), kbd('Y')],
      desc: 'Redo',
    },
    { gap: true },
    {
      keys: [kbd('Ctrl'), kbd('A')],
      desc: 'Select all drawings',
    },
    {
      keys: [kbd('Ctrl'), kbd('Shift'), kbd('A')],
      desc: 'Select all locked drawings',
    },
    {
      keys: [kbd('Ctrl'), kbd('L')],
      desc: 'Toggle lock on selected',
    },
    {
      keys: [kbd('Ctrl'), kbd('Backspace', 'tvc-kbd--danger')],
      desc: 'Remove all drawings',
    },
    { gap: true },
    {
      keys: [kbd('\u2190'), kbd('\u2192')],
      desc: 'Switch interval',
      sep: '/',
    },
    {
      keys: [kbd('Alt'), kbd('1,2...9')],
      desc: 'Select favorite tool (1,2...9)',
    },
    {
      keys: [kbd('Ctrl'), kbd('1,2...9')],
      desc: 'Apply template (1,2...9)',
    },
    {
      keys: [kbd('Ctrl'), kbd('Alt'), kbd('S')],
      desc: 'Take snapshot',
    },
  ]

  for (const row of rows) {
    const rowEl = document.createElement('div')
    rowEl.className = row.gap
      ? 'tvc-help-row tvc-help-row--gap'
      : 'tvc-help-row'

    const keysEl = document.createElement('div')
    keysEl.className = 'tvc-help-keys'
    if (row.keys) {
      const sep = row.sep || '+'
      for (let i = 0; i < row.keys.length; i++) {
        keysEl.appendChild(row.keys[i])
        if (i < row.keys.length - 1) {
          const sepEl = document.createElement('span')
          sepEl.className = 'tvc-kbd-plus'
          sepEl.textContent = ' ' + sep + ' '
          keysEl.appendChild(sepEl)
        }
      }
    }

    const descEl = document.createElement('span')
    descEl.className = 'tvc-help-desc'
    descEl.textContent = row.desc || ''

    rowEl.appendChild(keysEl)
    rowEl.appendChild(descEl)
    helpPanel.appendChild(rowEl)
  }

  const hint = document.createElement('div')
  hint.className = 'tvc-help-hint'
  hint.textContent = 'Press Esc or click outside to close'
  helpPanel.appendChild(hint)

  document.body.appendChild(helpPanel)
}

function showHelpPanel() {
  createHelpPanel()
  helpPanel.style.display = 'block'
  helpOverlay.style.display = 'block'
}

function hideHelpPanel() {
  if (helpPanel) helpPanel.style.display = 'none'
  if (helpOverlay) helpOverlay.style.display = 'none'
}

// ==================== UTILITIES ====================

function waitForElement(selector, root = document) {
  return new Promise((resolve) => {
    const el = root.querySelector(selector)
    if (el) return resolve(el)

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })
    observer.observe(root, { childList: true, subtree: true })
  })
}

// ==================== SHORTCUT HANDLERS ====================

function undo(e) {
  e.preventDefault()
  const btns = document.querySelectorAll(
    "[id='header-toolbar-undo-redo'] button",
  )
  if (btns[0]) btns[0].click()
}

function redo(e) {
  e.preventDefault()
  const btns = document.querySelectorAll(
    "[id='header-toolbar-undo-redo'] button",
  )
  if (btns[1]) btns[1].click()
}

function removeAllDrawings() {
  document.querySelector("[data-name='removeAllDrawingTools'] button")?.click()
  document.querySelector("[data-name='remove-drawing-tools']")?.click()
}

function toggleLock() {
  const lockEl = document.querySelector("[data-name='lock']")
  const unlockEl = document.querySelector("[data-name='unlock']")
  if (lockEl) lockEl.click()
  else if (unlockEl) unlockEl.click()
}

async function takeSnap(e) {
  e.preventDefault()
  const snapBtns = document.querySelectorAll("[data-tooltip='Take a snapshot']")
  if (snapBtns[2]) snapBtns[2].click()

  const saveBtn = await waitForElement("[data-name='save-chart-image']")
  saveBtn.click()
}

function selectTool(index) {
  const tools = document.querySelectorAll(
    '.tv-favorited-drawings-toolbar__widget',
  )
  if (tools[index]) tools[index].click()
}

async function selectTemplate(index) {
  try {
    const templateBtn = document.querySelector("[data-name='templates']")
    if (!templateBtn) return
    templateBtn.click()

    await waitForElement("[data-qa-id='menu-inner']")

    const templates = document.querySelectorAll("[data-name='remove-button']")
    if (templates[index]) {
      templates[index].parentElement.parentElement.click()
    } else {
      templateBtn.click()
    }
  } catch (err) {
    // menu closed or no templates
  }
}

function selectInterval(direction) {
  try {
    const container = document.querySelector('#header-toolbar-intervals')
    if (!container) return

    const btns = [...container.firstChild.querySelectorAll('button')]
    const active = container.querySelector('button[aria-checked="true"]')
    const idx = btns.indexOf(active)
    if (idx === -1) return

    const next = btns[idx + direction]
    if (next) next.click()
  } catch (err) {
    // interval toolbar not found
  }
}

async function selectAll(e) {
  const treeBtn = document.querySelector("[data-name='object_tree']")
  if (!treeBtn) return

  treeBtn.click()

  const parentDiv = await waitForElement(
    "body [data-name='tree'] [class*='listContainer'] > div",
  )

  const items = Array.from(parentDiv.children)
    .slice(0, -1)
    .reverse()
    .slice(0, -1)
    .map((child) => {
      const el = child.children[0]
      return {
        el,
        isLock: !el.querySelector("[data-name='lock'][data-active='false']"),
        isObject:
          el.querySelector("[class*='rightButtons']")?.children.length === 3,
      }
    })
    .filter((item) => item.isObject)

  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const createClick = (modKey = false) =>
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      [isMac ? 'metaKey' : 'ctrlKey']: modKey,
    })

  let firstClick = true
  for (const { el, isLock } of items) {
    const shouldClick = e.shiftKey ? isLock : !isLock
    if (shouldClick) {
      el.dispatchEvent(createClick(!firstClick))
      firstClick = false
    }
  }

  treeBtn.click()
}

// ==================== KEYBOARD BINDING ====================

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs or pine editor
    if (
      e.target.closest(
        '#pine-editor-dialog, input, textarea, [contenteditable]',
      )
    )
      return

    // Help panel
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault()
      if (helpPanel && helpPanel.style.display === 'block') {
        hideHelpPanel()
      } else {
        showHelpPanel()
      }
      return
    }

    if (e.ctrlKey) {
      switch (e.key) {
        case 'Backspace':
          e.preventDefault()
          removeAllDrawings()
          break
        case 'l':
        case 'L':
          e.preventDefault()
          toggleLock()
          break
        case 'a':
        case 'A':
          e.preventDefault()
          selectAll(e)
          break
        case 'z':
        case 'Z':
          if (e.altKey) break
          e.preventDefault()
          undo(e)
          break
        case 'y':
        case 'Y':
          if (e.altKey) break
          e.preventDefault()
          redo(e)
          break
        default:
          if (isFinite(e.key)) {
            if (e.altKey) {
              e.preventDefault()
              takeSnap(e)
            } else {
              e.preventDefault()
              selectTemplate(Number(e.key) - 1)
            }
          }
      }
      return
    }

    if (e.altKey) {
      if (isFinite(e.key)) {
        e.preventDefault()
        selectTool(Number(e.key) - 1)
      }
      return
    }

    // Arrow keys for interval
    if (e.key === 'ArrowLeft') {
      selectInterval(-1)
    } else if (e.key === 'ArrowRight') {
      selectInterval(1)
    }
  })
}

// ==================== DISMISS HELP ====================

function bindHelpDismiss() {
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      helpPanel &&
      helpPanel.style.display === 'block'
    ) {
      hideHelpPanel()
    }
  })

  document.addEventListener('click', (e) => {
    if (
      helpOverlay &&
      helpOverlay.style.display === 'block' &&
      e.target === helpOverlay
    ) {
      hideHelpPanel()
    }
  })
}

// ==================== PRIVACY ====================

function disableTracking() {
  try {
    window.TradingViewApi?.disableTrackingEvents?.()
  } catch (err) {
    // API not available
  }
}

// ==================== AD BLOCK ====================

function hideAds() {
  new MutationObserver(() => {
    const ad = document.querySelector('#charting-ad')
    if (ad) ad.style.display = 'none'
  }).observe(document.body, { childList: true, subtree: true })
}

// ==================== INIT ====================

function init() {
  injectStyles()
  applyTheme()
  disableTracking()
  hideAds()
  bindKeyboardShortcuts()
  bindHelpDismiss()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
