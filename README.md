# AutoClicker Premium

> A fast, precise and fully configurable auto-clicker for Windows — built with Electron & React.

---

## What it does

AutoClicker Premium lets you automate mouse clicks at any speed, on any screen position, with full control over timing, button, click type, and repeat behavior. It runs as a native Windows desktop app with a clean dark UI and works globally — even when the window is not in focus.

---

<details>
<summary><strong>Features</strong></summary>
<br>

### Clicking
- **Left, right, or middle** mouse button
- **Single or double** click
- **Minimum interval floor of 80ms** to keep the system stable

### Timing
- Set interval with **hours / minutes / seconds / milliseconds**
- **Random interval mode** — randomizes timing between a min and max range to simulate human behavior

### Repeat
- **Until stopped** — runs indefinitely until you press stop
- **Repeat X times** — stops automatically after a set number of clicks

### Location
| Mode | Description |
|------|-------------|
| Current position | Clicks wherever your cursor is |
| Fixed position | Always clicks at one specific saved coordinate |
| Multi-position | Cycles through a list of coordinates in order |

### Multi-Position & Categories
- Organize positions into **4 independent categories**, each can be enabled or disabled
- Set **clicks per position** — how many times to click at each coordinate before moving on
- **Category 4** supports a custom repeat count per individual position

### Hotkeys
- **Start / Stop** — works globally even when the app is minimized or behind other windows
- **Emergency Stop** — instantly halts all clicking
- Both hotkeys are **fully remappable** from the Settings panel

### Other
- **Always on top** toggle — keeps the app visible above all other windows
- **Local profile saving** — save and reload position configurations, stored locally on disk
- **Click animation overlay** — visual pulse indicator when the clicker is active
- **Frameless custom UI** with a Windows 11-style dark theme and custom title bar

</details>

---

## How it works

### Click Engine (Main Process)

The clicker runs in the **Electron main process**, not in the browser renderer. This gives it two key advantages:

1. Clicks continue even when the app window loses focus
2. Global hotkeys (via Electron's `globalShortcut`) work system-wide at all times

Mouse events are sent through a **persistent PowerShell runspace** that stays alive for the entire session. Commands are piped via stdin instead of spawning a new process per click — eliminating the 50–200ms startup overhead of a fresh PowerShell instance.

### Timing

The engine calculates the next interval **after** each click finishes, not before. This prevents overlapping clicks and keeps timing accurate at high speeds. A minimum floor of **80ms** is enforced between clicks.

### Multi-Position Cycling

In multi-position mode, the engine tracks a position index. After completing the required clicks at the current position it moves to the next. When all positions are done:
- **Until stopped** → loops back to position 0
- **Repeat X times** → stops after one full cycle

### Data Storage

Everything is stored locally — no cloud, no account needed:

```
%APPDATA%\ThomasThanos\AutoClicker\
├── device_id.txt     — unique device identifier
└── profiles.json     — saved position profiles
```

---

## Hotkeys

| Key | Action |
|-----|--------|
| `F6` *(default)* | Start / Stop |
| `F7` *(default)* | Emergency Stop |

Configurable from the Settings panel inside the app.

---

## Getting Started

### Requirements
- Windows 10 / 11
- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

Starts Vite and Electron together:

```bash
npm run dev
```

### Build

Kills any running Electron process, builds the app, and packages it as a Windows portable `.exe`:

```bash
npm run build
```

Output goes to the `release/` folder.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| UI | React + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Mouse control | PowerShell (`mouse_event` Win32 API) |
| Packaging | electron-builder |

---

## Project Structure

```
autoclicker/
├── electron/
│   ├── main.cjs          # Main process — clicker engine, IPC handlers, hotkeys, local storage
│   └── preload.cjs       # Exposes safe APIs to the renderer via contextBridge
├── src/
│   ├── components/
│   │   └── AutoClicker/  # All UI components (settings, panels, stats, etc.)
│   ├── hooks/
│   │   ├── useAppSettings.ts      # App settings persistence
│   │   ├── useDeviceId.ts         # Device ID (stored in AppData)
│   │   └── useSavedLocations.ts   # Profile save / load via Electron IPC
│   └── main.tsx
├── electron-builder.json
└── package.json
```

---

**Author:** ThomasThanos / Kolokithes A.E.
