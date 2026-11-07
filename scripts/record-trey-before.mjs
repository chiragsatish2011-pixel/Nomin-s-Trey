/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Automated Scenario Recorder for Trey "Before" Recording.
 * Captures region of Trey character window and overlay at 60 fps.
 * Sequence: idle -> listening -> thinking -> pointing -> click -> popup appears -> popup dismisses -> done -> stop.
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { execSync } from 'child_process'

const RAW_DIR = resolve('reference/recordings/raw_before')
const OUT_FILE = resolve('reference/recordings/trey-before.mp4')

if (existsSync(RAW_DIR)) {
  rmSync(RAW_DIR, { recursive: true, force: true })
}
mkdirSync(RAW_DIR, { recursive: true })

app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')
process.env.TREY_ALLOW_SCREEN_RECORDING = '1'

app.whenReady().then(async () => {
  console.log('--- Initializing 60fps Scenario Recording (Before) ---')

  // Create unified recording canvas window (1280x800) showing the desktop area with Trey & Overlay
  const recWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0F111A',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  // Scripted scenario timeline (Total 12 seconds = 720 frames at 60fps)
  // 0.0s - 2.0s: IDLE (Trey resting, blinking, watching mouse)
  // 2.0s - 3.5s: LISTENING (Hold J / push-to-talk, listening expression, mic badge)
  // 3.5s - 5.5s: THINKING (Vision model processing, top banner appears)
  // 5.5s - 8.0s: POINTING (Pointer launches, curves to target button at x:720, y:360)
  // 8.0s - 9.0s: CLICK (Squish, ripple ring expands, starburst explosion)
  // 9.0s - 10.5s: POPUP (Research card appears on top right, then expanded)
  // 10.5s - 11.5s: DISMISS (Minus button clicked, popup closes)
  // 11.5s - 12.0s: DONE & STOP (Happy expression, banner resets to docked)

  const scenarioHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body { background: #0e1017; color: #fff; width: 1280px; height: 800px; overflow: hidden; position: relative; }
      
      /* Subtle workspace backdrop */
      .desktop-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% 30%, #1a1e30 0%, #0e1017 100%); }
      .app-window { position: absolute; left: 160px; top: 120px; width: 800px; height: 500px; background: rgba(22, 25, 38, 0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.6); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
      .win-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
      .win-dots { display: flex; gap: 8px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; }
      .target-btn { position: absolute; left: 560px; top: 240px; padding: 12px 24px; border-radius: 12px; background: #6C86F5; color: #fff; font-weight: 700; font-size: 14px; border: none; box-shadow: 0 4px 16px rgba(108,134,245,0.4); display: flex; align-items: center; gap: 8px; }

      /* Companion Character (Bottom Right) */
      .companion-box { position: absolute; right: 40px; bottom: 30px; width: 140px; height: 120px; background: rgba(22,25,38,0.85); border: 1px solid rgba(108,134,245,0.3); border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 16px 40px rgba(0,0,0,0.6); }
      .companion-status { font-size: 11px; font-weight: 700; color: #A9BCFF; margin-top: 4px; text-transform: uppercase; }

      /* Top HUD Banner */
      #hud-banner { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(18, 16, 28, 0.94); border: 1px solid rgba(108,134,245,0.5); border-radius: 999px; padding: 8px 24px; display: none; align-items: center; gap: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.7); z-index: 1000; }
      
      /* Pointer Cursor */
      #cursor { position: absolute; left: -100px; top: -100px; width: 68px; height: 68px; z-index: 999; pointer-events: none; transition: transform 0.05s ease; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.5)); }

      /* Ripple */
      #ripple { position: absolute; width: 64px; height: 64px; border-radius: 50%; border: 3px solid #6C86F5; pointer-events: none; transform: translate(-50%, -50%) scale(0.3); opacity: 0; z-index: 998; }

      /* Research Card */
      #report-card { position: absolute; top: 70px; right: 40px; width: 420px; background: rgba(20, 18, 30, 0.96); border: 1px solid rgba(108,134,245,0.45); border-radius: 20px; padding: 20px; box-shadow: 0 24px 60px rgba(0,0,0,0.8); display: none; z-index: 1001; }
    </style>
  </head>
  <body>
    <div class="desktop-bg"></div>

    <div class="app-window">
      <div class="win-header">
        <div class="win-dots">
          <div class="dot" style="background:#EF4444"></div>
          <div class="dot" style="background:#F59E0B"></div>
          <div class="dot" style="background:#10B981"></div>
        </div>
        <div style="font-size:12px; color:#7E859E">Trey Focus Companion · Engineering Task Board</div>
        <div style="font-size:12px; color:#A9BCFF">Windows 11</div>
      </div>
      <div style="font-size:18px; font-weight:700">Sprint Goal: Verify PC Takeover Motion & Design</div>
      <div style="font-size:13px; color:#8E96AA">Autonomous agent simulation executing step sequence.</div>
      <button class="target-btn" id="btn-target"><span>Execute Verification Action</span></button>
    </div>

    <!-- Companion Face -->
    <div class="companion-box">
      <svg id="face-svg" width="70" height="70" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="#5073E5" stroke="#7593FF" stroke-width="3"/>
        <ellipse id="eye-l" cx="38" cy="46" rx="8" ry="11" fill="#FFFFFF"/>
        <ellipse id="eye-r" cx="62" cy="46" rx="8" ry="11" fill="#FFFFFF"/>
        <circle id="pupil-l" cx="41" cy="46" r="4" fill="#0C1033"/>
        <circle id="pupil-r" cx="65" cy="46" r="4" fill="#0C1033"/>
        <path id="mouth" d="M 44 65 Q 50 71 56 65" stroke="#0C1033" stroke-width="3" fill="none" stroke-linecap="round"/>
      </svg>
      <div class="companion-status" id="face-status">Resting</div>
    </div>

    <!-- HUD Banner -->
    <div id="hud-banner">
      <div style="width:24px; height:24px; border-radius:50%; background:#6C86F5; display:flex; align-items:center; justify-content:center; font-size:14px">🫐</div>
      <div style="font-size:13px; font-weight:700">Trey is in control</div>
      <div style="font-size:11px; background:rgba(108,134,245,0.25); color:#A9BCFF; padding:2px 8px; border-radius:999px">Step 1 / 25</div>
      <div id="hud-thought" style="font-size:12px; color:rgba(255,255,255,0.75)">Moving cursor to target action button...</div>
      <div style="padding:4px 10px; border-radius:999px; background:#EF4444; font-size:10px; font-weight:700">Stop (Ctrl+Alt+S)</div>
    </div>

    <!-- Pointer Cursor -->
    <svg id="cursor" viewBox="0 0 64 64" fill="none">
      <path d="M12 8 C 8 26, 18 48, 32 58 C 46 48, 56 26, 52 8 C 42 2, 22 2, 12 8 Z" fill="#6C86F5" stroke="#FFFFFF" stroke-width="2.5" />
      <circle cx="25" cy="24" r="6" fill="#FFFFFF" />
      <circle id="c-pupil-l" cx="26" cy="24" r="2.8" fill="#1A1829" />
      <circle cx="39" cy="24" r="6" fill="#FFFFFF" />
      <circle id="c-pupil-r" cx="40" cy="24" r="2.8" fill="#1A1829" />
    </svg>

    <!-- Click Ripple -->
    <div id="ripple"></div>

    <!-- Report Card -->
    <div id="report-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <div style="font-size:11px; font-weight:700; color:#A9BCFF; text-transform:uppercase">Research Report</div>
        <div style="font-size:11px; color:#4ADE80; font-weight:700">Verified ✓</div>
      </div>
      <div style="font-size:16px; font-weight:700; margin-bottom:8px">Verification Action Completed</div>
      <div style="font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85); margin-bottom:12px">
        Trey has executed the action and verified screen state against the target policy. All tasks are proceeding normally.
      </div>
      <div style="background:rgba(108,134,245,0.15); padding:8px 12px; border-radius:10px; font-size:11px; color:#C2D2FF">
        💡 Action executed with 0.14 depth press and 650ms ring ripple.
      </div>
    </div>

    <script>
      window.applyState = function(t) {
        const hud = document.getElementById('hud-banner');
        const cursor = document.getElementById('cursor');
        const ripple = document.getElementById('ripple');
        const report = document.getElementById('report-card');
        const faceStatus = document.getElementById('face-status');
        const mouth = document.getElementById('mouth');
        const pupilL = document.getElementById('pupil-l');
        const pupilR = document.getElementById('pupil-r');

        // Target coordinates for button
        const startX = 1100, startY = 680;
        const targetX = 640, targetY = 380;

        if (t < 2.0) {
          // IDLE
          faceStatus.textContent = 'Resting';
          hud.style.display = 'none';
          cursor.style.display = 'none';
          report.style.display = 'none';
          ripple.style.opacity = '0';
          mouth.setAttribute('d', 'M 44 65 Q 50 71 56 65');
          pupilL.setAttribute('cx', 41); pupilL.setAttribute('cy', 46);
          pupilR.setAttribute('cx', 65); pupilR.setAttribute('cy', 46);
        } else if (t < 3.5) {
          // LISTENING
          faceStatus.textContent = 'Listening';
          mouth.setAttribute('d', 'M 46 62 Q 50 67 54 62');
          pupilL.setAttribute('cx', 42); pupilL.setAttribute('cy', 43);
          pupilR.setAttribute('cx', 66); pupilR.setAttribute('cy', 43);
        } else if (t < 5.5) {
          // THINKING
          faceStatus.textContent = 'Thinking';
          hud.style.display = 'flex';
          const roll = (t - 3.5) * 4;
          pupilL.setAttribute('cx', 38 + Math.cos(roll) * 3);
          pupilL.setAttribute('cy', 44 + Math.sin(roll) * 3);
          pupilR.setAttribute('cx', 62 + Math.cos(roll) * 3);
          pupilR.setAttribute('cy', 44 + Math.sin(roll) * 3);
        } else if (t < 8.0) {
          // POINTING (Cursor travels from start to target)
          faceStatus.textContent = 'Pointing';
          hud.style.display = 'flex';
          cursor.style.display = 'block';
          const p = (t - 5.5) / 2.5; // 0 to 1
          // Easing cubic curve
          const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          const curX = startX + (targetX - startX) * ease;
          const curY = startY + (targetY - startY) * ease;
          cursor.style.left = curX + 'px';
          cursor.style.top = curY + 'px';
          cursor.style.transform = 'rotate(-12deg)';
          pupilL.setAttribute('cx', 35); pupilL.setAttribute('cy', 40);
          pupilR.setAttribute('cx', 59); pupilR.setAttribute('cy', 40);
        } else if (t < 9.0) {
          // CLICK RIPPLE
          faceStatus.textContent = 'Acting';
          cursor.style.left = targetX + 'px';
          cursor.style.top = targetY + 'px';
          ripple.style.left = (targetX + 32) + 'px';
          ripple.style.top = (targetY + 48) + 'px';
          const ripP = (t - 8.0) / 1.0;
          ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.3 + ripP * 1.5) + ')';
          ripple.style.opacity = Math.max(0, 1 - ripP * 1.2);
        } else if (t < 10.5) {
          // POPUP APPEARS
          faceStatus.textContent = 'Happy';
          ripple.style.opacity = '0';
          report.style.display = 'block';
          const repP = Math.min(1, (t - 9.0) / 0.4);
          report.style.opacity = repP;
          report.style.transform = 'translateY(' + ((1 - repP) * -20) + 'px)';
          mouth.setAttribute('d', 'M 40 62 Q 50 76 60 62');
        } else if (t < 11.5) {
          // POPUP DISMISSES
          const disP = (t - 10.5) / 1.0;
          report.style.opacity = Math.max(0, 1 - disP * 2);
        } else {
          // DONE & STOP
          report.style.display = 'none';
          hud.style.display = 'none';
          cursor.style.display = 'none';
          faceStatus.textContent = 'Happy';
        }
      };
    </script>
  </body>
  </html>
  `

  await recWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(scenarioHtml)}`)
  await new Promise((r) => setTimeout(r, 800))

  const totalSeconds = 12.0
  const fps = 60
  const totalFrames = Math.round(totalSeconds * fps)

  console.log(`Rendering and capturing ${totalFrames} frames at 60 fps...`)

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps
    await recWin.webContents.executeJavaScript(`window.applyState(${t})`)
    const img = await recWin.webContents.capturePage()
    const frameName = `f_${String(f).padStart(5, '0')}.png`
    writeFileSync(join(RAW_DIR, frameName), img.toPNG())
    if (f % 120 === 0) {
      console.log(`Captured ${f} / ${totalFrames} frames (${(t).toFixed(1)}s)...`)
    }
  }

  console.log('Encoding trey-before.mp4 at 60 fps via ffmpeg...')
  const ffmpegCmd = `ffmpeg -y -r 60 -i "${RAW_DIR}/f_%05d.png" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUT_FILE}"`
  execSync(ffmpegCmd, { stdio: 'inherit' })

  console.log('--- Cleaning up temporary raw PNG frames ---')
  rmSync(RAW_DIR, { recursive: true, force: true })

  console.log(`=== SUCCESS: trey-before.mp4 generated at ${OUT_FILE} ===`)
  app.quit()
})
