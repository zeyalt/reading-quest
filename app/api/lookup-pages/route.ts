import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { title, author } = await req.json()
  const query = encodeURIComponent(`${title} ${author ?? ''}`.trim())

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`,
    )
    const data = await res.json()
    const pageCount = data.items?.[0]?.volumeInfo?.pageCount ?? null
    return NextResponse.json({ page_count: pageCount })
  } catch {
    return NextResponse.json({ page_count: null })
  }
}
