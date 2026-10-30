// Ishxona "quloq": ovozni matnga aylantiradi.
// ELEVENLABS_API_KEY (Scribe) yoki OPENAI_API_KEY (Whisper) — qaysi biri bo'lsa, o'shani ishlatadi.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now); hits.set(ip, arr); return arr.length > 30;
}
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 4_000_000) { reject(new Error('big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const el = process.env.ELEVENLABS_API_KEY, oa = process.env.OPENAI_API_KEY;
  if (!el && !oa) return res.status(503).json({ error: 'no_key' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'rate' });
  try {
    const buf = Buffer.isBuffer(req.body) ? req.body : await readRaw(req);
    if (!buf || buf.length < 800) return res.status(200).json({ text: '' });
    const type = String(req.headers['x-audio-type'] || 'audio/webm');
    const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm';
    const lang = String(req.headers['x-lang'] || 'uz').slice(0, 3);
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type }), 'audio.' + ext);
    let r, j;
    if (el) {
      fd.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v1');
      fd.append('language_code', lang === 'ru' ? 'ru' : 'uz');
      r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': el }, body: fd });
    } else {
      fd.append('model', process.env.OPENAI_STT_MODEL || 'whisper-1');
      fd.append('language', lang === 'ru' ? 'ru' : 'uz');
      r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + oa }, body: fd });
    }
    j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'upstream', detail: (j && (j.detail && (j.detail.message || j.detail)) || (j.error && j.error.message)) || r.status });
    return res.status(200).json({ text: String(j.text || '').trim() });
  } catch (e) {
    return res.status(500).json({ error: 'fail' });
  }
};
module.exports.config = { api: { bodyParser: false } };
