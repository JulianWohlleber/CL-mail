import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{tsx,ts,html}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['"iA Writer Duo"', '"iA Writer Quattro"', 'system-ui', 'sans-serif'],
      mono: ['"iA Writer Mono"', 'ui-monospace', 'monospace']
    },
    extend: {
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          tertiary: 'var(--ink-tertiary)',
          faint: 'var(--ink-faint)'
        },
        paper: {
          DEFAULT: 'var(--paper)',
          raised: 'var(--paper-raised)',
          sunken: 'var(--paper-sunken)',
          overlay: 'var(--paper-overlay)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)'
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)'
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }]
      },
      spacing: {
        '0.5': '4px',
        '1': '8px',
        '1.5': '12px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
        '8': '64px',
        '10': '80px',
        '12': '96px',
        '16': '128px'
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px'
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.04)',
        soft: '0 2px 8px rgba(0,0,0,0.06)',
        elevated: '0 4px 16px rgba(0,0,0,0.08)',
        overlay: '0 8px 32px rgba(0,0,0,0.12)'
      },
      maxWidth: {
        reading: '680px'
      },
      transitionDuration: {
        DEFAULT: '120ms'
      }
    }
  },
  plugins: []
} satisfies Config
