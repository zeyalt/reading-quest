import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { image_url } = await req.json()
  if (!image_url) {
    return NextResponse.json({ error: 'image_url required' }, { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: image_url,
              },
            },
            {
              type: 'text',
              text: `Look at this photo of books on a shelf. Identify every book you can see.
For each book, provide:
- title (as accurate as possible)
- author
- your best guess at the category from this list: Mystery, Fiction, Comic, Singapore, Science, Chinese, Other

Respond ONLY with a JSON array, no markdown, no explanation:
[{"title": "...", "author": "...", "category": "..."}]

If you cannot identify a book clearly, skip it. Do not guess wildly.`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const result = await response.json()
  const text = result.content?.[0]?.text ?? ''

  let books: { title: string; author: string; category: string }[] = []
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      books = JSON.parse(jsonMatch[0])
    }
  } catch {
    return NextResponse.json(
      { error: 'Could not parse AI response', raw: text },
      { status: 500 },
    )
  }

  return NextResponse.json({ books })
}
