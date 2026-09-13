const allowedCountries = ['Random', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Pakistan'];
const allowedGenders = ['Random', 'Male', 'Female'];
const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('[FakeForge] GEMINI_API_KEY is missing.');
    return response.status(500).json({ error: isDevelopment ? 'GEMINI_API_KEY is missing from the server environment.' : 'Unable to generate profiles right now. Please check your API configuration and try again.' });
  }
  const body = request.body || {};
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || !allowedCountries.includes(body.country) || !allowedGenders.includes(body.gender) || typeof body.instructions !== 'string' || body.instructions.length > 240) return response.status(400).json({ error: 'Please provide valid generation settings.' });

  const prompt = `Create exactly ${quantity} fictional test profiles. Country preference: ${body.country}. Gender preference: ${body.gender}. Additional safe instruction: ${body.instructions || 'None'}.
Safety rules: fictional demo data only; never use real people or identifiable information; never generate real working contact information, identity documents, financial details, government identifiers, SIM-owner information, live locations, or exact private addresses. Use reserved email domains example.com, example.org, or example.net. Use placeholder-style phone numbers such as +1 555-0100. Use clearly fictional addresses, cities, companies, and names. Return valid JSON only, with no markdown fences or extra text, in exactly this shape:
{"profiles":[{"fullName":"Fictional Demo Name","gender":"Male","email":"fictional.user@example.com","phone":"+1 555-0100","address":"123 Demo Street","city":"Demo City","state":"Demo State","postalCode":"00000","country":"United States","dateOfBirth":"1998-05-14","username":"fictionaluser01","jobTitle":"Frontend Developer","company":"DemoWorks Labs"}]}`;

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } })
    });
    const geminiPayload = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      const upstreamMessage = geminiPayload.error?.message || `Gemini returned HTTP ${geminiResponse.status}.`;
      console.error('[FakeForge] Gemini request failed.', { status: geminiResponse.status, message: upstreamMessage, reason: geminiPayload.error?.status || 'unknown' });
      const message = geminiResponse.status === 429 ? 'Rate limit reached. Please wait a moment and try again.' : geminiResponse.status === 401 || geminiResponse.status === 403 ? 'Gemini rejected the API key. Check GEMINI_API_KEY in the server environment.' : isDevelopment ? `Gemini API error: ${upstreamMessage}` : 'Gemini API failure. Please try again shortly.';
      return response.status(geminiResponse.status === 429 ? 429 : 502).json({ error: message });
    }
    const rawText = geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('[FakeForge] Gemini returned no text content.', { finishReason: geminiPayload.candidates?.[0]?.finishReason || 'unknown' });
      return response.status(502).json({ error: isDevelopment ? 'Gemini returned no text content.' : 'The AI returned an empty response. Please try again.' });
    }
    const parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/gi, '').trim());
    if (!Array.isArray(parsed.profiles) || parsed.profiles.length !== quantity) {
      console.error('[FakeForge] Gemini response shape was invalid.', { receivedProfiles: Array.isArray(parsed.profiles) ? parsed.profiles.length : 'not-an-array', expectedProfiles: quantity });
      return response.status(502).json({ error: isDevelopment ? 'Gemini returned an invalid profile response shape.' : 'The AI returned an invalid profile response. Please try again.' });
    }
    const profiles = parsed.profiles.map(profile => normalizeProfile(profile, body.country));
    if (profiles.some(profile => !profile)) {
      console.error('[FakeForge] Gemini returned a profile that failed safety validation.');
      return response.status(502).json({ error: isDevelopment ? 'Gemini returned a profile that failed fictional-data safety validation.' : 'The AI returned an invalid profile response. Please try again.' });
    }
    return response.status(200).json({ profiles });
  } catch (error) {
    console.error('[FakeForge] Unexpected generation error.', { name: error.name, message: error.message });
    return response.status(502).json({ error: isDevelopment && error instanceof SyntaxError ? 'The AI returned invalid JSON.' : isDevelopment ? `Generation error: ${error.message}` : 'Unable to generate profiles right now. Please try again shortly.' });
  }
}

function normalizeProfile(profile, requestedCountry) {
  const fields = ['fullName', 'gender', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'country', 'dateOfBirth', 'username', 'jobTitle', 'company'];
  if (!profile || fields.some(field => typeof profile[field] !== 'string' || profile[field].length === 0 || profile[field].length > 160)) return null;
  if (!/^[^\s@]+@example\.(com|org|net)$/i.test(profile.email) || !/555/.test(profile.phone)) return null;
  if (requestedCountry !== 'Random' && profile.country !== requestedCountry) return null;
  return Object.fromEntries(fields.map(field => [field, profile[field].trim()]));
}