// ==UserScript==
// @name        [MAIL] FILTER BY DOMAIN
// @namespace   Violentmonkey Scripts
// @icon        https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico
// @version     3.0.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BMAIL%5D%20FILTER%20MENU.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BMAIL%5D%20FILTER%20MENU.user.js
//
// @match       https://mail.google.com/mail/u/*
// @grant       none
//
// @author      -
// @description Filter Gmail inbox by sender domain with one click
// ==/UserScript==

// ==================== STYLES ====================

function injectStyles() {
  const style = document.createElement('style')
  style.id = 'filter-menu-styles'
  style.textContent = `
    .fm-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 6px 14px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: background 0.15s;
    }
    .fm-btn:hover { background: #1557b0; }

    .fm-panel {
      position: fixed;
      top: 46px;
      right: 10px;
      z-index: 10000;
      background: #fff;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 0;
      min-width: 240px;
      max-width: 320px;
      max-height: 360px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: none;
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 13px;
    }

    .fm-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
      font-weight: 500;
      color: #202124;
    }

    .fm-panel-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #5f6368;
      padding: 0 2px;
      line-height: 1;
    }
    .fm-panel-close:hover { color: #202124; }

    .fm-panel-actions {
      display: flex;
      gap: 6px;
      padding: 6px 12px;
      border-bottom: 1px solid #eee;
    }

    .fm-panel-actions button {
      font-size: 11px;
      padding: 3px 8px;
      border: 1px solid #dadce0;
      border-radius: 3px;
      background: #fff;
      cursor: pointer;
      color: #5f6368;
    }
    .fm-panel-actions button:hover { background: #f1f3f4; }

    .fm-list {
      max-height: 220px;
      overflow-y: auto;
      padding: 4px 0;
    }

    .fm-list label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      cursor: pointer;
      color: #202124;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fm-list label:hover { background: #f1f3f4; }

    .fm-list input[type="checkbox"] {
      flex-shrink: 0;
      accent-color: #1a73e8;
    }

    .fm-list .fm-count {
      margin-left: auto;
      font-size: 11px;
      color: #5f6368;
      flex-shrink: 0;
    }

    .fm-apply {
      display: block;
      width: calc(100% - 24px);
      margin: 8px 12px;
      padding: 7px 0;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .fm-apply:hover { background: #1557b0; }

    .fm-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #323232;
      color: #fff;
      padding: 8px 20px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
  `
  document.head.appendChild(style)
}

// ==================== DOM ====================

function getSenderEmails() {
  // Gmail stores sender email in various attributes — try multiple
  const spans = document.querySelectorAll(
    'span[email], span[data-hovercard-id]',
  )
  const emails = []

  for (const span of spans) {
    const email = span.getAttribute('email')
    if (email && email.includes('@')) {
      emails.push(email)
    }
  }

  return emails
}

function extractDomains(emails) {
  const counts = new Map()
  for (const email of emails) {
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) continue
    counts.set(domain, (counts.get(domain) || 0) + 1)
  }
  // Sort by count descending, then alphabetically
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )
}

