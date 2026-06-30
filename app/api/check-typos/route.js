import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { showName, roleName, description, location, payRate } = await request.json();

    const text = [
      showName && `Show: ${showName}`,
      roleName && `Role: ${roleName}`,
      payRate && `Pay: ${payRate}`,
      location && `Location: ${location}`,
      description && `Description: ${description}`,
    ].filter(Boolean).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a proofreader for a musical theater casting platform. Review the following breakdown posting for typos, spelling errors, or obvious mistakes. Do NOT flag proper nouns like show names, role names, or locations that might simply be unusual. Only flag clear errors.

Respond with JSON only, no preamble:
{
  "issues": ["brief description of each issue found"],
  "clean": true or false
}

If there are no issues, return { "issues": [], "clean": true }.

Text to review:
${text}`,
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '{"issues":[],"clean":true}';

    // Strip any markdown fences if present
    const clean = content.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Typo check error:', err);
    // On any error, return clean so it doesn't block publishing
    return NextResponse.json({ issues: [], clean: true });
  }
}
