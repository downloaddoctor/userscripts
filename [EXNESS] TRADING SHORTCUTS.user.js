// ==UserScript==
// @name        [EXNESS] TRADING SHORTCUTS
// @namespace   Violentmonkey Scripts
// @icon        https://my.exness.com/cnf/favicon.ico
// @version     3.1.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BEXNESS%5D%20TRADING%20SHORTCUTS.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BEXNESS%5D%20TRADING%20SHORTCUTS.user.js
// @match       https://my.exness.com/webtrading/*
// @grant       none
// @author      -
// @description Quick trade mode with keyboard shortcuts for Exness terminal
// ==/UserScript==

// ==================== CONFIGURATION ====================

const CONFIG = {
  // [button label, search term]
  symbols: [
    ['BTC', 'BITCOIN VS US DOLLAR'],
    ['XAU/USD', 'XAU/USD'],
    ['ETH', 'ETH'],
  ],
  theme: {
    '--c-background-default': '#000000',
    '--c-background-elevationL': '#0a0a0a',
    '--c-background-elevationM': '#070707',
    '--c-background-elevationS': '#050505',
    '--c-background-paper': '#030303',
    '--c-background-tooltip-default': '#050505',
    '--c-background-oncolor': '#ffffff10',
    '--c-background-onpaper': '#ffffff10',
    '--c-background-tooltip-invert': '#ffffff',
    '--c-background-disabledBackground': '#ffffff20',
    '--c-background-matteGlass': '#000000ee',
  },
}

const SELECTORS = {
  accountBtn: "[class*='account-button_wrapper_']",
  header: "[class*='AppHeaderDesktop_header']",
  footer: '#footerContainer',
  tradingPage: '#tradingPage',
  buy: 'button[data-test="order-button-buy"]',
  sell: 'button[data-test="order-button-sell"]',
  closeAllPositions: 'button[data-test="close-all-footer-button"]',
  chartIframe: '#tv_chart_container iframe',

  iframe: {
    buy: 'button.chartOrderButtonsOrderButton.buy',
    sell: 'button.chartOrderButtonsOrderButton.sell',
    closePosition: '.chartPLCloseButton',
    changeSymbol: 'button[aria-label="Change symbol"]',
    searchBox: 'input[data-role="search"]',
    intervalGroup: 'div[role="radiogroup"]',
    fullscreen: '#chart-fullScreen-settings-button',
  },

  confirm: {
    entry: 'button[data-test="order-panel-confirmation"]',
    modify:
      '#tradingPage [data-test="order-modify-desktop-apply-button"] button',
    closeAll: 'button[data-test="closeAll-button-closeAll-popup"]',
  },
}

// ==================== UTILITIES ====================

function waitForElement(selector, timeout = 30_000, root = document) {
  return new Promise((resolve, reject) => {
    const el = root.querySelector(selector)
    if (el) return resolve(el)

    const observer = new MutationObserver((_, obs) => {
      const el = root.querySelector(selector)
      if (el) {
        obs.disconnect()
        resolve(el)
      }
    })
    observer.observe(root, { childList: true, subtree: true })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`"${selector}" not found within ${timeout}ms`))
    }, timeout)
  })
}

function waitUntil(fn, interval = 100, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      try {
        const result = fn()
        if (result) return resolve(result)
        if (Date.now() - start >= timeout) return reject(new Error('Timeout'))
        setTimeout(check, interval)
      } catch (err) {
        reject(err)
      }
    }
    check()
  })
}

// ==================== THEME ====================

function applyTheme(root) {
  if (!root || root.dataset.themeApplied === 'true') return
  for (const [key, value] of Object.entries(CONFIG.theme)) {
    root.style.setProperty(key, value)
  }
  root.dataset.themeApplied = 'true'
}

// ==================== HEADER ====================

