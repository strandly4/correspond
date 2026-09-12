// This runs on the server (Vercel), never in the user's browser.
// Your real Anthropic API key lives in an environment variable, not in this file.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { situation, audience, tone, draft } = req.body || {};

  if (!draft || !situation || !audience || !tone) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const systemPrompt = `You help someone turn a rough draft or description into a well-phrased piece of written communication in English.
Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "primary": {"text": "the main suggested message", "why": ["short reason 1", "short reason 2", "short reason 3"]},
  "alternates": [
    {"label": "short label like 'More direct'", "text": "...", "why": ["...", "..."]},
    {"label": "short label like 'Warmer'", "text": "...", "why": ["...", "..."]}
  ]
}
Keep each "why" bullet under 15 words, concrete, and about the actual word/phrase choices — not generic praise.
Keep the message itself natural, concise, and appropriate for the situation, audience and tone given.`;

  const userPrompt = `Situation: ${situation}
Audience: ${audience}
Desired tone: ${tone}
Rough draft / what I want to say: "${draft}"

Write the message.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    const text = (data.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Composition failed' });
  }
}
