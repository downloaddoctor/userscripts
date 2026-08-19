# Userscripts

## PROJECT

Userscripts collection for Violentmonkey covering trading, email, and YouTube workflows

## DIRECTORY

.git/ # version control
.prettierrc # code formatting config
README.md # install/usage docs
install-all.html # opens all userscript install URLs at once
[COMIC] AUTO SCROLL.user.js # comic reader auto scroll
[EXNESS] TRADING SHORTCUTS.user.js # Exness terminal trade shortcuts
[MAIL] FILTER MENU.user.js # Gmail sender-domain filter
[TVC] TOOL SHORTCUTS.user.js # TradingView chart tool shortcuts
[YT] CHAT.user.js # YouTube live chat history on hover
[YT] PLAYBACK SPEED.user.js # YouTube playback speed control

## ENTRY-POINTS

[COMIC] AUTO SCROLL.user.js -> Violentmonkey on comix.to
[EXNESS] TRADING SHORTCUTS.user.js -> Violentmonkey on my.exness.com/webtrading/_
[MAIL] FILTER MENU.user.js -> Violentmonkey on mail.google.com
[TVC] TOOL SHORTCUTS.user.js -> Violentmonkey on tradingview.com charts
[YT] CHAT.user.js -> Violentmonkey on youtube.com/live_chat_
[YT] PLAYBACK SPEED.user.js -> Violentmonkey on youtube.com with video

## MODULES

[COMIC] AUTO SCROLL.user.js # standalone userscript, no shared modules
[EXNESS] TRADING SHORTCUTS.user.js # standalone userscript, no shared modules
[MAIL] FILTER MENU.user.js # standalone userscript, no shared modules
[TVC] TOOL SHORTCUTS.user.js # standalone userscript, no shared modules
[YT] CHAT.user.js # standalone userscript, no shared modules
[YT] PLAYBACK SPEED.user.js # standalone userscript, no shared modules

## RUNTIME-GRAPH

[COMIC] AUTO SCROLL.user.js # auto scroll loop -> comix.to comic reader DOM
[EXNESS] TRADING SHORTCUTS.user.js # keyboard shortcuts -> Exness DOM
[MAIL] FILTER MENU.user.js # DOM filter panel -> Gmail inbox
[TVC] TOOL SHORTCUTS.user.js # keyboard shortcuts -> TradingView chart API
[YT] CHAT.user.js # chat message hover -> YouTube live chat DOM
[YT] PLAYBACK SPEED.user.js # +/- keys -> YouTube video element

## SCHEMA

No shared schema # each userscript self-contained

## ENV

Violentmonkey browser extension # required runtime
No build step # plain JS + prettier

## CONFIG

.prettierrc # formatting rules

## PUBLIC-API

# userscript metadata blocks: @name, @match, @grant, @updateURL per script

[COMIC] AUTO SCROLL.user.js # @match https://comix.to
[EXNESS] TRADING SHORTCUTS.user.js # @match my.exness.com/webtrading/_
[MAIL] FILTER MENU.user.js # @match mail.google.com
[TVC] TOOL SHORTCUTS.user.js # @match tradingview.com
[YT] CHAT.user.js # @match youtube.com/live_chat_
[YT] PLAYBACK SPEED.user.js # @match youtube.com

## EXTENSION-POINTS

# add new .user.js files, update README table and AGENTS.md