function injectStyles() {
  if (document.getElementById('ts-styles')) return
  const style = document.createElement('style')
  style.id = 'ts-styles'
  style.textContent = `
    /* === Header hide === */
    :root {
      --desktop-header-height: 0;
      --mobile-header-height: 0;
    }
    [class*='AppHeaderDesktop_header'] {
      opacity: 0;
      pointer-events: none;
    }

    /* === Help panel === */
    .ts-help-overlay {
      position: fixed;
      inset: 0;
      z-index: 99998;
      background: rgba(0,0,0,0.5);
      display: none;
    }
    .ts-help-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
      background: rgba(14,14,14,0.98);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px 28px;
      min-width: 400px;
      max-width: 460px;
      color: #e0e0e0;
      font-size: 13px;
      font-family: monospace;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
      display: none;
      line-height: 1.7;
    }
    .ts-help-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 18px;
      color: #fff;
      letter-spacing: 0.5px;
    }
    .ts-help-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 4px 0;
    }
    .ts-help-row--gap {
      padding: 2px 0;
    }
    .ts-help-keys {
      min-width: 170px;
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .ts-help-desc {
      color: #aaa;
    }
    .ts-kbd {
      display: inline-block;
      padding: 2px 7px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 500;
      color: #c0c0c0;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.18);
      border-bottom: 2px solid rgba(255,255,255,0.22);
      border-radius: 4px;
      line-height: 1.5;
      white-space: nowrap;
    }
    .ts-kbd--action {
      color: #88ccff;
      border-color: rgba(136,204,255,0.3);
      border-bottom-color: rgba(136,204,255,0.4);
    }
    .ts-kbd--danger {
      color: #ff8888;
      border-color: rgba(255,136,136,0.3);
      border-bottom-color: rgba(255,136,136,0.4);
    }
    .ts-kbd-plus {
      color: #555;
      font-size: 11px;
      font-weight: 400;
    }
    /* === Indicator === */
    .ts-indicator {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 6px 14px;
      background: #0a0a0a;
      color: #00ff88;
      font-size: 13px;
      font-weight: 600;
      font-family: monospace;
      border-radius: 6px;
      border: 1px solid #00ff8844;
      letter-spacing: 1px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .ts-indicator--visible {
      opacity: 1;
    }

    .ts-help-hint {
      margin-top: 16px;
      font-size: 11px;
      color: #444;
    }
  `
  document.head.appendChild(style)
}

function moveAccountBtn() {
  waitForElement(SELECTORS.accountBtn)
    .then((btn) => {
      const header = document.querySelector(SELECTORS.header)
      const footer = document.querySelector(SELECTORS.footer)
      if (!header || !footer) return
      injectStyles()
      footer.appendChild(btn)
    })
    .catch(() => {})
}

// ==================== QUICK TRADING MODE ====================

