'use client'

import { useEffect, useRef, useState } from 'react'
import { Undo2, X } from 'lucide-react'

interface Props {
  message: string
  // When provided, an "Undo" action is shown. Called if the user taps Undo.
  onUndo?: () => void
  // Called when the toast finishes (timeout or manual close) WITHOUT an undo —
  // i.e. the place to commit the deferred action.
  onDismiss: () => void
  // Milliseconds before auto-dismiss. Default 5s (toast-dismiss: 3–5s).
  duration?: number
}

// A single, self-dismissing toast pinned just above the bottom nav. Announces
// via aria-live="polite" and does NOT steal focus (toast-accessibility). The
// owner controls visibility by mounting/unmounting this component.
export default function Toast({ message, onUndo, onDismiss, duration = 5000 }: Props) {
  const [leaving, setLeaving] = useState(false)
  // Guard so a timeout firing after an Undo tap can't also commit the dismiss.
  const settled = useRef(false)

  function finish(undo: boolean) {
    if (settled.current) return
    settled.current = true
    setLeaving(true)
    // Let the exit transition play before the owner unmounts us.
    setTimeout(() => (undo ? onUndo?.() : onDismiss()), 160)
  }

  useEffect(() => {
    const t = setTimeout(() => finish(false), duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-50 mx-auto px-4"
      style={{
        maxWidth: 480,
        bottom: 'calc(60px + env(safe-area-inset-bottom) + 12px)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
        style={{
          background: 'var(--color-text)',
          color: 'var(--color-bg)',
          pointerEvents: 'auto',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}
      >
        <span className="flex-1 text-sm font-bold leading-snug">{message}</span>

        {onUndo && (
          <button
            onClick={() => finish(true)}
            className="flex items-center gap-1 text-sm font-bold flex-shrink-0 px-1"
            style={{ color: 'var(--color-primary)' }}
          >
            <Undo2 size={15} /> Undo
          </button>
        )}

        <button
          onClick={() => finish(false)}
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: 'color-mix(in srgb, var(--color-bg) 18%, transparent)' }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
