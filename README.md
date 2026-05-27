# Userscripts

A collection of Violentmonkey userscripts for trading, email, and YouTube.

## Scripts

| Script                       | Description                                                  | Install                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `[YT] CHAT`                  | Shows author message history on hover in YouTube live chat   | [Install](https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20CHAT.user.js)                    |
| `[YT] PLAYBACK SPEED`        | Smooth animated playback speed control with +/- keys         | [Install](https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BYT%5D%20PLAYBACK%20SPEED.user.js)        |
| `[MAIL] FILTER BY DOMAIN`    | Filter Gmail inbox by sender domain with one click           | [Install](https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BMAIL%5D%20FILTER%20MENU.user.js)         |
| `[EXNESS] TRADING SHORTCUTS` | Quick trade mode with keyboard shortcuts for Exness terminal | [Install](https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BEXNESS%5D%20TRADING%20SHORTCUTS.user.js) |
| `[TVC] TOOL SHORTCUTS`       | Keyboard shortcuts for TradingView chart tools               | [Install](https://raw.githubusercontent.com/downloaddoctor/userscripts/main/%5BTVC%5D%20TOOL%20SHORTCUTS.user.js)       |

## Setup

1. Install the [Violentmonkey](https://violentmonkey.github.io/get-it/) extension
2. Click any **Install** link above
3. Violentmonkey will detect the script and show an install prompt
4. Click **Confirm installation**

## Auto-updates

Violentmonkey checks for updates automatically. Each script includes `@updateURL` pointing to this repo.

## Usage

### [YT] CHAT — YouTube Live Chat

- Works on `youtube.com/live_chat*` pages
- **Hover** over any chat message to see that author's message history
- Shows unique messages grouped with duplicate counts (x2, x3, etc.)

### [YT] PLAYBACK SPEED — Video Speed Control

- Works on any `youtube.com` page with a video
- Press **+** to increase speed, **-** to decrease
- Smooth animated transitions between speeds
- Default speeds: 1x, 1.25x, 1.5x, 1.75x, 2x, 2.5x, 3x, 9x
- A HUD appears briefly showing the current speed

### [MAIL] FILTER BY DOMAIN — Gmail Domain Filter

- Works on `mail.google.com`
- Click the blue **Filter** button (top-right corner)
- Panel opens showing sender domains sorted by frequency
- Check/uncheck domains, use **All** / **None** to toggle
- Click **Apply** to filter inbox by selected domains
- Click outside or the × to close

### [EXNESS] TRADING SHORTCUTS — Quick Trade Mode

- Works on `my.exness.com/webtrading/*`
- Press **Ctrl+Q** to toggle quick trade mode
- When enabled (green QUICK indicator):
  - Help panel appears showing all shortcuts
  - **Alt+↑** — Place buy order
  - **Alt+↓** — Place sell order
  - **Alt+X** — Close current position
  - **Alt+Shift+X** — Close all positions
- Always available:
  - **↑/↓** — Switch chart symbol
  - **←/→** — Switch chart interval
  - **Shift+F** — Toggle fullscreen
- Press **Esc** or click outside to hide the help panel

### [TVC] TOOL SHORTCUTS — TradingView Chart Tools

- Works on `tradingview.com` charts
- Press **Ctrl+/** to show/hide the shortcuts panel
- **Ctrl+Z** / **Ctrl+Y** — Undo / Redo
- **Ctrl+A** — Select all drawings
- **Ctrl+Shift+A** — Select all locked drawings
- **Ctrl+L** — Toggle lock on selected drawings
- **Ctrl+Backspace** — Remove all drawings
- **←/→** — Switch interval
- **Alt+1–9** — Select favorite tool
- **Ctrl+1–9** — Apply template
- **Ctrl+Alt+S** — Take snapshot
- Press **Esc** or click outside to close the panel
