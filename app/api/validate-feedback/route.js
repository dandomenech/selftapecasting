import { NextResponse } from 'next/server';

export async function POST(request) {
  const { note, type, roleName, showName } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // If no key, let it through — don't block on missing config
    return NextResponse.json({ valid: true, reason: null });
  }

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
        max_tokens: 200,
        system: `You are a quality gate for performer callback feedback on a casting platform. Your job is to determine whether a casting director's feedback note to a performer is genuinely useful or just a placeholder.

REJECT feedback that is:
- Generic compliments with no specifics ("Great tape", "Love your voice", "Really strong work", "Amazing", "Wow")
- Single words or very short phrases that carry no real information
- Could apply to literally any performer for any role
- Just restating that they liked it without saying what specifically or why
- Filler that gives the performer no actionable information

ACCEPT feedback that:
- References something specific the performer did ("Your stillness in the verse section", "The way you handled the transition into the bridge")
- Explains what quality stood out ("Your comedic timing", "The vulnerability you brought to that moment")  
- Gives the performer something concrete to understand about why they're being called back
- Mentions a specific moment, choice, or quality even briefly

The performer needs real information to prepare for the callback. Generic praise is not feedback.

Respond ONLY with valid JSON in this exact format:
{"valid": true} if the feedback passes
{"valid": false, "reason": "one sentence explaining specifically what's missing"} if it fails

Never explain yourself outside the JSON.`,
        messages: [
          {
            role: 'user',
            content: `This is ${type === 'final' ? 'final callback' : 'initial callback'} feedback for the role of ${roleName} in ${showName}.\n\nFeedback note: "${note}"\n\nIs this genuinely useful feedback or is it generic/placeholder?`
          }
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '{"valid": true}';

    try {
      const clean = content.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return NextResponse.json({
        valid: result.valid !== false,
        reason: result.reason || null,
      });
    } catch {
      return NextResponse.json({ valid: true, reason: null });
    }
  } catch (err) {
    console.error('Feedback validation error:', err);
    // On error, let it through rather than block
    return NextResponse.json({ valid: true, reason: null });
  }
}
