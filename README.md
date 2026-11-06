# Trey by The Nomin Company

**Created & Owned by The Nomin Company**  
**Founder:** Chirag S  
**Repository:** [Nomin-s-Trey](https://github.com/chiragsatish2011-pixel/Nomin-s-Trey.git)

Trey is an ultra-intelligent, friendly desktop focus companion built for 1000M+ focused knowledge workers. Trey sits on your desktop watching your cursor with fluid spring physics, inspects your screen against declared focus goals, executes agentic computer actions (app control, process termination, web research), and gently nudges you with cinematic takeover spotlights when you drift.

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

To publish a Windows update, increment `apps/desktop/package.json` and run `npm --workspace=@bluey/desktop run release` with a GitHub token for `chiragsatish2011-pixel/Nomin-s-Trey`. The release must be public and include the generated `Trey-Setup-<version>.exe`, its `.blockmap`, and `latest.yml`.

---

## Windows / PC Edition (Electron + TypeScript)

Requires Node.js 20+ and npm:

```sh
# Install dependencies
npm install

# Run core tests (pure Node, strict sandbox - 48 tests passing)
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

## Reference Architecture (Mac / iOS)

The original Swift reference implementation (`Mac/`, `iOS/`, `Shared/`, `Tests/`) is preserved intact as the foundational specification.

### License

Public domain under [the Unlicense](LICENSE).
