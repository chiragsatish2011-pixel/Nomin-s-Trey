/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Visual Test & Scenario Capture for Trey PC Takeover.
 * Simulates opening a site, locating tasks, traveling cursor, clicking ripple,
 * research explanation card, and companion expressions.
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const OUT_DIR = resolve('C:/Users/chira/.gemini/antigravity/brain/ffa1c763-2b03-4676-9e3f-0db62f8e4b02/screenshots')
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true })
}

app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(async () => {
  console.log('=== Starting PC Takeover Live Visual Demonstration ===')

  // Register all main IPC handlers cleanly to prevent uncaught handler warnings
  ipcMain.handle('settings:get', async () => ({
    apiKey: 'nvapi-mock-key-verified',
    developerMode: false,
    selectedVisionModel: 'meta/llama-3.2-11b-vision-instruct',
    selectedTextModel: 'meta/llama-3.3-70b-instruct'
  }))
  ipcMain.handle('ai:hasKey', async () => true)
  ipcMain.handle('ai:getKeyMasked', async () => 'nvapi-••••••••1234')
  ipcMain.handle('ai:listModels', async () => ['meta/llama-3.2-11b-vision-instruct'])
  ipcMain.handle('ai:getGovernorStatus', async () => ({
    status: 'idle',
    lastCallTime: null,
    queueLength: 0,
    cooldownRemainingSec: 0
  }))
  ipcMain.handle('focus:getHistory', async () => [
    {
      id: 'hist-1',
      task: 'Inspect Workspace Tasks Board',
      startedAt: Date.now() - 3600000,
      endedAt: Date.now() - 1800000,
      totalDurationSeconds: 1800,
      offTaskInterventions: 0,
      successRatio: 1.0
    }
  ])
  ipcMain.handle('agent:isTakeoverActive', async () => false)
  ipcMain.handle('window:isAlwaysOnTop', async () => true)
  ipcMain.handle('window:isFloatingBuddyVisible', async () => true)

  // 1. CAPTURE DASHBOARD WITH ACTIVE TIMER
  console.log('Capturing Frame 1: Dashboard with Monotonic Countdown Timer...')
  const dashWin = new BrowserWindow({
    width: 620,
    height: 720,
    show: false,
    frame: true,
    webPreferences: {
      preload: resolve('apps/desktop/out/preload/dashboard.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  await dashWin.loadFile(resolve('apps/desktop/out/renderer/dashboard/index.html'))
  await new Promise((r) => setTimeout(r, 1000))

  dashWin.webContents.send('session:state', {
    status: 'running',
    task: 'Open workspace on site and explain where tasks are located',
    remaining: 1498, // 24:58 (SF Pro 76px monotonic countdown)
    duration: 1800,
    elapsed: 302,
    detail: 'Focus session active · Trey PC Takeover ready',
    isOffTask: false,
    developerMode: false
  })
  await new Promise((r) => setTimeout(r, 600))
  const imgDash = await dashWin.webContents.capturePage()
  writeFileSync(join(OUT_DIR, 'step1_dashboard_active_timer.png'), imgDash.toPNG())

  // 2. CAPTURE FLOATING COMPANION FACE
  console.log('Capturing Frame 2: Floating Companion Face (Thinking Expression)...')
  const faceWin = new BrowserWindow({
    width: 280,
    height: 240,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: resolve('apps/desktop/out/preload/face.js'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  await faceWin.loadFile(resolve('apps/desktop/out/renderer/face/index.html'))
  await new Promise((r) => setTimeout(r, 800))
  faceWin.webContents.send('face:expression', 'thinking')
  await new Promise((r) => setTimeout(r, 400))
  const imgFace = await faceWin.webContents.capturePage()
  writeFileSync(join(OUT_DIR, 'step2_companion_thinking.png'), imgFace.toPNG())

  // 3. CAPTURE SIMULATED FULL DESKTOP WITH OPENED SITE AND AGENT TAKEOVER
  // We create a 1280x800 desktop simulation window hosting the site with tasks
  console.log('Capturing Frame 3: Agent Navigating to Site and Traveling Pointer Cursor...')
  const desktopSimWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  // Load a rich simulated workspace page with active task board
  const siteHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body { background: #0f111a; color: #f0f3f6; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
      /* Windows Taskbar Mock */
      .taskbar { height: 42px; background: rgba(18, 20, 29, 0.95); display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08); justify-content: space-between; }
      .brand { font-weight: 700; color: #6C86F5; display: flex; align-items: center; gap: 8px; font-size: 14px; }
      .browser-bar { background: #1a1d2e; padding: 6px 16px; border-radius: 8px; font-size: 12px; color: #8fa0e2; width: 480px; text-align: center; border: 1px solid rgba(108,134,245,0.25); }
      /* Workspace App Content */
      .workspace { display: flex; flex: 1; height: calc(100vh - 42px); }
      .sidebar { width: 220px; background: #141724; border-right: 1px solid rgba(255,255,255,0.06); padding: 20px 16px; display: flex; flex-direction: column; gap: 8px; }
      .nav-item { padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #8e96aa; display: flex; align-items: center; gap: 10px; cursor: pointer; }
      .nav-item.active { background: rgba(108, 134, 245, 0.15); color: #9bb1ff; font-weight: 600; border: 1px solid rgba(108, 134, 245, 0.3); }
      .main-view { flex: 1; padding: 28px 36px; background: #0b0d14; overflow-y: auto; }
      .header-title { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
      .header-desc { font-size: 13px; color: #737c94; margin-bottom: 24px; }
      .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      .column { background: #141724; border-radius: 14px; padding: 18px; border: 1px solid rgba(255,255,255,0.06); }
      .col-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8fa0e2; margin-bottom: 14px; display: flex; justify-content: space-between; }
      .card { background: #1c2033; padding: 14px; border-radius: 10px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.04); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .card-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; font-weight: 600; }
      .tag-high { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      .tag-agent { background: rgba(108, 134, 245, 0.2); color: #9bb1ff; }
      .tag-done { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
      .card-title { font-size: 13px; font-weight: 600; color: #e2e8f0; line-height: 1.4; }
      
      /* TOP TAKEOVER HUD BANNER */
      .takeover-hud {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 14, 24, 0.94);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border: 1px solid rgba(108, 134, 245, 0.55);
        border-radius: 999px;
        padding: 8px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.7), 0 0 35px rgba(108, 134, 245, 0.35);
        z-index: 99999;
      }
      .hud-orb { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #6C86F5, #3B82F6); display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 0 14px #6C86F5; }
      .hud-title { font-size: 13px; font-weight: 700; color: #FFFFFF; }
      .hud-badge { font-size: 11px; font-weight: 600; color: #A9BCFF; background: rgba(108,134,245,0.25); padding: 2px 10px; border-radius: 999px; }
      .hud-thought { font-size: 12px; color: rgba(255, 255, 255, 0.8); max-width: 440px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hud-stop { padding: 5px 12px; border-radius: 999px; background: #EF4444; border: none; color: #FFF; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }

      /* BLUE TEARDROP POINTER CURSOR */
      .bluey-cursor {
        position: fixed;
        left: 540px;
        top: 260px;
        width: 64px;
        height: 64px;
        z-index: 99998;
        transform: rotate(-12deg);
        filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 18px rgba(108, 134, 245, 0.65));
        transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* COMPANION OVERLAY IN CORNER */
      .companion-pip {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 130px;
        height: 110px;
        background: rgba(20, 18, 30, 0.88);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(108, 134, 245, 0.4);
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        z-index: 99997;
      }
      .companion-pip .face-char { width: 68px; height: 68px; position: relative; }
      .companion-pip .status-lbl { font-size: 10px; font-weight: 700; color: #A9BCFF; text-transform: uppercase; margin-top: 4px; }
    </style>
  </head>
  <body>
    <!-- Top Windows / Browser Bar -->
    <div class="taskbar">
      <div class="brand">🫐 <span>Trey Workstation · Browser</span></div>
      <div class="browser-bar">🔒 https://nomin.ai/workspace/tasks</div>
      <div style="font-size: 12px; color: #737c94;">Windows 11 (PC Edition)</div>
    </div>

    <!-- Web App Workspace -->
    <div class="workspace">
      <div class="sidebar">
        <div style="font-size: 11px; font-weight: 700; color: #626b82; text-transform: uppercase; margin-bottom: 10px;">Navigation</div>
        <div class="nav-item">📊 Dashboard</div>
        <div class="nav-item active" id="tasks-tab">📌 Tasks & Sprints (18)</div>
        <div class="nav-item">🤖 Agents & Takeover</div>
        <div class="nav-item">⚙️ Settings</div>
      </div>

      <div class="main-view">
        <div class="header-title">Active Engineering Tasks</div>
        <div class="header-desc">Inspect, prioritize, and trigger autonomous AI computer-use executions.</div>

        <div class="board">
          <!-- Column 1 -->
          <div class="column">
            <div class="col-header"><span>To Do</span> <span>4</span></div>
            <div class="card">
              <span class="card-tag tag-high">P0 · CRITICAL</span>
              <div class="card-title">Setup CI/CD deployment pipeline for Windows desktop release</div>
            </div>
            <div class="card">
              <span class="card-tag tag-agent">COMPUTER-USE</span>
              <div class="card-title">Verify multi-monitor DPI coordinate math for 150% scaling</div>
            </div>
          </div>

          <!-- Column 2 -->
          <div class="column">
            <div class="col-header"><span>In Progress</span> <span>3</span></div>
            <div class="card" style="border: 1px solid rgba(108,134,245,0.6); background: rgba(108,134,245,0.08);">
              <span class="card-tag tag-agent" style="background: #6C86F5; color: #FFF;">TARGET TASK</span>
              <div class="card-title">Open web workspace, inspect active tasks, and explain locations</div>
              <div style="font-size: 11px; color: #9bb1ff; margin-top: 6px;">🎯 Trey Agent is pointing here</div>
            </div>
            <div class="card">
              <span class="card-tag tag-high">P1</span>
              <div class="card-title">Audit NVIDIA NIM Llama 3.2 vision token latency</div>
            </div>
          </div>

          <!-- Column 3 -->
          <div class="column">
            <div class="col-header"><span>Done</span> <span>11</span></div>
            <div class="card">
              <span class="card-tag tag-done">COMPLETED</span>
              <div class="card-title">Fix timer countdown skipping bug with 250ms monotonic clock</div>
            </div>
            <div class="card">
              <span class="card-tag tag-done">COMPLETED</span>
              <div class="card-title">Compile Win32 TreyInputHelper resident C# input simulation</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Agent Takeover Top HUD Banner -->
    <div class="takeover-hud">
      <div class="hud-orb">🫐</div>
      <div class="hud-title">Trey is in control</div>
      <div class="hud-badge">Step 1 / 25</div>
      <div class="hud-thought">Navigating cursor to "In Progress · Target Task" card to inspect details...</div>
      <button class="hud-stop">Stop (Ctrl+Alt+S)</button>
    </div>

    <!-- The Blue Pointer Cursor (matching Riley Brown design) -->
    <svg class="bluey-cursor" viewBox="0 0 64 64" fill="none">
      <path d="M12 8 C 8 26, 18 48, 32 58 C 46 48, 56 26, 52 8 C 42 2, 22 2, 12 8 Z" fill="#6C86F5" stroke="#FFFFFF" stroke-width="2.5" />
      <!-- Left Eye -->
      <circle cx="25" cy="24" r="6" fill="#FFFFFF" />
      <circle cx="26" cy="24" r="2.8" fill="#1A1829" />
      <!-- Right Eye -->
      <circle cx="39" cy="24" r="6" fill="#FFFFFF" />
      <circle cx="40" cy="24" r="2.8" fill="#1A1829" />
    </svg>

    <!-- Companion Picture-in-Picture in Corner -->
    <div class="companion-pip">
      <svg class="face-char" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="#5073E5" stroke="#7593FF" stroke-width="3"/>
        <ellipse cx="38" cy="46" rx="8" ry="11" fill="#FFFFFF"/>
        <ellipse cx="62" cy="46" rx="8" ry="11" fill="#FFFFFF"/>
        <circle cx="41" cy="46" r="4" fill="#0C1033"/>
        <circle cx="65" cy="46" r="4" fill="#0C1033"/>
        <path d="M 44 65 Q 50 71 56 65" stroke="#0C1033" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>
      <div class="status-lbl">Pointing 🎯</div>
    </div>
  </body>
  </html>
  `

  await desktopSimWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(siteHtml)}`)
  await new Promise((r) => setTimeout(r, 1200))

  const imgSimPointer = await desktopSimWin.webContents.capturePage()
  writeFileSync(join(OUT_DIR, 'step3_agent_pointer_traveling_to_task.png'), imgSimPointer.toPNG())
  console.log('Saved step3_agent_pointer_traveling_to_task.png')

  // 4. CAPTURE CLICK RIPPLE & PARTICLE STARBURST ON TASK
  console.log('Capturing Frame 4: Click Ripple & Starburst Particle Burst on Task...')
  const rippleHtml = siteHtml.replace(
    '</svg>',
    `</svg>
    <!-- Click Ripple & Burst -->
    <div style="position: fixed; left: 556px; top: 290px; z-index: 99997; pointer-events: none;">
      <div style="position: absolute; left: -32px; top: -32px; width: 64px; height: 64px; border-radius: 50%; border: 3px solid #6C86F5; box-shadow: 0 0 24px #6C86F5; transform: scale(1.3); opacity: 0.85;"></div>
      <div style="position: absolute; left: -48px; top: -48px; width: 96px; height: 96px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8); transform: scale(1.1); opacity: 0.5;"></div>
      <!-- Starburst Particles -->
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(36px, 0px);"></div>
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(-36px, 0px);"></div>
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(0px, 36px);"></div>
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(0px, -36px);"></div>
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(25px, 25px);"></div>
      <div style="position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #FFF; box-shadow: 0 0 8px #6C86F5; transform: translate(-25px, 25px);"></div>
    </div>
    `
  ).replace(
    'Navigating cursor to "In Progress · Target Task" card to inspect details...',
    'CLICK action executed on "In Progress · Target Task" (left click at x:572, y:310)'
  )

  await desktopSimWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rippleHtml)}`)
  await new Promise((r) => setTimeout(r, 600))
  const imgSimRipple = await desktopSimWin.webContents.capturePage()
  writeFileSync(join(OUT_DIR, 'step4_agent_click_ripple_particle_burst.png'), imgSimRipple.toPNG())
  console.log('Saved step4_agent_click_ripple_particle_burst.png')

  // 5. CAPTURE RESEARCH EXPLANATION CARD (EXPLAINING SITE AND SHOWING WHERE TASKS ARE)
  console.log('Capturing Frame 5: Explanation & Task Discovery Card on Overlay...')
  const reportHtml = rippleHtml.replace(
    '</body>',
    `<!-- RESEARCH EXPLANATION CARD -->
    <div style="position: fixed; top: 72px; right: 28px; width: 440px; background: rgba(18, 16, 28, 0.96); backdrop-filter: blur(28px); border-radius: 20px; border: 1px solid rgba(108, 134, 245, 0.5); padding: 22px 24px; color: #FFFFFF; box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(108,134,245,0.25); z-index: 100000;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #60A5FA; box-shadow: 0 0 8px #60A5FA;"></div>
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A9BCFF;">Trey Task Analysis & Explanation</span>
        </div>
        <span style="font-size: 11px; color: #4ADE80; font-weight: 700;">✓ Verification Complete</span>
      </div>

      <div style="font-size: 16px; font-weight: 700; line-height: 1.35; margin-bottom: 10px; color: #FFFFFF;">
        Tasks Overview & Navigation Map
      </div>

      <div style="font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.88); margin-bottom: 14px;">
        Trey has inspected the webpage and mapped the task board into 3 distinct operational zones:
        <br/><br/>
        • <b>Sidebar Navigation:</b> Located on the left (x: 24, y: 140). Click <i>"Tasks & Sprints"</i> to filter backlog items.
        <br/>
        • <b>Active Tasks Board:</b> Spans the main view (columns: <i>To Do (4)</i>, <i>In Progress (3)</i>, and <i>Done (11)</i>).
        <br/>
        • <b>Execution Target:</b> The highlighted card in column 2 is ready for automated execution.
      </div>

      <div style="padding: 12px 14px; border-radius: 12px; background: rgba(108, 134, 245, 0.15); border: 1px solid rgba(108, 134, 245, 0.35); font-size: 12px; color: #C2D2FF; font-weight: 600; line-height: 1.4;">
        💡 <b>Recommendation:</b> All pending sprint tasks are listed in the center columns. Trey can autonomously transition tasks, open details, or summarize diffs.
      </div>
    </div>
    </body>`
  ).replace(
    'Step 1 / 25',
    'Step 2 / 25 · Done'
  ).replace(
    'CLICK action executed on "In Progress · Target Task" (left click at x:572, y:310)',
    'Trey has explained the site and mapped all task locations.'
  ).replace(
    'Pointing 🎯',
    'Happy 😊'
  ).replace(
    '<path d="M 44 65 Q 50 71 56 65" stroke="#0C1033" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M 40 62 Q 50 76 60 62" stroke="#0C1033" stroke-width="3.5" fill="#FFAAA6" stroke-linecap="round"/>'
  )

  await desktopSimWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(reportHtml)}`)
  await new Promise((r) => setTimeout(r, 600))
  const imgSimReport = await desktopSimWin.webContents.capturePage()
  writeFileSync(join(OUT_DIR, 'step5_agent_explanation_and_tasks_map.png'), imgSimReport.toPNG())
  console.log('Saved step5_agent_explanation_and_tasks_map.png')

  console.log('=== All 5 Scenario Frames Captured Successfully ===')
  app.quit()
})