const TradingMode = {
  enabled: false,
  indicator: null,
  iframeDoc: null,

  init() {
    this.createIndicator()
    this.bindKeyboardShortcuts()
    this.observeModifyButton()
    this.initChartIframe()
  },

  // ---------- indicator ----------
  createIndicator() {
    const el = document.createElement('div')
    el.className = 'ts-indicator'
    el.textContent = 'QUICK'
    document.body.appendChild(el)
    this.indicator = el
  },

  toggle() {
    this.enabled = !this.enabled
    this.indicator.classList.toggle('ts-indicator--visible', this.enabled)
    if (this.enabled) {
      showHelpPanel()
    } else {
      hideHelpPanel()
    }
    this.processAutoClick()
  },

  // ---------- auto-confirm modifications ----------
  processAutoClick() {
    const btn = document.querySelector(SELECTORS.confirm.modify)
    if (!btn) return
    const container = btn.parentElement?.parentElement?.parentElement
    if (container) container.style.opacity = this.enabled ? '0' : '1'
    if (this.enabled) btn.click()
  },

  observeModifyButton() {
    waitForElement(SELECTORS.tradingPage)
      .then((tp) => {
        new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes.length && this.enabled) {
              this.processAutoClick()
              break
            }
          }
        }).observe(tp, { childList: true, subtree: true })
      })
      .catch(() => {})
  },

  // ---------- keyboard ----------
  bindKeyboardShortcuts() {
    this._handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        e.stopPropagation()
        this.toggle()
        return
      }

      if (this.enabled && e.altKey) {
        this.handleTradeShortcuts(e)
      } else {
        handleSymbolChange(e)
        handleIntervalChange(e)
        handleFullscreen(e)
      }
    }

    document.addEventListener('keydown', this._handler, true)
  },

  bindIframeKeys(iframeDoc) {
    iframeDoc.addEventListener('keydown', this._handler, true)
  },

  // ---------- trade shortcuts ----------
  confirmEntry(label) {
    waitForElement(SELECTORS.confirm.entry, 1000)
      .then((btn) => btn.click())
      .catch(() => console.warn(label + ' confirm button not found'))
  },

  confirmCloseAll() {
    waitForElement(SELECTORS.confirm.closeAll, 1000)
      .then((btn) => btn.click())
      .catch(() => {})
  },

  handleTradeShortcuts(e) {
    const doc = this.iframeDoc

    switch (e.key) {
      case 'ArrowUp': {
        e.preventDefault()
        e.stopPropagation()
        const buyBtn = document.querySelector(SELECTORS.buy)
        if (buyBtn) {
          buyBtn.click()
          this.confirmEntry('BUY')
        } else if (doc) {
          const iframeBuy = doc.querySelector(SELECTORS.iframe.buy)
          if (iframeBuy) iframeBuy.click()
          waitForElement(SELECTORS.buy, 2000)
            .then((btn) => {
              btn.click()
              this.confirmEntry('BUY')
            })
            .catch(() => {})
        }
        break
      }

      case 'ArrowDown': {
        e.preventDefault()
        e.stopPropagation()
        const sellBtn = document.querySelector(SELECTORS.sell)
        if (sellBtn) {
          sellBtn.click()
          this.confirmEntry('SELL')
        } else if (doc) {
          const iframeSell = doc.querySelector(SELECTORS.iframe.sell)
          if (iframeSell) iframeSell.click()
          waitForElement(SELECTORS.sell, 2000)
            .then((btn) => {
              btn.click()
              this.confirmEntry('SELL')
            })
            .catch(() => {})
        }
        break
      }

      case 'x':
      case 'X': {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          const btn = document.querySelector(SELECTORS.closeAllPositions)
          if (btn) {
            btn.click()
            this.confirmCloseAll()
          }
        } else if (doc) {
          const closeBtn = doc.querySelector(SELECTORS.iframe.closePosition)
          if (closeBtn) closeBtn.click()
        }
        break
      }
    }
  },

  // ---------- iframe ----------
  initChartIframe() {
    waitForElement(SELECTORS.chartIframe)
      .then((iframe) => {
        waitUntil(() => {
          const doc = iframe.contentDocument
          // Return the document only when the buy button exists
          return doc && doc.querySelector('.chart-page') && doc
        })
          .then((doc) => {
            this.iframeDoc = doc
            applyTheme(doc.documentElement)
            this.bindIframeKeys(doc)
          })
          .catch(() => console.warn('Chart iframe content not ready'))
      })
      .catch(() => console.warn('Chart iframe not found'))
  },
}

// ==================== SYMBOL SWITCHING ====================

function handleSymbolChange(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  if (!TradingMode.iframeDoc) return

  e.preventDefault()
  e.stopPropagation()

  const doc = TradingMode.iframeDoc
  const symbolBtn = doc.querySelector(SELECTORS.iframe.changeSymbol)
  if (!symbolBtn) return

  const label = symbolBtn.innerText.trim()
  // Find current symbol by button label
  let idx = CONFIG.symbols.findIndex(([lbl]) => lbl === label)
  if (idx === -1) idx = 0

  const len = CONFIG.symbols.length
  idx = e.key === 'ArrowDown' ? (idx + 1) % len : (idx - 1 + len) % len

  const [symbolName, searchTerm] = CONFIG.symbols[idx]

  // Open symbol search dialog
  symbolBtn.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    }),
  )

  waitForElement(SELECTORS.iframe.searchBox, 3000, doc)
    .then((searchBox) => {
      // Hide the dropdown overlay
      const popup = searchBox.closest('[data-role="search"]').parentElement
        .parentElement.parentElement.parentElement
      if (popup) popup.style.opacity = '0'

      searchBox.value = searchTerm
      searchBox.dispatchEvent(new Event('input', { bubbles: true }))

      setTimeout(() => {
        searchBox.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          }),
        )
      }, 150)
    })
    .catch(() => {})
}

// ==================== INTERVAL SWITCHING ====================

function handleIntervalChange(e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
  if (!TradingMode.iframeDoc) return

  e.preventDefault()
  e.stopPropagation()

  const doc = TradingMode.iframeDoc
  const group = doc.querySelector(SELECTORS.iframe.intervalGroup)
  if (!group) return

  const buttons = [...group.children].filter((el) => el.tagName === 'BUTTON')
  const active = group.querySelector('button[aria-checked="true"]')
  const idx = buttons.indexOf(active)
  if (idx === -1) return

  const dir = e.key === 'ArrowRight' ? 1 : -1
  const next = buttons[idx + dir]
  if (next) {
    next.click()
  }
}

// ==================== FULLSCREEN ====================

