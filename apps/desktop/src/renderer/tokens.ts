/**
 * Author: Chirag S
 * Company: Nomin
 * Copyright (c) 2026 Nomin / Chirag S
 *
 * Central Design Tokens for Trey Apple-Style Interface.
 */

export const tokens = {
  colors: {
    // Primary Accent Palette (Derived from Blueberry Reference)
    accent: {
      subtle: '#A9BCFF',
      primary: '#6C86F5',
      hover: '#5A75EA',
      active: '#4254D6',
      deep: '#2B2F8F',
      glow: 'rgba(108, 134, 245, 0.35)',
    },
    // Surfaces & Panels
    surface: {
      canvas: '#0E1017',
      card: '#161926',
      cardElevated: '#1C2033',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      bubble: '#FFFFFF',
      bubbleTint: '#EEF0FF',
      overlayBanner: 'rgba(18, 16, 28, 0.94)',
    },
    // Typography Colors
    text: {
      primary: '#FFFFFF',
      secondary: '#9499AD',
      tertiary: '#636A80',
      inverse: '#17151F',
      inverseSubtle: '#5D5873',
      link: '#6C86F5',
    },
    // Feedback
    status: {
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      dangerBg: 'rgba(239, 68, 68, 0.15)',
      dangerBorder: 'rgba(239, 68, 68, 0.4)',
    }
  },

  // 4px Spacing Grid
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },

  // Concentric Radii System
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    bubble: '16px',
    card: '22px',
    pill: '999px',
  },

  // Elevation
  shadows: {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.25)',
    card: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    overlay: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(108, 134, 245, 0.35)',
    bubble: '0 8px 24px rgba(0, 0, 0, 0.18)',
    danger: '0 4px 16px rgba(239, 68, 68, 0.45)',
  },

  // Typography
  font: {
    family: 'Inter, "Segoe UI Variable", -apple-system, BlinkMacSystemFont, sans-serif',
    familyMono: '"IBM Plex Mono", "SF Mono", Consolas, monospace',
    size: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      timer: '76px',
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },

  // Motion Springs & Easing
  motion: {
    spring: {
      gaze: { stiffness: 260, damping: 0.82 },
      cursorLean: { stiffness: 24, damping: 1.0 },
      cardExpand: { stiffness: 220, damping: 0.85 },
      speechBubble: { stiffness: 260, damping: 0.82 },
    },
    timing: {
      launch: 'cubic-bezier(0.42, 0, 0.22, 1)',
      redirect: 'cubic-bezier(0.25, 0.25, 0.22, 1)',
      ripple: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      starburst: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
      fade: 'ease-out 150ms',
    }
  }
}