function setNativeValue(el, value) {
  // React-friendly value setter
  const nativeSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(el),
    'value',
  )?.set
  if (nativeSetter) {
    nativeSetter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

// ==================== BUILD ====================

function buildPanel() {
  const domains = extractDomains(getSenderEmails())

  const panel = document.querySelector('.fm-panel')
  // Rebuild list
  const list = panel.querySelector('.fm-list')
  while (list.firstChild) list.firstChild.remove()

  if (domains.length === 0) {
    const empty = document.createElement('div')
    empty.style.padding = '16px 12px'
    empty.style.color = '#5f6368'
    empty.style.textAlign = 'center'
    empty.textContent = 'No senders found on this page'
    list.appendChild(empty)
    return
  }

  domains.forEach(([domain, count]) => {
    const label = document.createElement('label')
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = true
    cb.dataset.domain = domain

    const name = document.createElement('span')
    name.textContent = domain
    name.style.overflow = 'hidden'
    name.style.textOverflow = 'ellipsis'

    const badge = document.createElement('span')
    badge.className = 'fm-count'
    badge.textContent = count

    label.appendChild(cb)
    label.appendChild(name)
    label.appendChild(badge)
    list.appendChild(label)
  })
}

function applyFilter() {
  const panel = document.querySelector('.fm-panel')
  const selected = [...panel.querySelectorAll('.fm-list input:checked')].map(
    (cb) => cb.dataset.domain,
  )

  if (selected.length === 0) {
    showToast('No domains selected')
    return
  }

  const query = `from:(${selected.join(' OR ')})`

  const searchBox = document.querySelector(
    'input[aria-label="Search mail"], input[aria-label="Search"]',
  )
  if (searchBox) {
    setNativeValue(searchBox, query)

    // Trigger Gmail's search
    const searchBtn = document.querySelector(
      'button[aria-label="Search mail"], button[aria-label="Search"]',
    )
    if (searchBtn) {
      setTimeout(() => searchBtn.click(), 50)
    }
  }

  panel.style.display = 'none'
  showToast(
    `Filtering ${selected.length} domain${selected.length > 1 ? 's' : ''}`,
  )
}

// ==================== TOAST ====================

let toastTimer = null

function showToast(msg) {
  let toast = document.querySelector('.fm-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'fm-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.style.opacity = '1'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0'
  }, 2000)
}

// ==================== INIT ====================

function init() {
  if (document.querySelector('.fm-btn')) return // already injected

  injectStyles()

  // Button
  const btn = document.createElement('button')
  btn.className = 'fm-btn'
  btn.textContent = 'Filter'

  // Panel
  const panel = document.createElement('div')
  panel.className = 'fm-panel'

  // Header
  const header = document.createElement('div')
  header.className = 'fm-panel-header'
  const headerTitle = document.createElement('span')
  headerTitle.textContent = 'Filter by domain'
  const closeBtn = document.createElement('button')
  closeBtn.className = 'fm-panel-close'
  closeBtn.textContent = '\u00d7'
  header.appendChild(headerTitle)
  header.appendChild(closeBtn)

  // Actions
  const actions = document.createElement('div')
  actions.className = 'fm-panel-actions'
  const btnAll = document.createElement('button')
  btnAll.dataset.action = 'all'
  btnAll.textContent = 'All'
  const btnNone = document.createElement('button')
  btnNone.dataset.action = 'none'
  btnNone.textContent = 'None'
  actions.appendChild(btnAll)
  actions.appendChild(btnNone)

  // List
  const list = document.createElement('div')
  list.className = 'fm-list'

  // Apply button
  const applyBtn = document.createElement('button')
  applyBtn.className = 'fm-apply'
  applyBtn.textContent = 'Apply'

  panel.appendChild(header)
  panel.appendChild(actions)
  panel.appendChild(list)
  panel.appendChild(applyBtn)

  document.body.appendChild(btn)
  document.body.appendChild(panel)

  // Events
  btn.addEventListener('click', () => {
    buildPanel()
    panel.style.display = 'block'
  })

  panel.querySelector('.fm-panel-close').addEventListener('click', () => {
    panel.style.display = 'none'
  })

  panel.querySelector('.fm-apply').addEventListener('click', applyFilter)

  panel.querySelector('[data-action="all"]').addEventListener('click', () => {
    panel.querySelectorAll('.fm-list input[type="checkbox"]').forEach((cb) => {
      cb.checked = true
    })
  })

  panel.querySelector('[data-action="none"]').addEventListener('click', () => {
    panel.querySelectorAll('.fm-list input[type="checkbox"]').forEach((cb) => {
      cb.checked = false
    })
  })

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (
      panel.style.display === 'block' &&
      !panel.contains(e.target) &&
      e.target !== btn
    ) {
      panel.style.display = 'none'
    }
  })
}

// Gmail is an SPA — re-init on navigation via URL change
init()

let lastUrl = location.href
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    // Delay to let Gmail's DOM settle
    setTimeout(init, 1000)
  }
}).observe(document.body, { childList: true, subtree: true })
