import { useState } from 'react'

interface Props {
  onComplete: () => void
}

const STEPS = [
  {
    title: 'Welcome to mail_space',
    content: 'A keyboard-first mail client inspired by Superhuman, designed with the clean aesthetics of iA Writer.',
    tip: 'This quick tutorial will show you the key features.'
  },
  {
    title: 'Navigate with your keyboard',
    content: 'Use J/K or arrow keys to move through your inbox. Press Enter to open a conversation, Escape to go back.',
    keys: [
      { key: 'J / ↓', label: 'Next email' },
      { key: 'K / ↑', label: 'Previous email' },
      { key: 'Enter', label: 'Open' },
      { key: 'Escape', label: 'Back' }
    ]
  },
  {
    title: 'Act instantly',
    content: 'Archive, trash, star, and reply without ever leaving the keyboard.',
    keys: [
      { key: 'E', label: 'Archive' },
      { key: '#', label: 'Trash' },
      { key: 'S', label: 'Star' },
      { key: 'R', label: 'Reply' },
      { key: 'C', label: 'Compose' }
    ]
  },
  {
    title: 'Jump to any folder',
    content: 'Use G followed by a letter to instantly navigate to any folder.',
    keys: [
      { key: 'G then I', label: 'Inbox' },
      { key: 'G then S', label: 'Sent' },
      { key: 'G then D', label: 'Drafts' },
      { key: 'G then A', label: 'Archive' },
      { key: 'G then T', label: 'Trash' }
    ]
  },
  {
    title: 'Command Palette',
    content: 'Press ⌘K to open the command palette. Search and run any action instantly — navigate, compose, change settings, and more.',
    keys: [
      { key: '⌘K', label: 'Open command palette' }
    ]
  },
  {
    title: 'Snooze & Reminders',
    content: 'Press H to snooze an email — it disappears and comes back at the time you choose. Use the clock icon to set a follow-up reminder.',
    keys: [
      { key: 'H', label: 'Snooze' },
      { key: '🕐', label: 'Remind if no reply' }
    ]
  },
  {
    title: 'Undo Send & Schedule',
    content: 'After sending, you have 5 seconds to undo. Or click the ▾ next to Send to schedule for later — tomorrow morning, afternoon, or a custom time.',
    keys: [
      { key: '⌘Z', label: 'Undo send' },
      { key: '▾', label: 'Schedule send' }
    ]
  },
  {
    title: 'Customize shortcuts',
    content: 'Press ? to see all shortcuts. Click any shortcut to record a new key binding — make mail_space work exactly how you want.',
    keys: [
      { key: '?', label: 'View & edit shortcuts' }
    ]
  },
  {
    title: 'You\'re ready!',
    content: 'Press / to search, ⌘, for settings, ⌘⇧F for focus mode. Enjoy your new inbox.',
    tip: 'Tip: archive aggressively with E to keep your inbox clean. Everything stays searchable.'
  }
]

export function Tutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <div
        className="relative w-[480px] rounded-xl overflow-hidden"
        style={{ backgroundColor: '#ffffff', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
      >
        {/* Progress bar */}
        <div className="h-[3px] w-full" style={{ backgroundColor: '#e5e5e0' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              backgroundColor: '#2b3fa0'
            }}
          />
        </div>

        <div className="px-8 py-6">
          {/* Step counter */}
          <div className="font-mono mb-4" style={{ fontSize: '12px', color: '#8a8a86' }}>
            {step + 1} / {STEPS.length}
          </div>

          {/* Title */}
          <h2 className="mb-3" style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
            {current.title}
          </h2>

          {/* Content */}
          <p className="mb-4" style={{ fontSize: '15px', color: '#4a4a48', lineHeight: 1.7 }}>
            {current.content}
          </p>

          {/* Key shortcuts */}
          {current.keys && (
            <div className="mb-4 space-y-2">
              {current.keys.map((k) => (
                <div key={k.key} className="flex items-center gap-3">
                  <span
                    className="font-mono px-2 py-1 rounded text-center"
                    style={{
                      fontSize: '13px',
                      minWidth: '70px',
                      backgroundColor: '#f0f0ec',
                      border: '1px solid #e5e5e0',
                      color: '#1a1a1a'
                    }}
                  >
                    {k.key}
                  </span>
                  <span style={{ fontSize: '14px', color: '#4a4a48' }}>{k.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div
              className="px-3 py-2 rounded mb-4"
              style={{ backgroundColor: '#f0f0ec', fontSize: '13px', color: '#4a4a48' }}
            >
              {current.tip}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => { onComplete(); window.api.setSetting('tutorialComplete', true) }}
              style={{ fontSize: '13px', color: '#8a8a86' }}
            >
              Skip tutorial
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded"
                  style={{ fontSize: '14px', color: '#4a4a48', border: '1px solid #e5e5e0' }}
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    onComplete()
                    window.api.setSetting('tutorialComplete', true)
                  } else {
                    setStep(step + 1)
                  }
                }}
                className="px-5 py-2 rounded font-bold text-white"
                style={{ fontSize: '14px', backgroundColor: '#2b3fa0' }}
              >
                {isLast ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
