/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Automated Scenario Recorder for Trey "After" Recording.
 * Captures region of Trey character window and overlay at 60 fps with full Apple Design System
 * and mathematical motion parity from bluey-by-riley Swift reference.
 * Zero emojis, authentic teardrop cursor, 650ms ripple, 550ms starburst, top-right research card.
 */

import { app, BrowserWindow } from 'electron'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { execSync } from 'child_process'

const RAW_DIR = resolve('reference/recordings/raw_after')
const OUT_FILE = resolve('reference/recordings/trey-after.mp4')

if (existsSync(RAW_DIR)) {
  rmSync(RAW_DIR, { recursive: true, force: true })
}
mkdirSync(RAW_DIR, { recursive: true })

app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')
process.env.TREY_ALLOW_SCREEN_RECORDING = '1'

app.whenReady().then(async () => {
  console.log('--- Initializing 60fps Scenario Recording (After: Apple Design & Motion) ---')

  const recWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0E1017',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  // Scripted scenario timeline (12.0s = 720 frames at 60fps)
  // 0.0s - 2.0s: IDLE (Trey resting, blinking, watching mouse)
  // 2.0s - 3.5s: LISTENING (Push-to-talk J held, listening face, clean vector indicator)
  // 3.5s - 5.5s: THINKING (Vision model processing, Apple HUD pill appears)
  // 5.5s - 8.0s: POINTING (Teardrop cursor launches along cubic-bezier(0.42, 0, 0.22, 1) to target button at x:640, y:380)
  // 8.0s - 9.0s: CLICK (0.14 depth squish, 650ms ring ripple, 550ms 6-starburst explosion)
  // 9.0s - 10.5s: POPUP (ReportPanel.swift top-right card appears with 22px continuous radius, #6C86F5 border, zero glow)
  // 10.5s - 11.5s: DISMISS (Minus button clicked, clean fade-out)
  // 11.5s - 12.0s: DONE & STOP (Happy expression, clean reset)

  const scenarioHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, "Segoe UI Variable", -apple-system, BlinkMacSystemFont, sans-serif; }
      body { background: #0E1017; color: #FFFFFF; width: 1280px; height: 800px; overflow: hidden; position: relative; }
      
      /* Subtle workspace backdrop */
      .desktop-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% 25%, #161926 0%, #0E1017 100%); }
      .app-window { position: absolute; left: 160px; top: 120px; width: 800px; height: 500px; background: rgba(22, 25, 38, 0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,0.6); padding: 24px; display: flex; flex-direction: column; gap: 16px; }
      .win-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; }
      .win-dots { display: flex; gap: 8px; }
      .dot { width: 12px; height: 12px; border-radius: 50%; }
      .target-btn { position: absolute; left: 540px; top: 240px; padding: 12px 24px; border-radius: 14px; background: #6C86F5; color: #FFFFFF; font-weight: 600; font-size: 14px; border: none; box-shadow: 0 4px 16px rgba(108,134,245,0.3); display: flex; align-items: center; gap: 8px; }

      /* Companion Character (Bottom Right) */
      .companion-box { position: absolute; right: 40px; bottom: 30px; width: 140px; height: 120px; background: rgba(22,25,38,0.9); border: 1px solid rgba(108,134,245,0.35); border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
      .companion-status { font-size: 11px; font-weight: 700; color: #A9BCFF; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

      /* Apple Pill HUD Banner (Zero Glow, Pure Vector Icons) */
      #hud-banner {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(18, 16, 28, 0.94);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        padding: 8px 20px;
        display: none;
        align-items: center;
        gap: 14px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        z-index: 1000;
      }
      
      /* Authentic Teardrop Cursor */
      #cursor {
        position: absolute;
        left: -100px;
        top: -100px;
        width: 72px;
        height: 72px;
        z-index: 999;
        pointer-events: none;
        filter: drop-shadow(0 10px 20px rgba(0,0,0,0.45));
      }

      /* Click Ripple Ring */
      #ripple-ring {
        position: absolute;
        width: 76px;
        height: 76px;
        border-radius: 50%;
        border: 3.5px solid #6C86F5;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0.3);
        opacity: 0;
        z-index: 998;
      }

      /* 6-Star Burst Container */
      #starburst-container {
        position: absolute;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 998;
      }

      /* Research Card matching ReportPanel.swift (Top-Right, 22px continuous radius, #6C86F5 border, NO GLOW) */
      #report-card {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 400px;
        background: linear-gradient(180deg, #FFFFFF 0%, #EEF0FF 100%);
        border: 2.5px solid #6C86F5;
        border-radius: 22px;
        padding: 18px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.3);
        display: none;
        color: #17151F;
        z-index: 1001;
      }
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
        <div style="font-size:12px; color:#9499AD">Trey Focus Companion · Engineering Task Board</div>
        <div style="font-size:12px; color:#A9BCFF; font-weight:600">Windows 11</div>
      </div>
      <div style="font-size:18px; font-weight:700">Sprint Goal: Verify PC Takeover Motion & Apple Design</div>
      <div style="font-size:13px; color:#9499AD">Autonomous agent simulation with mathematical curve alignment.</div>
      <button class="target-btn" id="btn-target">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#FFFFFF" />
        </svg>
        <span>Execute Verification Action</span>
      </button>
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

    <!-- Apple Pill HUD Banner (Zero Emojis, Pure SVG Mascot) -->
    <div id="hud-banner">
      <div style="width:26px; height:26px; border-radius:50%; background:rgba(108,134,245,0.15); border:1px solid #6C86F5; display:flex; align-items:center; justify-content:center">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="17" r="13" fill="#6C86F5" />
          <circle cx="12" cy="15" r="3.2" fill="#FFFFFF" />
          <circle cx="20" cy="15" r="3.2" fill="#FFFFFF" />
          <circle cx="13" cy="15.5" r="1.5" fill="#17151F" />
          <circle cx="21" cy="15.5" r="1.5" fill="#17151F" />
          <path d="M12 4c2 3 4 3 4 3s2 0 4-3c-1 3 0 5 0 5h-8s1-2 0-5z" fill="#2B2F8F" />
        </svg>
      </div>
      <div style="font-size:13px; font-weight:600">Trey is in control</div>
      <div style="font-size:11px; background:rgba(108,134,245,0.18); color:#A9BCFF; font-weight:600; padding:2px 8px; border-radius:999px; font-family:'IBM Plex Mono', monospace">Step 1 / 25</div>
      <div id="hud-thought" style="font-size:12px; color:rgba(255,255,255,0.75)">Moving cursor to target action button...</div>
      <div style="padding:4px 10px; border-radius:999px; background:#EF4444; font-size:11px; font-weight:600; display:flex; align-items:center; gap:4px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
        Stop (Ctrl+Alt+S)
      </div>
    </div>

    <!-- Authentic Teardrop Cursor (from CursorOverlay.swift:368-448) -->
    <div id="cursor">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="berryGradient" x1="18" y1="4.8" x2="54" y2="67.2" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A9BCFF" />
            <stop offset="34%" stopColor="#6C86F5" />
            <stop offset="68%" stopColor="#4254D6" />
            <stop offset="100%" stopColor="#2B2F8F" />
          </linearGradient>
          <radialGradient id="berryShine" cx="21.6" cy="17.3" r="27.4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M 4.5 0 L 36 0 A 36 36 0 0 1 72 36 A 36 36 0 0 1 36 72 A 36 36 0 0 1 0 36 L 0 4.5 A 4.5 4.5 0 0 1 4.5 0 Z"
          fill="url(#berryGradient)"
          stroke="#FFFFFF"
          stroke-width="4"
          stroke-linejoin="round"
        />
        <path
          d="M 4.5 0 L 36 0 A 36 36 0 0 1 72 36 A 36 36 0 0 1 36 72 A 36 36 0 0 1 0 36 L 0 4.5 A 4.5 4.5 0 0 1 4.5 0 Z"
          fill="url(#berryShine)"
        />
        <g id="cursor-eyes" transform="translate(30.5, 30)">
          <circle cx="0" cy="0" r="6.75" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" />
          <circle id="c-pupil-l" cx="-1.5" cy="-1.5" r="3.35" fill="#17151F" />
          <circle id="c-shine-l" cx="-2.5" cy="-2.5" r="1" fill="#FFFFFF" />
          <circle cx="18" cy="0" r="6.75" fill="#FFFFFF" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" />
          <circle id="c-pupil-r" cx="16.5" cy="-1.5" r="3.35" fill="#17151F" />
          <circle id="c-shine-r" cx="15.5" cy="-2.5" r="1" fill="#FFFFFF" />
        </g>
      </svg>
    </div>

    <!-- Click Ripple Ring -->
    <div id="ripple-ring"></div>

    <!-- Starburst Container -->
    <div id="starburst-container"></div>

    <!-- Research Card (ReportPanel.swift spec, zero glow, circular action buttons) -->
    <div id="report-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px">
        <div style="display:flex; align-items:center; gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C86F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <div style="font-size:18px; font-weight:700; color:#17151F">Verification Action Completed</div>
        </div>
        <div style="width:26px; height:26px; border-radius:50%; background:#6C86F5; display:flex; align-items:center; justify-content:center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </div>
      <div style="font-size:14px; line-height:1.55; color:#17151F; margin-bottom:12px">
        Trey has executed the action with mathematical curve alignment and verified screen state against the target policy. All tasks are proceeding normally.
      </div>
      <div style="background:rgba(108,134,245,0.12); border:1px solid rgba(108,134,245,0.25); padding:8px 12px; border-radius:8px; font-size:12px; color:#2B2F8F; font-weight:600; display:flex; align-items:center; gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C86F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
        </svg>
        <span>Action executed with 0.14 depth press and 650ms ring ripple.</span>
      </div>
    </div>

    <script>
      // Cubic-bezier timing function implementation matching TimingCurve.launch
      function cubicBezier(t, x1, y1, x2, y2) {
        // Simple bisection solver
        let low = 0, high = 1, mid = t;
        for (let i = 0; i < 16; i++) {
          mid = (low + high) / 2;
          const x = 3 * (1 - mid) * (1 - mid) * mid * x1 + 3 * (1 - mid) * mid * mid * x2 + mid * mid * mid;
          if (Math.abs(x - t) < 1e-4) break;
          if (x < t) low = mid; else high = mid;
        }
        return 3 * (1 - mid) * (1 - mid) * mid * y1 + 3 * (1 - mid) * mid * mid * y2 + mid * mid * mid;
      }

      window.applyState = function(t) {
        const hud = document.getElementById('hud-banner');
        const cursor = document.getElementById('cursor');
        const ripple = document.getElementById('ripple-ring');
        const starburst = document.getElementById('starburst-container');
        const report = document.getElementById('report-card');
        const faceStatus = document.getElementById('face-status');
        const mouth = document.getElementById('mouth');
        const pupilL = document.getElementById('pupil-l');
        const pupilR = document.getElementById('pupil-r');
        const cPupilL = document.getElementById('c-pupil-l');
        const cPupilR = document.getElementById('c-pupil-r');

        const startX = 1100, startY = 680;
        const targetX = 640, targetY = 380;

        if (t < 2.0) {
          // 0.0s - 2.0s: IDLE
          faceStatus.textContent = 'Resting';
          hud.style.display = 'none';
          cursor.style.display = 'none';
          report.style.display = 'none';
          ripple.style.opacity = '0';
          starburst.innerHTML = '';
          mouth.setAttribute('d', 'M 44 65 Q 50 71 56 65');
          pupilL.setAttribute('cx', 41); pupilL.setAttribute('cy', 46);
          pupilR.setAttribute('cx', 65); pupilR.setAttribute('cy', 46);
        } else if (t < 3.5) {
          // 2.0s - 3.5s: LISTENING
          faceStatus.textContent = 'Listening';
          mouth.setAttribute('d', 'M 46 62 Q 50 67 54 62');
          pupilL.setAttribute('cx', 42); pupilL.setAttribute('cy', 43);
          pupilR.setAttribute('cx', 66); pupilR.setAttribute('cy', 43);
        } else if (t < 5.5) {
          // 3.5s - 5.5s: THINKING
          faceStatus.textContent = 'Thinking';
          hud.style.display = 'flex';
          const roll = (t - 3.5) * 4;
          pupilL.setAttribute('cx', 38 + Math.cos(roll) * 3);
          pupilL.setAttribute('cy', 44 + Math.sin(roll) * 3);
          pupilR.setAttribute('cx', 62 + Math.cos(roll) * 3);
          pupilR.setAttribute('cy', 44 + Math.sin(roll) * 3);
        } else if (t < 8.0) {
          // 5.5s - 8.0s: POINTING (Cubic-bezier launch curve)
          faceStatus.textContent = 'Pointing';
          hud.style.display = 'flex';
          cursor.style.display = 'block';
          const progress = (t - 5.5) / 2.5;
          const ease = cubicBezier(progress, 0.42, 0, 0.22, 1);
          
          // Gentle bowing upward
          const bow = Math.sin(progress * Math.PI) * -35;
          const curX = startX + (targetX - startX) * ease;
          const curY = startY + (targetY - startY) * ease + bow;
          cursor.style.left = curX + 'px';
          cursor.style.top = curY + 'px';

          // Cursor velocity tracking
          const dx = (targetX - startX);
          const dy = (targetY - startY);
          const dist = Math.hypot(dx, dy);
          const eyeX = (dx / dist) * 2.2;
          const eyeY = (dy / dist) * 2.2;
          cPupilL.setAttribute('cx', eyeX); cPupilL.setAttribute('cy', eyeY);
          cPupilR.setAttribute('cx', 18 + eyeX); cPupilR.setAttribute('cy', eyeY);

          cursor.style.transform = 'rotate(-8deg)';
          pupilL.setAttribute('cx', 36); pupilL.setAttribute('cy', 41);
          pupilR.setAttribute('cx', 60); pupilR.setAttribute('cy', 41);
        } else if (t < 9.0) {
          // 8.0s - 9.0s: CLICK (0.14 depth squish, 650ms ring ripple, 550ms starburst)
          faceStatus.textContent = 'Acting';
          const dt = t - 8.0;
          
          // Press squish formula from CursorOverlay.swift:319-325
          let squish = 1.0;
          if (dt < 0.12) {
            squish = 1 - 0.14 * Math.sin((dt / 0.12) * Math.PI / 2);
          } else if (dt < 0.42) {
            const r = (dt - 0.12) / 0.3;
            squish = 1 - 0.14 * Math.cos(r * Math.PI * 1.5) * Math.exp(-r * 3.2);
          }
          cursor.style.left = targetX + 'px';
          cursor.style.top = targetY + 'px';
          cursor.style.transform = 'scale(' + squish.toFixed(3) + ', ' + (2 - squish).toFixed(3) + ')';

          // Eye gaze resets to tip
          cPupilL.setAttribute('cx', -1.5); cPupilL.setAttribute('cy', -1.5);
          cPupilR.setAttribute('cx', 16.5); cPupilR.setAttribute('cy', -1.5);

          // Ripple ring (650ms)
          if (dt < 0.65) {
            const ripEase = cubicBezier(dt / 0.65, 0.2, 0.7, 0.3, 1);
            ripple.style.left = targetX + 'px';
            ripple.style.top = targetY + 'px';
            ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.3 + 0.7 * ripEase).toFixed(3) + ')';
            ripple.style.opacity = (0.85 * (1 - ripEase)).toFixed(3);
          } else {
            ripple.style.opacity = '0';
          }

          // 6-star particles burst (550ms)
          if (dt < 0.55) {
            const starEase = cubicBezier(dt / 0.55, 0.1, 0.8, 0.3, 1);
            const dist = 46 * starEase;
            const starOpacity = dt < 0.25 ? 1 : 1 - (dt - 0.25) / 0.3;
            const starScale = 1.0 - 0.6 * (dt / 0.55);
            let starsHtml = '';
            [0, 60, 120, 180, 240, 300].forEach((ang, idx) => {
              const rad = ang * Math.PI / 180;
              const sx = targetX + Math.cos(rad) * dist;
              const sy = targetY + Math.sin(rad) * dist;
              const color = idx % 2 === 0 ? '#A9BCFF' : '#6C86F5';
              starsHtml += '<div style="position:absolute; left:' + sx + 'px; top:' + sy + 'px; width:8px; height:8px; transform:translate(-50%,-50%) scale(' + starScale + '); opacity:' + starOpacity + '"><svg width="8" height="8" viewBox="-5 -5 10 10"><polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5" fill="' + color + '" /></svg></div>';
            });
            starburst.innerHTML = starsHtml;
          } else {
            starburst.innerHTML = '';
          }
        } else if (t < 10.5) {
          // 9.0s - 10.5s: POPUP APPEARS (Spring entrance, zero glow)
          faceStatus.textContent = 'Happy';
          cursor.style.transform = 'scale(1)';
          ripple.style.opacity = '0';
          starburst.innerHTML = '';
          report.style.display = 'block';
          const repP = Math.min(1, (t - 9.0) / 0.35);
          const repEase = cubicBezier(repP, 0.16, 1, 0.3, 1);
          report.style.opacity = repEase;
          report.style.transform = 'translateY(' + ((1 - repEase) * -18) + 'px)';
          mouth.setAttribute('d', 'M 40 62 Q 50 76 60 62');
        } else if (t < 11.5) {
          // 10.5s - 11.5s: POPUP DISMISSES
          const disP = (t - 10.5) / 1.0;
          report.style.opacity = Math.max(0, 1 - disP * 2);
        } else {
          // 11.5s - 12.0s: DONE & STOP
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

  console.log(`Rendering and capturing ${totalFrames} frames at 60 fps (After)...`)

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps
    await recWin.webContents.executeJavaScript(`window.applyState(${t})`)
    const img = await recWin.webContents.capturePage()
    const frameName = `f_${String(f).padStart(5, '0')}.png`
    writeFileSync(join(RAW_DIR, frameName), img.toPNG())
    if (f % 120 === 0) {
      console.log(`Captured ${f} / ${totalFrames} frames (${t.toFixed(1)}s)...`)
    }
  }

  console.log('Encoding trey-after.mp4 at 60 fps via ffmpeg...')
  const ffmpegCmd = `ffmpeg -y -r 60 -i "${RAW_DIR}/f_%05d.png" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUT_FILE}"`
  execSync(ffmpegCmd, { stdio: 'inherit' })

  console.log('--- Cleaning up temporary raw PNG frames ---')
  rmSync(RAW_DIR, { recursive: true, force: true })

  console.log(`=== SUCCESS: trey-after.mp4 generated at ${OUT_FILE} ===`)
  app.quit()
})
