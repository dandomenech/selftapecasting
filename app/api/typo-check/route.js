import { NextResponse } from 'next/server';

export async function POST(request) {
  const { showName, roleName, description, location, payRate } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // If no key configured, skip gracefully — typo check is non-blocking
    return NextResponse.json({ issues: [], skipped: true });
  }

  const text = [
    showName && `Show: "${showName}"`,
    roleName && `Role: "${roleName}"`,
    description && `Description: "${description}"`,
    location && `Location: "${location}"`,
    payRate && `Pay: "${payRate}"`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are a proofreader checking a musical theater casting breakdown before it goes live to thousands of performers.
Check ONLY for:
- Obvious typos or misspellings (e.g. "Evitaa", "recearsal", "Brodway")
- Duplicated words (e.g. "the the")
- Clearly wrong numbers in pay (e.g. "$1 / week" when they likely mean "$1,800")
- Malformed text that seems like a copy-paste error

Do NOT flag:
- Intentional stylized capitalization or punctuation
- Proper nouns you don't recognize (these may be real show/venue names)
- Unusual but valid pay structures
- Creative descriptions

Respond with ONLY a JSON array of issue strings. If there are no issues, respond with [].
Examples:
["Possible typo in show name: 'Evitaa' — did you mean 'Evita'?"]
["Duplicated word in description: 'the the'"]
[]

Never explain yourself outside the JSON array.`,
        messages: [
          { role: 'user', content: `Please check this breakdown for typos:\n\n${text}` }
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '[]';

    let issues = [];
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      issues = JSON.parse(clean);
      if (!Array.isArray(issues)) issues = [];
    } catch {
      issues = [];
    }

    return NextResponse.json({ issues });
  } catch (err) {
    // Network error or API down — skip gracefully, don't block publishing
    console.error('Typo check error:', err);
    return NextResponse.json({ issues: [], skipped: true });
  }
}