function handleFullscreen(e) {
  if (!(e.shiftKey && e.key.toLowerCase() === 'f')) return
  if (!TradingMode.iframeDoc) return

  e.preventDefault()
  e.stopPropagation()

  const btn = TradingMode.iframeDoc.querySelector(SELECTORS.iframe.fullscreen)
  if (btn) btn.click()
}

// ==================== HELP PANEL ====================

let helpPanel = null
let helpOverlay = null

function kbd(text, cls = '') {
  const el = document.createElement('span')
  el.className = 'ts-kbd' + (cls ? ' ' + cls : '')
  el.textContent = text
  return el
}

function createHelpPanel() {
  if (helpPanel) return

  injectStyles()

  // Overlay
  helpOverlay = document.createElement('div')
  helpOverlay.className = 'ts-help-overlay'
  document.body.appendChild(helpOverlay)

  // Panel
  helpPanel = document.createElement('div')
  helpPanel.className = 'ts-help-panel'

  // Title
  const title = document.createElement('div')
  title.className = 'ts-help-title'
  title.textContent = 'Quick Trade \u2014 Shortcuts'
  helpPanel.appendChild(title)

  const rows = [
    {
      keys: [kbd('Ctrl'), kbd('Q', 'ts-kbd--action')],
      desc: 'Toggle quick trade mode',
    },
    { gap: true },
    {
      keys: [kbd('Alt'), kbd('\u2191', 'ts-kbd--action')],
      desc: 'Place buy order',
    },
    {
      keys: [kbd('Alt'), kbd('\u2193', 'ts-kbd--action')],
      desc: 'Place sell order',
    },
    {
      keys: [kbd('Alt'), kbd('X', 'ts-kbd--danger')],
      desc: 'Close current position',
    },
    {
      keys: [kbd('Alt'), kbd('Shift'), kbd('X', 'ts-kbd--danger')],
      desc: 'Close all positions',
    },
    { gap: true },
    { keys: [kbd('\u2191'), kbd('\u2193')], desc: 'Switch symbol', sep: '/' },
    { keys: [kbd('\u2190'), kbd('\u2192')], desc: 'Switch interval', sep: '/' },
    { keys: [kbd('Shift'), kbd('F')], desc: 'Toggle fullscreen' },
  ]

  for (const row of rows) {
    const rowEl = document.createElement('div')
    rowEl.className = row.gap ? 'ts-help-row ts-help-row--gap' : 'ts-help-row'

    const keysEl = document.createElement('div')
    keysEl.className = 'ts-help-keys'
    if (row.keys) {
      const sep = row.sep || '+'
      for (let i = 0; i < row.keys.length; i++) {
        keysEl.appendChild(row.keys[i])
        if (i < row.keys.length - 1) {
          const sepEl = document.createElement('span')
          sepEl.className = 'ts-kbd-plus'
          sepEl.textContent = ' ' + sep + ' '
          keysEl.appendChild(sepEl)
        }
      }
    }

    const descEl = document.createElement('span')
    descEl.className = 'ts-help-desc'
    descEl.textContent = row.desc || ''

    rowEl.appendChild(keysEl)
    rowEl.appendChild(descEl)
    helpPanel.appendChild(rowEl)
  }

  // Esc hint
  const hint = document.createElement('div')
  hint.className = 'ts-help-hint'
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

function bindHelpDismiss() {
  if (bindHelpDismiss._bound) return
  bindHelpDismiss._bound = true

  const onEsc = (e) => {
    if (
      e.key === 'Escape' &&
      helpPanel &&
      helpPanel.style.display === 'block'
    ) {
      hideHelpPanel()
    }
  }

  const onClick = (e) => {
    if (
      helpOverlay &&
      helpOverlay.style.display === 'block' &&
      e.target === helpOverlay
    ) {
      hideHelpPanel()
    }
  }

  document.addEventListener('keydown', onEsc, true)
  document.addEventListener('click', onClick)

  // Bind to iframe once ready
  const tryBind = () => {
    if (TradingMode.iframeDoc) {
      TradingMode.iframeDoc.addEventListener('keydown', onEsc, true)
      TradingMode.iframeDoc.addEventListener('click', onClick)
    } else {
      setTimeout(tryBind, 500)
    }
  }
  tryBind()
}
// ==================== INIT ====================

function init() {
  injectStyles()
  applyTheme(document.body)
  moveAccountBtn()
  TradingMode.init()
  bindHelpDismiss()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
