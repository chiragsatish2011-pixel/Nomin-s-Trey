/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Automated Scenario Recorder for Autonomous PC Takeover:
 * "open chrome and open youtube and search technoblade"
 *
 * 60 FPS recording with pixel-accurate Windows 11 desktop, Google Chrome omnibox navigation,
 * YouTube search interaction, Technoblade verified channel recognition, authentic Apple motion physics,
 * teardrop cursor with velocity googly eyes, 650ms ripples, 550ms starburst, and top-right research card.
 */

import { app, BrowserWindow } from 'electron'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { execSync } from 'child_process'

const RAW_DIR = resolve('reference/recordings/raw_technoblade')
const OUT_FILE = resolve('reference/recordings/trey-technoblade.mp4')

if (existsSync(RAW_DIR)) {
  rmSync(RAW_DIR, { recursive: true, force: true })
}
mkdirSync(RAW_DIR, { recursive: true })

app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')
process.env.TREY_ALLOW_SCREEN_RECORDING = '1'

app.whenReady().then(async () => {
  console.log('--- Initializing 60fps Scenario Recording: Chrome -> YouTube -> Technoblade ---')

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

  const scenarioHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, "Segoe UI Variable", -apple-system, BlinkMacSystemFont, sans-serif; }
      body { background: #0E1017; color: #FFFFFF; width: 1280px; height: 800px; overflow: hidden; position: relative; }

      /* Desktop Wallpaper */
      .desktop-bg {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 30%, #171B2B 0%, #0A0C14 100%);
      }

      /* Desktop Icons */
      .desktop-icon {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 76px;
        padding: 8px 4px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .desktop-icon.selected {
        background: rgba(108, 134, 245, 0.25);
        outline: 1px solid rgba(108, 134, 245, 0.5);
      }
      .icon-label {
        font-size: 11px;
        color: #FFFFFF;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        text-align: center;
        line-height: 1.2;
      }

      /* Windows 11 Taskbar */
      .taskbar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 48px;
        background: rgba(18, 20, 30, 0.88);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        z-index: 50;
      }
      .taskbar-center {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tb-btn {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      .tb-btn:hover { background: rgba(255,255,255,0.06); }
      .taskbar-right {
        position: absolute;
        right: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: #A9BCFF;
      }

      /* Google Chrome Window */
      #chrome-window {
        position: absolute;
        left: 90px;
        top: 60px;
        width: 1100px;
        height: 670px;
        background: #1F2024;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 40;
      }

      .chrome-tabbar {
        height: 40px;
        background: #18191D;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 6px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .chrome-tab {
        height: 32px;
        background: #1F2024;
        border-radius: 8px 8px 0 0;
        padding: 0 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #E2E4EB;
        border-top: 2px solid #6C86F5;
      }
      .chrome-toolbar {
        height: 44px;
        background: #1F2024;
        display: flex;
        align-items: center;
        padding: 0 12px;
        gap: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .chrome-omnibox {
        flex: 1;
        height: 30px;
        background: #111216;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #E2E4EB;
        transition: border 0.15s ease;
      }
      .chrome-omnibox.focused {
        border-color: #6C86F5;
        box-shadow: 0 0 0 2px rgba(108,134,245,0.25);
      }

      /* YouTube Page View */
      .youtube-body {
        flex: 1;
        background: #0F0F0F;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .yt-nav {
        height: 56px;
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .yt-searchbox {
        display: flex;
        align-items: center;
        width: 520px;
        height: 38px;
        background: #121212;
        border: 1px solid #303030;
        border-radius: 999px;
        padding: 0 16px;
        gap: 10px;
        color: #FFFFFF;
        font-size: 14px;
        transition: border-color 0.15s ease;
      }
      .yt-searchbox.focused {
        border-color: #1C62B9;
      }
      .yt-content {
        flex: 1;
        padding: 24px 32px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Channel Result Card */
      .channel-card {
        display: flex;
        align-items: center;
        gap: 24px;
        padding: 20px 24px;
        background: #181818;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .channel-avatar {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF6B8B, #FF8E53);
        border: 2px solid #F59E0B;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        position: relative;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      }
      .channel-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .channel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 20px;
        font-weight: 700;
        color: #FFFFFF;
      }
      .verified-badge {
        width: 16px;
        height: 16px;
        fill: #AAAAAA;
      }
      .subscribe-btn {
        padding: 8px 18px;
        border-radius: 999px;
        background: #FFFFFF;
        color: #0F0F0F;
        font-weight: 600;
        font-size: 13px;
        border: none;
      }

      /* Video Result Items */
      .video-item {
        display: flex;
        gap: 18px;
        background: rgba(255,255,255,0.02);
        padding: 12px;
        border-radius: 12px;
      }
      .video-thumb {
        width: 220px;
        height: 124px;
        border-radius: 8px;
        background: #272727;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .video-time {
        position: absolute;
        bottom: 6px;
        right: 6px;
        background: rgba(0,0,0,0.8);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }

      /* Trey Companion Window */
      .companion-box {
        position: absolute;
        right: 36px;
        bottom: 62px;
        width: 140px;
        height: 120px;
        background: rgba(22,25,38,0.92);
        border: 1px solid rgba(108,134,245,0.35);
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        z-index: 100;
      }
      .companion-status {
        font-size: 11px;
        font-weight: 700;
        color: #A9BCFF;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Speech Bubble (downward tail, zero glow) */
      #speech-bubble {
        position: absolute;
        right: 40px;
        bottom: 192px;
        width: 260px;
        background: linear-gradient(180deg, #FFFFFF 0%, #EEF0FF 100%);
        border: 2.5px solid #6C86F5;
        border-radius: 16px;
        padding: 12px 14px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.35);
        color: #17151F;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        display: none;
        z-index: 101;
      }
      #speech-bubble::after {
        content: '';
        position: absolute;
        bottom: -10px;
        right: 50px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 10px solid #6C86F5;
      }

      /* Apple Pill HUD Banner */
      #hud-banner {
        position: absolute;
        top: 16px;
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

      /* Teardrop Cursor */
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

      /* Starburst Container */
      #starburst-container {
        position: absolute;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 998;
      }

      /* Research Report Card (Top-Right, 22px squircle, zero glow) */
      #report-card {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 420px;
        background: linear-gradient(180deg, #FFFFFF 0%, #EEF0FF 100%);
        border: 2.5px solid #6C86F5;
        border-radius: 22px;
        padding: 18px 20px;
        box-shadow: 0 20px 48px rgba(0,0,0,0.35);
        display: none;
        color: #17151F;
        z-index: 1001;
      }
    </style>
  </head>
  <body>
    <!-- Desktop Wallpaper -->
    <div class="desktop-bg"></div>

    <!-- Desktop Icons -->
    <div class="desktop-icon" id="chrome-icon" style="left: 40px; top: 40px;">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="#FFFFFF" fill-opacity="0.08" />
        <circle cx="24" cy="24" r="20" fill="#1F2024" />
        <circle cx="24" cy="24" r="9" fill="#1A73E8" />
        <circle cx="24" cy="24" r="7.5" fill="#FFFFFF" />
        <circle cx="24" cy="24" r="6" fill="#1A73E8" />
        <path d="M24 15 L39.5 15 A18 18 0 0 1 31.5 37 L24 24 Z" fill="#EA4335" />
        <path d="M31.5 37 L23.8 24 L16 37 A18 18 0 0 1 8.5 24 L24 24 Z" fill="#34A853" />
        <path d="M16 37 L24 24 L15 15 A18 18 0 0 0 8.5 24 L16 37 Z" fill="#FBBC05" />
      </svg>
      <div class="icon-label">Google Chrome</div>
    </div>

    <!-- Google Chrome Window -->
    <div id="chrome-window">
      <!-- Tab Bar -->
      <div class="chrome-tabbar">
        <div class="chrome-tab" id="tab-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#6C86F5"><circle cx="12" cy="12" r="10"/></svg>
          <span id="tab-label">New Tab</span>
        </div>
        <div style="font-size:16px; color:#8E92A4; padding:0 6px">+</div>
        <div style="margin-left:auto; display:flex; gap:12px; padding-right:6px">
          <span style="font-size:12px; color:#8E92A4">&#8212;</span>
          <span style="font-size:12px; color:#8E92A4">&#9633;</span>
          <span style="font-size:12px; color:#8E92A4">&#10005;</span>
        </div>
      </div>
      <!-- Omnibox Toolbar -->
      <div class="chrome-toolbar">
        <div style="display:flex; gap:12px; color:#8E92A4; font-size:14px">
          <span>&larr;</span>
          <span>&rarr;</span>
          <span>&#8635;</span>
        </div>
        <div class="chrome-omnibox" id="omnibox">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E92A4" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span id="omnibox-text" style="font-family:monospace; font-size:12px">chrome://newtab</span>
        </div>
      </div>
      <!-- YouTube Body Container -->
      <div class="youtube-body" id="yt-body" style="display:none">
        <div class="yt-nav">
          <div style="display:flex; align-items:center; gap:16px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <div style="display:flex; align-items:center; gap:6px">
              <svg width="28" height="20" viewBox="0 0 28 20"><rect width="28" height="20" rx="6" fill="#FF0000"/><polygon points="11,5 19,10 11,15" fill="#FFFFFF"/></svg>
              <span style="font-weight:700; font-size:16px; letter-spacing:-0.5px">YouTube</span>
            </div>
          </div>
          <!-- Centered YouTube Search Box -->
          <div class="yt-searchbox" id="yt-search">
            <span id="yt-search-text" style="color:#AAAAAA">Search</span>
            <span id="typing-cursor" style="display:none; width:2px; height:16px; background:#3EA6FF"></span>
            <div style="margin-left:auto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:18px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            <div style="width:30px; height:30px; border-radius:50%; background:#6C86F5; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700">T</div>
          </div>
        </div>
        <!-- YouTube Results View -->
        <div class="yt-content" id="yt-content">
          <!-- Official Technoblade Channel Card -->
          <div class="channel-card" id="technoblade-channel">
            <div class="channel-avatar">
              <svg width="84" height="84" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="#FFAAA6"/>
                <!-- Crown -->
                <polygon points="26,38 34,20 50,30 66,20 74,38" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
                <circle cx="50" cy="22" r="3" fill="#EF4444"/>
                <circle cx="34" cy="18" r="2.5" fill="#3B82F6"/>
                <circle cx="66" cy="18" r="2.5" fill="#3B82F6"/>
                <!-- Pig Face -->
                <ellipse cx="40" cy="52" rx="4" ry="5" fill="#000000"/>
                <ellipse cx="60" cy="52" rx="4" ry="5" fill="#000000"/>
                <rect x="42" y="60" width="16" height="10" rx="4" fill="#FF8E88" stroke="#D97770" stroke-width="1.5"/>
                <ellipse cx="46" cy="65" rx="1.5" ry="2" fill="#000000"/>
                <ellipse cx="54" cy="65" rx="1.5" ry="2" fill="#000000"/>
              </svg>
            </div>
            <div class="channel-info">
              <div class="channel-title">
                <span>Technoblade</span>
                <svg class="verified-badge" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div style="font-size:13px; color:#AAAAAA">@Technoblade &middot; 16.8M subscribers &middot; 99 videos</div>
              <div style="font-size:12px; color:#CCCCCC; margin-top:4px">
                Technoblade never dies. Minecraft PVP, Potato War champion, and legendary story-teller.
              </div>
            </div>
            <button class="subscribe-btn" id="btn-subscribe">Subscribed</button>
          </div>

          <!-- Video Item: The Great Potato War -->
          <div class="video-item">
            <div class="video-thumb" style="background:linear-gradient(135deg, #1E3A8A, #3B82F6)">
              <div style="font-size:13px; font-weight:700; text-align:center; padding:10px">The Great Potato War</div>
              <div class="video-time">17:42</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px">
              <div style="font-size:15px; font-weight:600; color:#FFFFFF">The Great Potato War (Part 1)</div>
              <div style="font-size:12px; color:#AAAAAA">Technoblade &middot; 36M views &middot; 4 years ago</div>
              <div style="font-size:12px; color:#CCCCCC; margin-top:4px">The story of how I became the #1 potato farmer in all of Hypixel Skyblock.</div>
            </div>
          </div>

          <!-- Video Item: Hardcore Steering Wheel -->
          <div class="video-item">
            <div class="video-thumb" style="background:linear-gradient(135deg, #831843, #BE185D)">
              <div style="font-size:13px; font-weight:700; text-align:center; padding:10px">Hardcore Steering Wheel</div>
              <div class="video-time">22:15</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px">
              <div style="font-size:15px; font-weight:600; color:#FFFFFF">Beating Minecraft Hardcore with a Steering Wheel</div>
              <div style="font-size:12px; color:#AAAAAA">Technoblade &middot; 19M views &middot; 3 years ago</div>
              <div style="font-size:12px; color:#CCCCCC; margin-top:4px">Keyboard and mouse are for casuals. True gamers play with racing hardware.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Windows 11 Taskbar -->
    <div class="taskbar">
      <div class="taskbar-center">
        <!-- Start Button -->
        <div class="tb-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#00A4EF">
            <rect x="2" y="2" width="9.5" height="9.5"/>
            <rect x="12.5" y="2" width="9.5" height="9.5"/>
            <rect x="2" y="12.5" width="9.5" height="9.5"/>
            <rect x="12.5" y="12.5" width="9.5" height="9.5"/>
          </svg>
        </div>
        <!-- Search -->
        <div class="tb-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E2E4EB" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <!-- File Explorer -->
        <div class="tb-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <!-- Chrome Taskbar Icon -->
        <div class="tb-btn" style="position:relative">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="#1F2024" />
            <circle cx="24" cy="24" r="9" fill="#1A73E8" />
            <circle cx="24" cy="24" r="7.5" fill="#FFFFFF" />
            <circle cx="24" cy="24" r="6" fill="#1A73E8" />
            <path d="M24 15 L39.5 15 A18 18 0 0 1 31.5 37 L24 24 Z" fill="#EA4335" />
            <path d="M31.5 37 L23.8 24 L16 37 A18 18 0 0 1 8.5 24 L24 24 Z" fill="#34A853" />
            <path d="M16 37 L24 24 L15 15 A18 18 0 0 0 8.5 24 L16 37 Z" fill="#FBBC05" />
          </svg>
        </div>
      </div>
      <div class="taskbar-right">
        <span>ENG</span>
        <span>10:00 AM</span>
      </div>
    </div>

    <!-- Trey Companion Face -->
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

    <!-- Speech Bubble -->
    <div id="speech-bubble">
      Task: "open chrome and open youtube and search technoblade". Taking control now...
    </div>

    <!-- Apple Pill HUD Banner -->
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
      <div id="hud-step" style="font-size:11px; background:rgba(108,134,245,0.18); color:#A9BCFF; font-weight:600; padding:2px 8px; border-radius:999px; font-family:'IBM Plex Mono', monospace">Step 1 / 3</div>
      <div id="hud-thought" style="font-size:12px; color:rgba(255,255,255,0.75)">Opening Google Chrome...</div>
      <div style="padding:4px 10px; border-radius:999px; background:#EF4444; font-size:11px; font-weight:600; display:flex; align-items:center; gap:4px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
        Stop (Ctrl+Alt+S)
      </div>
    </div>

    <!-- Authentic Teardrop Cursor (CursorOverlay.swift:368-448) -->
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

    <!-- Research Report Card (Top-Right, 22px squircle, zero glow) -->
    <div id="report-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px">
        <div style="display:flex; align-items:center; gap:8px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C86F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <div style="font-size:17px; font-weight:700; color:#17151F">Technoblade on YouTube</div>
        </div>
        <div style="width:26px; height:26px; border-radius:50%; background:#6C86F5; display:flex; align-items:center; justify-content:center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </div>
      <div style="font-size:13px; line-height:1.55; color:#17151F; margin-bottom:12px">
        Autonomous PC takeover completed: Launched Google Chrome, navigated to YouTube, and searched <strong>"technoblade"</strong>. Verified official channel with 16.8M+ subscribers and iconic video catalog.
      </div>
      <div style="background:rgba(108,134,245,0.12); border:1px solid rgba(108,134,245,0.25); padding:8px 12px; border-radius:8px; font-size:12px; color:#2B2F8F; font-weight:600; display:flex; align-items:center; gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C86F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>youtube.com/@Technoblade &middot; Technoblade never dies</span>
      </div>
    </div>

    <script>
      function cubicBezier(t, x1, y1, x2, y2) {
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
        const hudStep = document.getElementById('hud-step');
        const hudThought = document.getElementById('hud-thought');
        const cursor = document.getElementById('cursor');
        const ripple = document.getElementById('ripple-ring');
        const starburst = document.getElementById('starburst-container');
        const report = document.getElementById('report-card');
        const speech = document.getElementById('speech-bubble');
        const faceStatus = document.getElementById('face-status');
        const mouth = document.getElementById('mouth');
        const pupilL = document.getElementById('pupil-l');
        const pupilR = document.getElementById('pupil-r');
        const cPupilL = document.getElementById('c-pupil-l');
        const cPupilR = document.getElementById('c-pupil-r');

        const chromeWin = document.getElementById('chrome-window');
        const chromeIcon = document.getElementById('chrome-icon');
        const omnibox = document.getElementById('omnibox');
        const omniboxText = document.getElementById('omnibox-text');
        const tabTitle = document.getElementById('tab-title');
        const tabLabel = document.getElementById('tab-label');
        const ytBody = document.getElementById('yt-body');
        const ytSearch = document.getElementById('yt-search');
        const ytSearchText = document.getElementById('yt-search-text');
        const typingCursor = document.getElementById('typing-cursor');

        // Key Points:
        // Trey Origin: (1120, 700)
        // Chrome Desktop Icon: (70, 70)
        // Chrome Omnibox: (500, 122)
        // YouTube Search Bar: (640, 130)

        if (t < 2.0) {
          // --- Phase 1: Idle & Push-To-Talk ---
          faceStatus.textContent = 'Listening';
          mouth.setAttribute('d', 'M 46 62 Q 50 67 54 62');
          pupilL.setAttribute('cx', 42); pupilL.setAttribute('cy', 43);
          pupilR.setAttribute('cx', 66); pupilR.setAttribute('cy', 43);

          speech.style.display = t > 0.4 ? 'block' : 'none';
          hud.style.display = 'none';
          cursor.style.display = 'none';
          chromeWin.style.display = 'none';
          report.style.display = 'none';
          ripple.style.opacity = '0';
          starburst.innerHTML = '';
        } else if (t < 5.0) {
          // --- Phase 2: Launch Cursor -> Travel to Chrome Desktop Icon ---
          speech.style.display = 'none';
          hud.style.display = 'flex';
          hudStep.textContent = 'Step 1 / 3';
          hudThought.textContent = 'Locating and launching Google Chrome...';
          faceStatus.textContent = 'Pointing';
          cursor.style.display = 'block';

          const progress = Math.min(1, (t - 2.0) / 2.6);
          const ease = cubicBezier(progress, 0.42, 0, 0.22, 1);
          const startX = 1120, startY = 700;
          const targetX = 76, targetY = 76;
          const bow = Math.sin(progress * Math.PI) * -50;

          const curX = startX + (targetX - startX) * ease;
          const curY = startY + (targetY - startY) * ease + bow;
          cursor.style.left = curX + 'px';
          cursor.style.top = curY + 'px';

          // Eye velocity tracking
          const dx = targetX - startX, dy = targetY - startY;
          const dist = Math.hypot(dx, dy);
          const eyeX = (dx / dist) * 2.2;
          const eyeY = (dy / dist) * 2.2;
          cPupilL.setAttribute('cx', eyeX); cPupilL.setAttribute('cy', eyeY);
          cPupilR.setAttribute('cx', 18 + eyeX); cPupilR.setAttribute('cy', eyeY);

          pupilL.setAttribute('cx', 36); pupilL.setAttribute('cy', 40);
          pupilR.setAttribute('cx', 60); pupilR.setAttribute('cy', 40);
          cursor.style.transform = 'rotate(-12deg)';

          if (progress > 0.95) {
            chromeIcon.classList.add('selected');
          }
        } else if (t < 6.2) {
          // --- Phase 3: Double Click Chrome Icon + Ripple ---
          faceStatus.textContent = 'Acting';
          const dt = t - 5.0;
          const targetX = 76, targetY = 76;

          let squish = 1.0;
          if (dt < 0.12) {
            squish = 1 - 0.14 * Math.sin((dt / 0.12) * Math.PI / 2);
          } else if (dt < 0.4) {
            const r = (dt - 0.12) / 0.28;
            squish = 1 - 0.14 * Math.cos(r * Math.PI * 1.5) * Math.exp(-r * 3.2);
          }
          cursor.style.left = targetX + 'px';
          cursor.style.top = targetY + 'px';
          cursor.style.transform = 'scale(' + squish.toFixed(3) + ', ' + (2 - squish).toFixed(3) + ')';

          // Ripple
          if (dt < 0.65) {
            const ripEase = cubicBezier(dt / 0.65, 0.2, 0.7, 0.3, 1);
            ripple.style.left = (targetX + 36) + 'px';
            ripple.style.top = (targetY + 36) + 'px';
            ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.3 + 0.7 * ripEase).toFixed(3) + ')';
            ripple.style.opacity = (0.85 * (1 - ripEase)).toFixed(3);
          } else {
            ripple.style.opacity = '0';
          }

          // Starburst
          if (dt < 0.55) {
            const starEase = cubicBezier(dt / 0.55, 0.1, 0.8, 0.3, 1);
            const dist = 46 * starEase;
            const starOpacity = dt < 0.25 ? 1 : 1 - (dt - 0.25) / 0.3;
            const starScale = 1.0 - 0.6 * (dt / 0.55);
            let starsHtml = '';
            [0, 60, 120, 180, 240, 300].forEach((ang, idx) => {
              const rad = ang * Math.PI / 180;
              const sx = (targetX + 36) + Math.cos(rad) * dist;
              const sy = (targetY + 36) + Math.sin(rad) * dist;
              const color = idx % 2 === 0 ? '#A9BCFF' : '#6C86F5';
              starsHtml += '<div style="position:absolute; left:' + sx + 'px; top:' + sy + 'px; width:8px; height:8px; transform:translate(-50%,-50%) scale(' + starScale + '); opacity:' + starOpacity + '"><svg width="8" height="8" viewBox="-5 -5 10 10"><polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5" fill="' + color + '" /></svg></div>';
            });
            starburst.innerHTML = starsHtml;
          } else {
            starburst.innerHTML = '';
          }
        } else if (t < 9.5) {
          // --- Phase 4: Chrome Opens -> Teardrop Travels to Omnibox & Types youtube.com ---
          ripple.style.opacity = '0';
          starburst.innerHTML = '';
          chromeWin.style.display = 'flex';
          const openP = Math.min(1, (t - 6.2) / 0.35);
          const openEase = cubicBezier(openP, 0.16, 1, 0.3, 1);
          chromeWin.style.opacity = openEase;
          chromeWin.style.transform = 'scale(' + (0.94 + 0.06 * openEase) + ')';

          hudStep.textContent = 'Step 2 / 3';
          hudThought.textContent = 'Navigating Chrome to https://www.youtube.com...';
          faceStatus.textContent = 'Pointing';

          // Pointer moves to Omnibox
          const travelP = Math.min(1, Math.max(0, (t - 6.6) / 1.0));
          const travelEase = cubicBezier(travelP, 0.42, 0, 0.22, 1);
          const curX = 76 + (480 - 76) * travelEase;
          const curY = 76 + (124 - 76) * travelEase;
          cursor.style.left = curX + 'px';
          cursor.style.top = curY + 'px';
          cursor.style.transform = 'rotate(-5deg)';

          if (t > 7.6) {
            omnibox.classList.add('focused');
            // Typing youtube.com
            const url = 'https://www.youtube.com';
            const typeP = Math.min(1, (t - 7.6) / 1.4);
            const chars = Math.floor(typeP * url.length);
            omniboxText.textContent = url.slice(0, chars) + (t % 0.4 < 0.2 ? '|' : '');
            omniboxText.style.color = '#FFFFFF';
            faceStatus.textContent = 'Acting';
          }
        } else if (t < 13.8) {
          // --- Phase 5: YouTube Homepage Loads -> Travel to YouTube Search Bar & Type "technoblade" ---
          ytBody.style.display = 'flex';
          tabLabel.textContent = 'YouTube';
          tabTitle.querySelector('svg').setAttribute('fill', '#FF0000');
          omniboxText.textContent = 'https://www.youtube.com';
          omnibox.classList.remove('focused');

          hudStep.textContent = 'Step 3 / 3';
          hudThought.textContent = 'Searching "technoblade" on YouTube...';

          // Travel from omnibox to YouTube Search input (x: 640, y: 130)
          const travelP = Math.min(1, Math.max(0, (t - 9.5) / 1.0));
          const travelEase = cubicBezier(travelP, 0.42, 0, 0.22, 1);
          const curX = 480 + (640 - 480) * travelEase;
          const curY = 124 + (132 - 124) * travelEase;
          cursor.style.left = curX + 'px';
          cursor.style.top = curY + 'px';

          if (t > 10.6) {
            ytSearch.classList.add('focused');
            typingCursor.style.display = 'inline-block';
            const query = 'technoblade';
            const typeP = Math.min(1, (t - 10.6) / 1.8);
            const chars = Math.floor(typeP * query.length);
            ytSearchText.textContent = query.slice(0, chars);
            ytSearchText.style.color = '#FFFFFF';

            // Click ripple at start of search field focus
            const dt = t - 10.6;
            if (dt < 0.5) {
              const ripEase = cubicBezier(dt / 0.5, 0.2, 0.7, 0.3, 1);
              ripple.style.left = '640px';
              ripple.style.top = '145px';
              ripple.style.transform = 'translate(-50%, -50%) scale(' + (0.3 + 0.7 * ripEase).toFixed(3) + ')';
              ripple.style.opacity = (0.8 * (1 - ripEase)).toFixed(3);
            } else {
              ripple.style.opacity = '0';
            }
          }

          if (t > 12.8) {
            // Enter key simulated
            typingCursor.style.display = 'none';
            hudThought.textContent = 'Executing search for "technoblade"...';
          }
        } else if (t < 17.5) {
          // --- Phase 6: Technoblade Channel Loaded & Top-Right Report Card Display ---
          typingCursor.style.display = 'none';
          ytSearchText.textContent = 'technoblade';
          tabLabel.textContent = 'technoblade - YouTube';
          hudStep.textContent = 'Complete';
          hudThought.textContent = 'Found Technoblade official channel and videos.';
          faceStatus.textContent = 'Happy';

          // Cursor hovers proudly over Subscribe button (x: 820, y: 260)
          const curP = Math.min(1, (t - 13.8) / 0.8);
          const curEase = cubicBezier(curP, 0.42, 0, 0.22, 1);
          cursor.style.left = (640 + (820 - 640) * curEase) + 'px';
          cursor.style.top = (132 + (260 - 132) * curEase) + 'px';
          cursor.style.transform = 'scale(1)';

          // Companion Face winks / smiles happily
          mouth.setAttribute('d', 'M 40 62 Q 50 76 60 62');
          pupilL.setAttribute('cx', 41); pupilL.setAttribute('cy', 46);
          pupilR.setAttribute('cx', 65); pupilR.setAttribute('cy', 46);

          // Report card slides in
          report.style.display = 'block';
          const repP = Math.min(1, (t - 14.2) / 0.45);
          const repEase = cubicBezier(repP, 0.16, 1, 0.3, 1);
          report.style.opacity = repEase;
          report.style.transform = 'translateY(' + ((1 - repEase) * -20) + 'px)';
        } else {
          // --- Phase 7: Clean End State ---
          faceStatus.textContent = 'Happy';
          cursor.style.display = 'none';
          hud.style.display = 'none';
        }
      };
    </script>
  </body>
  </html>
  `

  await recWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(scenarioHtml)}`)
  await new Promise((r) => setTimeout(r, 800))

  const totalSeconds = 18.0
  const fps = 60
  const totalFrames = Math.round(totalSeconds * fps)

  console.log(`Rendering and capturing ${totalFrames} frames at 60 fps (Chrome -> YouTube -> Technoblade)...`)

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

  console.log('Encoding trey-technoblade.mp4 at 60 fps via ffmpeg...')
  const ffmpegCmd = `ffmpeg -y -r 60 -i "${RAW_DIR}/f_%05d.png" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${OUT_FILE}"`
  execSync(ffmpegCmd, { stdio: 'inherit' })

  console.log('--- Cleaning up temporary raw PNG frames ---')
  rmSync(RAW_DIR, { recursive: true, force: true })

  console.log(`=== SUCCESS: trey-technoblade.mp4 generated at ${OUT_FILE} ===`)
  app.quit()
})
