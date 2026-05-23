import { NextRequest, NextResponse } from 'next/server'

// Claude Vision can take 10–20s for shelf photos. Vercel Hobby default is 10s,
// max is 60s. Setting explicitly so the function isn't killed mid-request.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { image_data, media_type } = await req.json()
  if (!image_data || !media_type) {
    return NextResponse.json(
      { error: 'image_data and media_type required' },
      { status: 400 },
    )
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type,
                data: image_data,
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
    console.error('Anthropic API error:', response.status, err)
    return NextResponse.json(
      { error: `Claude API error (${response.status}): ${err.slice(0, 300)}` },
      { status: 500 },
    )
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
    console.error('Could not parse AI response:', text)
    return NextResponse.json(
      { error: 'Could not parse AI response', raw: text.slice(0, 300) },
      { status: 500 },
    )
  }

  return NextResponse.json({ books })
}
