# Trey by Nomin

**Created & Owned by Nomin**  
**Founder:** Chirag S  
**Repository:** [Nomin-s-Trey](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey.git)  

Trey is an ultra-intelligent, friendly desktop focus companion built for focused knowledge workers worldwide. Trey sits on your desktop watching your cursor with fluid spring physics, inspects your screen against declared focus goals, executes agentic computer actions (app control, process termination, web research), and gently nudges you with cinematic takeover spotlights when you drift.

---

## Key Features

- **Universal Multi-Model Engine:** Works out-of-the-box with *any* API key (NVIDIA NIM, OpenAI, OpenRouter, Groq, or custom endpoints). Automatically audits available models and selects the optimal vision and reasoning pipeline.
- **Push-to-Talk Voice & Emergency Hotkeys:** Hold **J** (or `Ctrl+J` / `Alt+J`) to speak directly to Trey; press **K** (or `Ctrl+K` / `Alt+K`) for instantaneous emergency pause and resume.
- **Cinematic Screen Takeover & Glowing Spotlights:** Dynamic neon laser beam and pulsing corner crosshairs that pinpoint distraction sources and screen elements with fluid motion.
- **Agentic Computer Control:** Close or terminate distracting applications (*"close Chrome"*, *"quit Spotify"*, *"kill Discord"*) and launch tools on command.
- **Apple Glass Aesthetic:** Precision-crafted floating glass cards with zero mascot overlap, 76px SF Pro countdown timer, and interactive timeline history.
- **Privacy First:** Zero screenshot or audio disk writes. Memory-only processing with Windows DPAPI encryption.

---

## Windows Releases and Updates

The Windows app uses Electron's NSIS updater pointing to `chiragsatish2011-pixel/Nomin-s-Trey`. On launch it checks the GitHub releases feed, asks before downloading a newer version, and asks again before restarting to install it. The tray menu also includes **Check for Updates…**.

To publish a Windows update, increment `apps/desktop/package.json` and run `npm --workspace=@nomin/desktop run release` with a GitHub token for `chiragsatish2011-pixel/Nomin-s-Trey`. The release must be public and include the generated `Trey-Setup-<version>.exe`, its `.blockmap`, and `latest.yml`.

---

## Windows / PC Edition (Electron + TypeScript)

Requires Node.js 20+ and npm:

```sh
# Install dependencies
npm install

# Run core tests (pure Node, strict sandbox - 51 tests passing)
npm test

# Typecheck and lint
npm run typecheck
npm run lint

# Start the desktop application (Face widget, Tray, Dashboard)
npm run dev

# Package Windows desktop app (unpackaged directory)
npm run package

# Build Windows NSIS Installer
npm run installer
```

See [USER_GUIDE.md](USER_GUIDE.md) for full usage instructions and [SECURITY_NOTES.md](SECURITY_NOTES.md) for security & privacy guarantees.

---

## Credits & Ownership

- **Author / Creator:** Chirag S
- **Organization:** Nomin
- **Copyright:** Copyright (c) 2026 Nomin / Chirag S
- **Third-Party Notices:** See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

---

## Reference Architecture (Mac / iOS)

The original Swift reference implementation (`Mac/`, `iOS/`, `Shared/`, `Tests/`) is preserved intact as the foundational specification.

---

<div align="center" style="padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <h2 style="font-size: 24px; font-weight: 700; border-bottom: none; margin-bottom: 4px;">
    Get Trey for Windows
  </h2>
  
  <p style="font-size: 14px; color: #8b949e; margin-bottom: 20px;">
    The Intelligent Focus Companion · Built by Nomin
  </p>

  <a href="https://github.com/chiragsatish2011-pixel/Nomin-s-Trey/releases" rel="nofollow" style="display: inline-flex; align-items: center; gap: 10px; padding: 12px 28px; border-radius: 40px; background: linear-gradient(135deg, #6C86F5 0%, #3B82F6 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
    </svg>
    <span>Download for Windows (64-bit)</span>
  </a>

  <div style="margin-top: 14px; font-size: 11px; color: #8b949e;">
    Compatible with Windows 10 & 11 · Free & Open Source · Version 0.2.0
  </div>

</div>
