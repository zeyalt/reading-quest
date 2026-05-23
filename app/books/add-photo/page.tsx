'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, CATEGORY_COLORS, LANGUAGES, Category, Language } from '@/lib/types'
import { Sparkles, BookOpen, Camera, Search, AlertCircle, ChevronLeft } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'

// Resize and re-encode an image client-side so we stay well under Vercel's
// 4.5MB request body limit. 1568px is Anthropic's recommended max edge for vision.
async function fileToResizedBase64(
  file: File,
  maxEdge = 1568,
  quality = 0.85,
): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const longest = Math.max(width, height)
      if (longest > maxEdge) {
        const scale = maxEdge / longest
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported on this device'))
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to encode image'))
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            // Strip the "data:image/jpeg;base64," prefix; Claude wants raw base64
            const base64 = result.split(',')[1]
            resolve({ data: base64, mediaType: 'image/jpeg' })
          }
          reader.onerror = () => reject(new Error('Failed to read image data'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

interface DetectedBook {
  title: string
  author: string
  category: Category
  language: Language
  total_pages: number | ''
  include: boolean
  duplicate: boolean
  pagesLoading: boolean
}

type Step = 'capture' | 'analyzing' | 'confirm' | 'success'

export default function AddPhotoPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('capture')
  const [preview, setPreview] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedBook[]>([])
  const [addedCount, setAddedCount] = useState(0)
  const [error, setError] = useState('')
  const [lastAnalysis, setLastAnalysis] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const now = Date.now()
    if (now - lastAnalysis < 30000) {
      setError('Please wait 30 seconds between analyses.')
      return
    }

    setError('')
    setPreview(URL.createObjectURL(file))
    setStep('analyzing')

    try {
      // Resize + encode the photo on-device. We send it inline to the API
      // (Claude Vision accepts base64), avoiding a storage round-trip entirely.
      const { data: imageData, mediaType } = await fileToResizedBase64(file)

      // Identify books
      const identRes = await fetch('/api/identify-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, media_type: mediaType }),
      })

      if (!identRes.ok) throw new Error('Failed to analyze photo')
      const { books: identified } = await identRes.json()

      if (!identified || identified.length === 0) {
        setError("Couldn't identify any books. Try a clearer photo with visible spines.")
        setStep('capture')
        return
      }

      // Fetch existing books for duplicate detection
      const existingRes = await fetch('/api/books')
      const existing: Array<{ title: string }> = await existingRes.json()
      const existingTitles = new Set(existing.map((b) => b.title.toLowerCase().trim()))

      // Build detected list with page lookups
      const detectedList: DetectedBook[] = identified.map((b: { title: string; author: string; category: string }) => ({
        title: b.title,
        author: b.author,
        category: (CATEGORIES.includes(b.category as Category) ? b.category : 'Other') as Category,
        language: 'English' as Language,
        total_pages: '' as '',
        include: !existingTitles.has(b.title.toLowerCase().trim()),
        duplicate: existingTitles.has(b.title.toLowerCase().trim()),
        pagesLoading: true,
      }))

      setDetected(detectedList)
      setStep('confirm')
      setLastAnalysis(now)

      // Look up pages in parallel
      const updated = [...detectedList]
      await Promise.all(
        detectedList.map(async (book, idx) => {
          const pRes = await fetch('/api/lookup-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: book.title, author: book.author }),
          })
          const { page_count } = await pRes.json()
          updated[idx] = { ...updated[idx], total_pages: page_count ?? '', pagesLoading: false }
        }),
      )
      setDetected([...updated])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again?')
      setStep('capture')
    }
  }

  async function handleAddSelected() {
    const toAdd = detected.filter((b) => b.include && b.total_pages !== '')
    if (toAdd.length === 0) {
      setError('Please fill in page counts for selected books.')
      return
    }
    setSaving(true)
    let count = 0
    for (const book of toAdd) {
      const color = CATEGORY_COLORS[book.category]
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          total_pages: Number(book.total_pages),
          category: book.category,
          language: book.language,
          cover_color: color,
        }),
      })
      if (res.ok) count++
    }
    setAddedCount(count)
    setStep('success')
    setSaving(false)
  }

  function updateDetected(idx: number, patch: Partial<DetectedBook>) {
    setDetected((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }

  if (step === 'success') {
    return (
      <div className="p-4 tab-content flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex justify-center mb-4">
          <Sparkles size={56} style={{ color: '#FF6B35' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          {addedCount} Book{addedCount !== 1 ? 's' : ''} Added!
        </h1>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setStep('capture'); setDetected([]); setPreview(null) }}
            className="px-5 py-3 rounded-xl font-bold"
            style={{ background: '#F0E8E0', color: '#9A9A9A' }}
          >
            Add More
          </button>
          <button
            onClick={() => router.push('/books')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white"
            style={{ background: '#FF6B35' }}
          >
            <BookOpen size={16} />
            Go to Library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 tab-content">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: '#F0E8E0' }} aria-label="Go back">
          <ChevronLeft size={20} style={{ color: '#9A9A9A' }} />
        </button>
        <Camera size={24} style={{ color: '#FF6B35' }} />
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-fredoka), cursive' }}>
          Scan Books
        </h1>
      </div>

      {step === 'capture' && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer"
            style={{ background: '#FFF0E8', border: '2px dashed #FF6B35' }}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={48} style={{ color: '#FF6B35' }} />
            <p className="font-bold text-center" style={{ color: '#FF6B35' }}>
              Take a photo of your bookshelf
            </p>
            <p className="text-sm text-center" style={{ color: '#9A9A9A' }}>
              Point the camera at book spines for best results
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.removeAttribute('capture')
                fileRef.current.click()
              }
            }}
            className="py-3 rounded-xl font-bold"
            style={{ background: '#F0E8E0', color: '#9A9A9A' }}
          >
            Choose from gallery
          </button>
          {error && (
            <div className="rounded-xl p-3 font-bold text-sm" style={{ background: '#fde8e8', color: '#c0392b' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 py-16">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Shelf" className="w-full rounded-2xl max-h-48 object-cover mb-4" />
          )}
          <Search size={40} style={{ color: '#FF6B35' }} />
          <p className="font-bold text-lg text-center">Identifying books...</p>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  background: '#FF6B35',
                  animation: `shimmer 1s ${i * 0.2}s infinite`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Shelf" className="w-full rounded-2xl max-h-40 object-cover mb-4" />
          )}
          <p className="font-bold mb-3" style={{ color: '#9A9A9A' }}>
            Found {detected.length} book{detected.length !== 1 ? 's' : ''}. Review and add:
          </p>
          {detected.map((book, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4 mb-3"
              style={{
                background: book.duplicate ? '#FFF8F0' : '#FFFFFF',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                opacity: book.include ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={book.include}
                  onChange={(e) => updateDetected(idx, { include: e.target.checked })}
                  className="w-5 h-5 accent-orange-500"
                  disabled={book.duplicate}
                />
                {book.duplicate && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: '#FFD93D20', color: '#B8860B' }}>
                    <AlertCircle size={12} />
                    Already in library
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={book.title}
                  onChange={(e) => updateDetected(idx, { title: e.target.value })}
                  placeholder="Title"
                  className="rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
                  style={{ borderColor: '#F0E8E0' }}
                />
                <input
                  type="text"
                  value={book.author}
                  onChange={(e) => updateDetected(idx, { author: e.target.value })}
                  placeholder="Author"
                  className="rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
                  style={{ borderColor: '#F0E8E0' }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={book.total_pages}
                    onChange={(e) => updateDetected(idx, { total_pages: parseInt(e.target.value) || '' })}
                    placeholder={book.pagesLoading ? 'Looking up...' : 'Pages *'}
                    className="flex-1 rounded-xl border-2 px-3 py-2 font-semibold text-sm outline-none"
                    style={{ borderColor: book.total_pages === '' && !book.pagesLoading ? '#EE4266' : '#F0E8E0' }}
                  />
                  <select
                    value={book.category}
                    onChange={(e) => updateDetected(idx, { category: e.target.value as Category })}
                    className="flex-1 rounded-xl border-2 px-2 py-2 font-semibold text-sm outline-none"
                    style={{ borderColor: '#F0E8E0' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={book.language}
                  onChange={(e) => updateDetected(idx, { language: e.target.value as Language })}
                  className="w-full rounded-xl border-2 px-2 py-2 font-semibold text-sm outline-none"
                  style={{ borderColor: '#F0E8E0' }}
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          ))}
          {error && (
            <div className="rounded-xl p-3 font-bold text-sm mb-3" style={{ background: '#fde8e8', color: '#c0392b' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleAddSelected}
            disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-white text-lg"
            style={{ background: '#FF6B35', boxShadow: '0 2px 12px #FF6B3560' }}
          >
            {saving ? 'Adding...' : `Add Selected Books ✓`}
          </button>
        </div>
      )}
    </div>
  )
}
