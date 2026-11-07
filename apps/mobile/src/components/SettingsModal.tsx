/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Mobile Settings Modal for Trey Mobile.
 */

import React, { useState } from 'react'
import { StorageService, AppMode, AppTheme } from '../services/StorageService'
import { X, Key, Shield, Smartphone, Sliders, Moon, Sun } from 'lucide-react'

interface SettingsModalProps {
  onClose: () => void
  onModeChanged: (mode: AppMode) => void
  onThemeChanged: (theme: AppTheme) => void
  onDisconnectDesktop: () => void
  currentMode: AppMode
  currentTheme: AppTheme
  pairedHostname?: string
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onModeChanged,
  onThemeChanged,
  onDisconnectDesktop,
  currentMode,
  currentTheme,
  pairedHostname
}) => {
  const [apiKey, setApiKey] = useState(StorageService.getNimApiKey())
  const [model, setModel] = useState(StorageService.getNimModel())
  const [savedMsg, setSavedMsg] = useState(false)

  const handleSaveApiKey = () => {
    StorageService.setNimApiKey(apiKey)
    StorageService.setNimModel(model)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10, 13, 20, 0.9)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 20
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108, 134, 245, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={18} color="#6C86F5" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>Trey Settings</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Operation modes and AI configuration</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F8FAFC',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Mode Switcher */}
        <div style={{ background: '#121826', borderRadius: 18, padding: 18, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginBottom: 12 }}>
            App Operation Mode
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => onModeChanged('companion')}
              style={{
                padding: '14px 12px',
                borderRadius: 14,
                background: currentMode === 'companion' ? 'rgba(108, 134, 245, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: currentMode === 'companion' ? '1px solid #6C86F5' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <Smartphone size={20} color={currentMode === 'companion' ? '#6C86F5' : '#94A3B8'} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>Companion</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Paired to PC</div>
            </button>

            <button
              onClick={() => onModeChanged('standalone')}
              style={{
                padding: '14px 12px',
                borderRadius: 14,
                background: currentMode === 'standalone' ? 'rgba(108, 134, 245, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: currentMode === 'standalone' ? '1px solid #6C86F5' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <Shield size={20} color={currentMode === 'standalone' ? '#6C86F5' : '#94A3B8'} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>Standalone</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Direct AI assistant</div>
            </button>
          </div>
        </div>

        {/* Standalone NVIDIA NIM Key Configuration */}
        <div style={{ background: '#121826', borderRadius: 18, padding: 18, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Key size={16} color="#6C86F5" />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
              Standalone NVIDIA NIM Key
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
            Required for direct AI voice and chat assistance when running without a PC.
          </div>
          <input
            type="password"
            placeholder="nvapi-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 10,
              padding: '10px 12px',
              color: '#F8FAFC',
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none',
              marginBottom: 10
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '6px 10px',
                color: '#F8FAFC',
                fontSize: 12
              }}
            >
              <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct</option>
              <option value="nvidia/nemotron-4-340b-instruct">nvidia/nemotron-4-340b-instruct</option>
              <option value="meta/llama-3.2-11b-vision-instruct">meta/llama-3.2-11b-vision-instruct</option>
            </select>

            <button
              onClick={handleSaveApiKey}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: '#6C86F5',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {savedMsg ? 'Saved ✓' : 'Save Key'}
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ background: '#121826', borderRadius: 18, padding: 18, border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>Color Theme</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Toggle berry dark and crisp light theme</div>
          </div>
          <button
            onClick={() => onThemeChanged(currentTheme === 'dark' ? 'light' : 'dark')}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            {currentTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>

        {/* Paired Desktop & Disconnect */}
        {pairedHostname && (
          <div style={{ background: '#121826', borderRadius: 18, padding: 18, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
              Paired Computer
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
              Connected to <strong>{pairedHostname}</strong>
            </div>
            <button
              onClick={onDisconnectDesktop}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Unpair from this Desktop
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
