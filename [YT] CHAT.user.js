// ==UserScript==
// @name        [YT] CHAT
// @namespace   Violentmonkey Scripts
// @icon        https://www.youtube.com/s/desktop/2279fdfc/img/favicon.ico
// @version     3.0.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20CHAT.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20CHAT.user.js
//
// @match       https://www.youtube.com/live_chat*
// @grant       none
//
// @author      -
// @description Shows author message history on hover in YouTube live chat
// ==/UserScript==

function fnv1a(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

const isInIframe = window.parent !== window
const LOG_PREFIX = '[CHAT UPGRADE]'
const log = isInIframe
  ? () => {}
  : (msg, data = null) => {
      if (data) console.log(`${LOG_PREFIX} ${msg}`, data)
      else console.log(`${LOG_PREFIX} ${msg}`)
    }

function logError(msg, err = null) {
  if (err) console.error(`${LOG_PREFIX} ❌ ${msg}`, err)
  else console.error(`${LOG_PREFIX} ❌ ${msg}`)
}

function waitForElement(selector, doc = document, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const el = doc.querySelector(selector)
    if (el) return resolve(el)

    const observer = new MutationObserver(() => {
      const el = doc.querySelector(selector)
      if (!el) return
      observer.disconnect()
      resolve(el)
    })

    observer.observe(doc, { childList: true, subtree: true })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element not found within ${timeout}ms: "${selector}"`))
    }, timeout)
  })
}

function cleanMessage(text) {
  return fnv1a(text.toLowerCase().replace(/[^a-z0-9]/gi, ''))
}

// ==================== STYLES ====================

function injectStyles() {
  const style = document.createElement('style')
  style.id = 'chat-upgrade-styles'
  style.textContent = `
    .cu-popup {
      position: fixed;
      z-index: 9999;
      background: rgba(10,10,10,0.95);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 6px 8px;
      min-width: 220px;
      max-width: 340px;
      max-height: 260px;
      overflow-y: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      pointer-events: auto;
    }

    .cu-popup-title {
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 5px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .cu-popup-msg {
      font-size: 12px;
      color: rgba(255,255,255,0.85);
      padding: 3px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      line-height: 1.4;
      word-break: break-word;
    }

    .cu-popup-msg:last-child {
      border-bottom: none;
    }

    .cu-popup-msg .cu-count {
      color: rgba(255,255,255,0.35);
      font-size: 10px;
      margin-left: 4px;
    }

    yt-live-chat-text-message-renderer {
      position: relative;
    }
  `
  document.head.appendChild(style)
}

// ==================== POPUP ====================

let sharedPopup = null
let sharedPopupTimeout = null

function getSharedPopup() {
  if (!sharedPopup) {
    sharedPopup = document.createElement('div')
    sharedPopup.className = 'cu-popup'
    sharedPopup.style.display = 'none'
    document.body.appendChild(sharedPopup)

    sharedPopup.addEventListener('mouseenter', () => {
      clearTimeout(sharedPopupTimeout)
    })
    sharedPopup.addEventListener('mouseleave', () => {
      hideSharedPopup()
    })
  }
  return sharedPopup
}

function showSharedPopup(anchor, authorHistory) {
  const popup = getSharedPopup()
  renderPopup(popup, authorHistory)

  const rect = anchor.getBoundingClientRect()
  popup.style.left = rect.left + rect.width / 2 - popup.offsetWidth / 2 + 'px'
  popup.style.top = rect.top - popup.offsetHeight - 6 + 'px'
  popup.style.display = ''

  clearTimeout(sharedPopupTimeout)
}

function hideSharedPopup() {
  sharedPopupTimeout = setTimeout(() => {
    if (sharedPopup) {
      sharedPopup.style.display = 'none'
    }
  }, 200)
}

function renderPopup(popup, authorHistory) {
  while (popup.firstChild) popup.firstChild.remove()

  const size = authorHistory.size
  const title = document.createElement('div')
  title.className = 'cu-popup-title'
  title.textContent = `${size} message${size !== 1 ? 's' : ''}`
  popup.appendChild(title)

  for (const { text, count } of authorHistory.values()) {
    const row = document.createElement('div')
    row.className = 'cu-popup-msg'
    row.textContent = text

    if (count > 1) {
      const badge = document.createElement('span')
      badge.className = 'cu-count'
      badge.textContent = `x${count}`
      row.appendChild(badge)
    }

    popup.appendChild(row)
  }
}

// ==================== CORE ====================

function run() {
  const chats = document.querySelector('#chat #items')
  if (!chats) {
    logError('Chat container not found (#chat #items)')
    return
  }

  injectStyles()
  log('📦 Chat container found')

  // authors: name → { history: Map<hash, {text, count, node}> }
  const authors = new Map()

  function getOrCreateAuthor(author) {
    if (!authors.has(author)) {
      authors.set(author, {
        history: new Map(), // hash → { text, count, node } (insertion-ordered)
      })
      log(`🆕 New author: ${author} (Total: ${authors.size})`)
    }
    return authors.get(author)
  }

  function attachPopupBehavior(node, authorObj) {
    // Avoid double-binding
    if (node._cuBound) return
    node._cuBound = true

    node.addEventListener('mouseenter', () => {
      showSharedPopup(node, authorObj.history)
    })

    node.addEventListener('mouseleave', (e) => {
      const popup = getSharedPopup()
      if (popup.style.display !== 'none' && !popup.contains(e.relatedTarget)) {
        hideSharedPopup()
      }
    })
  }

  const removeNodes = []

  function handleNewMessage(node) {
    if (!node.matches('yt-live-chat-text-message-renderer')) return

    const author = node.querySelector('#author-name')?.innerText.trim()
    if (!author) return

    const rawMessage = node.querySelector('#message')?.innerText?.trim()
    if (!rawMessage) return

    const hash = cleanMessage(rawMessage)
    const authorObj = getOrCreateAuthor(author)
    const existing = authorObj.history.get(hash)

    if (existing) {
      // If it's the same DOM node being re-processed (YouTube moved it), skip
      if (existing.node === node) return

      // 🔁 Duplicate — update count, remove old node, keep new
      existing.count++
      log(
        `🔁 Duplicate #${existing.count} from ${author}: "${rawMessage.substring(0, 30)}"`,
      )

      removeNodes.push(existing.node)
      existing.node = node

      // Update counter badge on new node
      const msgEl = node.querySelector('#message')
      if (msgEl) {
        const span = document.createElement('span')
        span.textContent = ` (x${existing.count})`
        msgEl.parentNode.appendChild(span)
      }
    } else {
      // 🆕 New unique message from this author
      authorObj.history.set(hash, { text: rawMessage, count: 1, node })
      log(`💬 New message from ${author}: "${rawMessage.substring(0, 30)}"`)
    }

    // Always bind hover to the latest node for this author
    attachPopupBehavior(node, authorObj)
  }

  function cleanUp() {
    removeNodes.forEach((e) => {
      if (e.parentNode) e.remove()
    })
    removeNodes.length = 0
  }

  // Process existing messages
  chats.childNodes.forEach((node) => handleNewMessage(node))

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        handleNewMessage(node)
      }
    }
    cleanUp()
  })

  observer.observe(chats, { childList: true })
  log('👁️ MutationObserver started')
  cleanUp()
}

waitForElement('#chat #items').then(() => {
  log('✅ Chat items found, starting...')
  run()
})
