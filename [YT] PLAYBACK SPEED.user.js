// ==UserScript==
// @name        [YT] PLAYBACK SPEED
// @namespace   Violentmonkey Scripts
// @icon        https://www.youtube.com/s/desktop/1904e31a/img/favicon.ico
// @version     1.1.0
// @updateURL   https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20PLAYBACK%20SPEED.user.js
// @downloadURL https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20PLAYBACK%20SPEED.user.js
//
// @match       https://www.youtube.com/*
// @grant       none
//
// @author      -
// @description Smooth animated playback speed control with +/- keys
// ==/UserScript==

class PlaybackSpeedController {
  static KEYS = new Set(['+', '-'])

  constructor({
    speeds = [1, 2, 2.5, 3, 9],
    easing = 0.15,
    hudTimeout = 3000,
  } = {}) {
    this.speeds = [...speeds].sort((a, b) => a - b)
    this.easing = easing

    this.targetSpeed = speeds[0]
    this.currentSpeed = speeds[0]
    this.rafId = null
    this._video = null

    this.hideTimer = null
    this.hudTimeout = hudTimeout

    this.initHUD()
    this.bindEvents()
  }

  // ---------- HUD ----------
  initHUD() {
    this.hud = document.createElement('div')
    Object.assign(this.hud.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '8px 12px',
      background: 'rgba(55,55,55,0.7)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      color: '#fff',
      fontSize: '14px',
      borderRadius: '6px',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    })
    document.body.appendChild(this.hud)
  }

  showHUD(text) {
    this.hud.textContent = text
    this.hud.style.opacity = '1'
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => {
      this.hud.style.opacity = '0'
    }, this.hudTimeout)
  }

  // ---------- video ----------
  getVideo() {
    return [...document.querySelectorAll('video')].find((v) => !v.paused)
  }

  // ---------- speed stepping ----------
  stepSpeed(current, direction) {
    // Snap current speed to nearest known speed (handles off-table values)
    let closest = this.speeds[0]
    let minDiff = Infinity
    for (const s of this.speeds) {
      const diff = Math.abs(s - current)
      if (diff < minDiff) {
        minDiff = diff
        closest = s
      }
    }

    const idx = this.speeds.indexOf(closest)
    const nextIdx = idx + direction
    return this.speeds[Math.max(0, Math.min(nextIdx, this.speeds.length - 1))]
  }

  // ---------- animation ----------
  animate(video) {
    const diff = this.targetSpeed - this.currentSpeed
    this.currentSpeed += diff * this.easing
    video.playbackRate = this.currentSpeed

    if (Math.abs(diff) > 0.005) {
      this.rafId = requestAnimationFrame(() => this.animate(video))
      return
    }

    this.currentSpeed = this.targetSpeed
    video.playbackRate = this.targetSpeed
    cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  setSpeed(speed, video) {
    this.targetSpeed = speed
    // Cancel stale animation if video changed (e.g. SPA navigation)
    if (this.rafId && this._video !== video) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.currentSpeed = video.playbackRate
    }
    this._video = video
    if (!this.rafId) this.animate(video)
    this.showHUD(`Speed: ${this.targetSpeed}x`)
  }

  // ---------- controls ----------
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (e.target.matches('input, textarea, [contenteditable]')) return
      if (!PlaybackSpeedController.KEYS.has(e.key)) return

      const video = this.getVideo()
      if (!video) return

      e.preventDefault()

      const liveSpeed = this.rafId ? this.targetSpeed : video.playbackRate
      const direction = e.key === '-' ? -1 : 1
      const nextSpeed = this.stepSpeed(liveSpeed, direction)

      this.setSpeed(nextSpeed, video)
    })
  }
}

new PlaybackSpeedController({
  speeds: [1, 1.5, 2, 2.5, 3, 9],
  easing: 0.06,
  hudTimeout: 1200,
})
