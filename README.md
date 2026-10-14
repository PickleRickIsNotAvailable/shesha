# ⚡ Shesha: the futuristic till for kasi businesses

**Offline till + stock tracker + credit book for South African spaza shops, tuck shops, kota spots and street vendors.**
It runs on any cheap phone, uses zero data, keeps working through load-shedding, and costs R0.

## Why it sells itself

| Pain in the kasi | What Shesha does |
|---|---|
| Paper "book" of who owes what gets lost, disputed, rained on | Digital credit book with limits + one-tap **WhatsApp reminders** |
| No idea of real daily profit | Live sales & profit to the cent, 14-day chart |
| Running out of bread at 4pm rush | **Pulse** predicts stock-outs ("runs out today"), finds rush hour & best day |
| Mental maths for change during a queue | Instant change calculator with quick-cash buttons |
| Load-shedding / no data / no Wi-Fi | 100% offline PWA, ~22 KB gzipped, dark UI saves battery |
| Typing is slow | **Voice selling** in English/Afrikaans/slang: *"twee brood en een melk"*, *"two pap"* |

**Built-in viral loop:** every WhatsApp receipt and reminder ends with *"Sent with Shesha — free till for kasi shops"* plus your link. Every customer who receives one is a potential new shop owner. The Shop tab also has a one-tap "Share on WhatsApp" button.

## Run it

```bash
cd shesha
python3 -m http.server 8787
# open http://localhost:8787
```

There's no build step, no dependencies and no backend. The app opens with a demo shop full of realistic sales so people can play straight away. **Shop → Start fresh** clears it.

## Deploy for R0 (pick one)

- **Netlify Drop:** drag the `shesha` folder onto <https://app.netlify.com/drop>. You get a live HTTPS link in 10 seconds.
- **GitHub Pages:** push the folder to a repo, then Settings → Pages → deploy from branch.
- **Cloudflare Pages:** connect the repo; it's free and has fast edge nodes in Johannesburg & Cape Town.

HTTPS is required for install-to-home-screen, offline mode and voice; all three hosts provide it free.
After deploying, set your WhatsApp number in `CONTACT` in [index.html](index.html) so the waitlist/partner buttons reach you.

## Zero-budget launch plan

1. **Walk-in demos:** visit 10 spazas near you, open the link on their phone, ring up a sale *with* them. Leave it installed.
2. **WhatsApp groups:** community, stokvel and church groups. Post a 30-second screen recording of voice selling.
3. **TikTok / Reels:** "Paper book vs Shesha" side-by-side, and the load-shedding demo (airplane mode, still selling).
4. **Partner with wholesalers & cash-and-carries:** they want their customers (spaza owners) to survive. Ask them to put a QR code on the till counter.
5. **Township business hubs, SEDA/SEFA offices, youth programmes:** a free tool they can recommend at no cost to them.

## How it makes money (later)

- **Pro, R49/month:** cloud backup, multiple phones per shop, monthly profit report (useful for SEFA / bank loan applications).
- **Partners:** wholesalers & FMCG brands pay to reach shops with restock deals; anonymous, opt-in demand data.
- **Payments:** referral revenue from card-machine / QR payment providers once shops are ready to go cashless.

## Files

| File | Purpose |
|---|---|
| [index.html](index.html) | Landing page (sales pitch + live demo in a phone mockup) |
| [app.html](app.html) / [app.js](app.js) | The app: Sell, Stock, Book, Pulse, Shop |
| [styles.css](styles.css) | Neon/glass futuristic theme |
| [sw.js](sw.js) | Service worker: offline-first caching |
| [manifest.webmanifest](manifest.webmanifest) | Install-to-home-screen metadata |

When you change files after deploying, bump `CACHE` in [sw.js](sw.js) (e.g. `shesha-v2`) so phones refresh.

## Data & privacy

All data lives in the phone's local storage. Nothing is sent anywhere. Sales older than 90 days are rolled up into daily totals to keep storage small. Backups export as a JSON file the owner can send to themselves.

## Roadmap ideas

- isiZulu / isiXhosa / Sesotho / Afrikaans UI
- Barcode scanning with the phone camera
- Multi-phone sync (Pro), using a free tier (e.g. Supabase/Firebase) once there's revenue
- Stokvel / savings tracker for the owner
- USSD / SMS reminders for customers without WhatsApp
