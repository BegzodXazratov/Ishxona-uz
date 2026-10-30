# Ishxona.uz

Pixel-art ofis o'yini: 29 xodim, 7 xona. Mikrofon orqali buyruq bering — xodimlar gapingizni tushunadi, xarakteriga qarab javob beradi.

Ochish: `index.html` (Chrome tavsiya etiladi, mikrofon uchun HTTPS kerak).

## AI rejimi (erkin xodimlar)

Vercel → Project `ishxona-uz` → Settings → Environment Variables:

| O'zgaruvchi | Nima uchun |
|---|---|
| `ANTHROPIC_API_KEY` | "Miya": istalgan buyruqni tushunadi (Claude) |
| `ELEVENLABS_API_KEY` yoki `OPENAI_API_KEY` | "Quloq": o'zbekcha ovozni matnga aylantiradi |

Kalit qo'shilgach, Deployments → Redeploy. Kalit bo'lmasa, o'yin oddiy kalit so'zlar rejimida ishlaydi.
