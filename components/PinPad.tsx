'use client'

import { useEffect, useRef, useState } from 'react'
import { Delete, Lock, X } from 'lucide-react'

interface Props {
  title: string                    // e.g. "Parent PIN to redeem"
  subtitle?: string
  onSuccess: (pin: string) => void // called with the verified PIN
  onClose: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

// Modal number pad for the parent PIN. If no PIN has been set yet, it switches
// to a two-step "create PIN" flow first, then hands back the new PIN.
export default function PinPad({ title, subtitle, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<'loading' | 'verify' | 'create' | 'confirm'>('loading')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog so keyboard and screen-reader users land here.
  useEffect(() => { dialogRef.current?.focus() }, [])

  useEffect(() => {
    fetch('/api/family-settings')
      .then((r) => r.json())
      .then((s) => setMode(s.has_pin ? 'verify' : 'create'))
      .catch(() => setMode('verify'))
  }, [])

  async function submit(value: string) {
    setError('')
    if (mode === 'create') {
      setFirstPin(value)
      setPin('')
      setMode('confirm')
      return
    }
    setBusy(true)
    const body = mode === 'confirm'
      ? { action: 'setup', new_pin: value }
      : { action: 'verify', pin: value }
    if (mode === 'confirm' && value !== firstPin) {
      setBusy(false)
      setError("PINs don't match — try again")
      setPin('')
      setFirstPin('')
      setMode('create')
      return
    }
    const res = await fetch('/api/parent/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (res.ok) {
      onSuccess(value)
      return
    }
    const err = await res.json().catch(() => null)
    setError(err?.error ?? `HTTP ${res.status}`)
    setPin('')
  }

  function press(k: string) {
    if (busy) return
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return }
    const next = (pin + k).slice(0, 6)
    setPin(next)
    setError('')
  }

  // Physical keyboard: digits, Backspace, Enter, Escape.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (mode === 'loading') return
    if (/^\d$/.test(e.key)) press(e.key)
    else if (e.key === 'Backspace') press('del')
    else if (e.key === 'Enter' && pin.length >= 4 && !busy) submit(pin)
    else return
    e.preventDefault()
  }

  const heading =
    mode === 'create' ? 'Create a parent PIN'
    : mode === 'confirm' ? 'Enter the new PIN again'
    : title
  const hint =
    mode === 'create' ? '4–6 digits. Keep it secret from the kids!'
    : mode === 'confirm' ? 'Just to be sure.'
    : subtitle

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="sticker pop w-full max-w-[340px] p-5 outline-none"
        style={{ background: 'var(--color-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center rounded-xl" style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--candy-grape) 18%, transparent)', color: 'var(--candy-grape-ink)' }}>
              <Lock size={16} />
            </span>
            <h2 className="text-lg leading-tight">{heading}</h2>
          </div>
          <button onClick={onClose} className="-m-2 w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0" aria-label="Close">
            <X size={18} color="var(--color-muted)" />
          </button>
        </div>
        {hint && <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>{hint}</p>}

        {/* Dots */}
        <div className="flex justify-center gap-2.5 my-4" aria-live="polite">
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: 14, height: 14,
                background: i < pin.length ? 'var(--candy-grape)' : 'var(--color-surface)',
                // --ink is near-black in dark mode, so use the text colour to
                // keep the empty dots visible in both themes.
                border: '2px solid var(--color-text)',
              }}
            />
          ))}
        </div>

        <p className="text-xs font-extrabold text-center mb-3 min-h-[16px]" style={{ color: 'var(--error-fg)' }}>
          {error}
        </p>

        {mode === 'loading' ? (
          <div className="skeleton h-48 w-full rounded-2xl" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {KEYS.map((k, i) =>
                k === '' ? <span key={i} /> : (
                  <button
                    key={i}
                    onClick={() => press(k)}
                    className="sticker-sm sticker-press h-12 flex items-center justify-center text-xl font-extrabold"
                    style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-baloo), cursive' }}
                    aria-label={k === 'del' ? 'Delete digit' : k}
                  >
                    {k === 'del' ? <Delete size={18} /> : k}
                  </button>
                ),
              )}
            </div>
            <button
              onClick={() => submit(pin)}
              disabled={pin.length < 4 || busy}
              className="sticker-sm sticker-press w-full h-11 font-extrabold text-white disabled:opacity-40"
              style={{ background: 'var(--candy-grape)' }}
            >
              {busy ? 'Checking…' : mode === 'create' ? 'Next' : 'OK'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
