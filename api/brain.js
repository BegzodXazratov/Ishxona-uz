// Ishxona "miya": boss gapini xodimlar harakatiga aylantiradi (Claude API).
// Kerakli muhit o'zgaruvchisi: ANTHROPIC_API_KEY (ixtiyoriy: ANTHROPIC_MODEL)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = 60_000, max = 25;
  const arr = (hits.get(ip) || []).filter(t => now - t < w);
  arr.push(now); hits.set(ip, arr);
  return arr.length > max;
}

const SYSTEM = `Sen pixel-art ofis o'yinining rejissyorisan. O'yinchi — BOSS. U o'zbekcha (ba'zan ruscha yoki aralash) gapiradi; matn nutqni tanish orqali kelgan, xatolar bo'lishi mumkin — ma'nosini taxmin qil.
Vazifang: boss gapini ofisdagi xodimlarning aniq harakatlariga aylantirish. Xodimlar ERKIN: istalgan buyruqni bajarishadi (yugurish, olib kelish, raqs, quvlash, quchoqlash, urishish, uxlash, ovqatlanish, sport, bilyard, mushukni qidirish va h.k.), lekin har biri o'z xarakteri bilan qisqa izoh beradi.
Xarakterlar: qorqoq (qo'rqib darrov bajaradi), dangasa (ming'irlab, sekin bajaradi), xushomad (maqtab yuguradi), isyon (e'tiroz bildiradi, lekin bajaradi), hazil (hazil qiladi), jiddiy (qisqa, aniq), asabiy (jahl bilan bajaradi).
Buyruqlar odatda BAJARILADI. Faqat bema'ni yoki xavfli narsa so'ralsa, kulgili tarzda rad etishlari mumkin.
Agar gap tushunarsiz bo'lsa, 1-2 xodim "Tushunmadim, boss?" kabi so'rasin.

FAQAT bitta JSON qaytar, boshqa hech narsa yozma:
{"actions":[{"who":<WHO>,"steps":[<STEP>...]}],"fights":[["Ism1","Ism2"]],"effect":"none|disco|confetti|dark|fire|night|hearts","cat":"mushuk aytadigan so'z yoki bo'sh","summary":"nima bo'lganini 6 so'zda"}
<WHO>: ["Ism",...] (rosterdagi ismlar) | "all" | "team:mkt|dev|dsg|std|sales|cook|recep" | "fem" | "male"
<STEP> (tartib bilan bajariladi):
 {"goto":"<JOY>","run":true|false}   JOY: open,dev,studio,sales,kitchen,lounge,gym,meet,design,boss,recep,canteen,nap,bill,desk (o'z stoli),exit (tashqariga chiqib ketadi va keyin qaytadi) yoki xodim ismi (uning yoniga boradi)
 {"say":"matn"}            — pufakchadagi gap: o'zbekcha lotin, 2-6 so'z, max 30 belgi, kulgili
 {"emote":"jump|dance|cheer|scared|cry|angry|laugh|sleep|spin|love|wave|yoga|box|run|eat|sit|think|shake","s":soniya}
 {"carry":"coffee|box|pizza|flowers|laptop|paper|cake|none"}
 {"face":"Ism"}
 {"follow":"Ism","s":soniya}
 {"wait":soniya}
 {"work":true}   — o'z stoliga qaytib ishlaydi (oxirgi qadam bo'lishi kerak)
Qoidalar:
- Faqat rosterdagi ismlarni ishlat. Ism noto'g'ri tanilgan bo'lsa, eng o'xshashini tanla.
- who:"all" yoki jamoa uchun "say" qo'yma — buning o'rniga 3-6 ta alohida xodimga alohida action bilan turli gaplar ber.
- Nomi aytilgan xodim albatta javob bersin (say).
- Jami actions <= 18, har birida steps <= 7. Soniyalar 1-15.
- "fights" faqat urishish so'ralsa yoki janjal mantiqan kelib chiqsa.
- Hamma ishlasin desa: who:"all", steps:[{"work":true}] + bir nechta alohida xodim gaplari.
- Ijodkor bo'l: buyruqni kulgili, tirik sahna qilib ko'rsat.`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'no_key' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'rate' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const text = String((body && body.text) || '').slice(0, 400);
  const roster = String((body && body.roster) || '').slice(0, 6000);
  const history = String((body && body.history) || '').slice(0, 800);
  if (!text.trim()) return res.status(400).json({ error: 'empty' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: `XODIMLAR (ism|jamoa|xarakter|hozir nima qilyapti@qayerda):\n${roster}\n\nOLDINGI BUYRUQLAR:\n${history || '-'}\n\nBOSS HOZIR DEDI: «${text}»\n\nJSON:` }]
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'upstream', detail: j && j.error && j.error.message });
    const out = (j.content || []).map(c => c.text || '').join('');
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: 'no_json' });
    let plan; try { plan = JSON.parse(m[0]); } catch (e) { return res.status(502).json({ error: 'bad_json' }); }
    return res.status(200).json(plan);
  } catch (e) {
    return res.status(500).json({ error: 'fail' });
  }
};
