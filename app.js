"use strict";

/* ============================================================
   Shesha — offline till, stock & credit book for kasi businesses
   Zero dependencies. All data stays on the device (localStorage).
   Money is stored in cents (integers) to avoid rounding errors.
   ============================================================ */

const KEY = "shesha.v1";
const DAY = 86400000;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toCents = (v) => Math.round((parseFloat(String(v ?? "").replace(",", ".")) || 0) * 100);
const R = (cents) => {
  const [i, d] = (Math.abs(cents) / 100).toFixed(2).split(".");
  return (cents < 0 ? "-R" : "R") + i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "." + d;
};
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysAgoStart = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); };
const timeStr = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ago = (t) => {
  const d = Math.round((startOfDay(Date.now()) - startOfDay(t)) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const saleProfit = (s) => s.items.reduce((a, i) => a + i.qty * (i.price - i.cost), 0);
const APP_URL = location.protocol.startsWith("http") ? new URL("index.html", location.href).href : "";

/* ---------------- Demo shop ---------------- */

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDemo() {
  // emoji, name, price, cost, stock, warnBelow, popularity, extra voice words
  const P = [
    ["🍞", "White bread", 1999, 1650, 4, 10, 9, "loaf isinkwa brood"],
    ["🥛", "Milk 1L", 2199, 1800, 14, 6, 6, "amasi melk"],
    ["🥤", "Coke 2L", 2799, 2200, 9, 6, 5, "coca cola cooldrink"],
    ["🥚", "Eggs (6)", 2499, 1950, 11, 4, 4, "eier"],
    ["🌽", "Maize meal 2.5kg", 4499, 3700, 7, 3, 3, "mealie mielie pap"],
    ["🍬", "Sugar 2kg", 4799, 4050, 5, 3, 2, "suiker"],
    ["🍟", "Chips 36g", 1000, 700, 40, 10, 7, "simba crisps"],
    ["📱", "Airtime R10", 1000, 940, 50, 10, 6, "data voucher"],
    ["🕯️", "Candles (6)", 2999, 2200, 3, 4, 2, "candle kers"],
    ["🧼", "Sunlight soap", 1599, 1250, 12, 4, 2, "sepa seep"],
    ["🍭", "Sweets", 100, 50, 180, 40, 8, "sweetie lekker"],
    ["🥫", "Baked beans", 1899, 1450, 10, 4, 3, "beans"],
    ["🍗", "Kota", 3500, 1800, 20, 5, 5, "bunny quarter"],
    ["🔥", "Paraffin 1L", 2899, 2400, 8, 3, 2, "parafin"],
  ];
  const products = P.map(([emoji, name, price, cost, stock, low, pop, tags]) => ({
    id: uid() + name.length, emoji, name, price, cost, stock, low, pop, tags,
  }));
  const customers = [
    ["Sipho (Block C)", "0710000001", 30000, 34550, 1],
    ["Thandeka", "0720000002", 20000, 12000, 2],
    ["Bra Vusi", "0730000003", 15000, 8000, 5],
    ["Mrs Mokoena", "0740000004", 50000, 0, 9],
  ].map(([name, phone, limit, balance, d]) => ({ id: uid() + name.length, name, phone, limit, balance, updated: daysAgoStart(d) + 10 * 3600000 }));

  const rand = rng(2026);
  const pick = (arr, w) => { let r = rand() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const hourW = [2, 6, 7, 4, 3, 3, 4, 3, 3, 4, 7, 9, 7, 4, 2];
  const sales = [];
  const now = Date.now();
  for (let d = 13; d >= 0; d--) {
    const day = daysAgoStart(d);
    const dow = new Date(day).getDay();
    let n = Math.round((24 + rand() * 14) * (dow === 5 || dow === 6 ? 1.35 : dow === 0 ? 0.8 : 1));
    for (let k = 0; k < n; k++) {
      const ts = day + pick(hours, hourW) * 3600000 + Math.floor(rand() * 3600000);
      if (ts > now) continue;
      const lines = new Map();
      const count = 1 + Math.floor(rand() * rand() * 4);
      for (let j = 0; j < count; j++) {
        const p = pick(products, products.map((x) => x.pop));
        lines.set(p, (lines.get(p) || 0) + (p.price < 500 ? 1 + Math.floor(rand() * 5) : rand() < 0.8 ? 1 : 2));
      }
      const items = [...lines].map(([p, qty]) => ({ pid: p.id, name: p.name, emoji: p.emoji, qty, price: p.price, cost: p.cost }));
      const total = items.reduce((a, i) => a + i.qty * i.price, 0);
      const r = rand();
      const method = r < 0.7 ? "cash" : r < 0.85 ? "card" : "credit";
      sales.push({ id: uid() + k, ts, items, total, method, cid: method === "credit" ? customers[Math.floor(rand() * 3)].id : null });
    }
  }
  sales.sort((a, b) => a.ts - b.ts);
  return { v: 1, demo: true, shop: { name: "Mama Thandi's Spaza", phone: "" }, products, customers, sales, payments: [] };
}

/* ---------------- State ---------------- */

let state = load();
let cart = new Map();
let current = "sell";
let payMethod = "cash";
let lastSale = null;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return s;
  } catch { /* corrupted storage → fall through to demo */ }
  return makeDemo();
}

// Keep localStorage small: roll sales older than 90 days into daily totals.
function compact() {
  const cutoff = daysAgoStart(90);
  if (!state.sales.length || state.sales[0].ts >= cutoff) return;
  state.archive ||= {};
  state.sales = state.sales.filter((s) => {
    if (s.ts >= cutoff) return true;
    const a = (state.archive[dayKey(s.ts)] ||= { rev: 0, profit: 0, n: 0 });
    a.rev += s.total; a.profit += saleProfit(s); a.n++;
    return false;
  });
}

function save() {
  compact();
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast("⚠️ Phone storage is full — make a backup in the Shop tab"); }
}

const product = (id) => state.products.find((p) => p.id === id);
const customer = (id) => state.customers.find((c) => c.id === id);
const cartTotal = () => [...cart].reduce((a, [id, q]) => a + (product(id)?.price || 0) * q, 0);
const cartCount = () => [...cart.values()].reduce((a, b) => a + b, 0);

/* ---------------- UI helpers ---------------- */

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function buzz(ms = 12) { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } }

function chime() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(880, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(1760, a.currentTime + 0.12);
    g.gain.setValueAtTime(0.07, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.25);
    o.connect(g).connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.26);
    o.onended = () => a.close();
  } catch { /* audio unavailable */ }
}

function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1);
  return d.length >= 11 ? d : "";
}
function openWhatsApp(phone, text) {
  const n = waNumber(phone);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

/* ---------------- Navigation ---------------- */

function show(view) {
  current = view;
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  render();
  window.scrollTo(0, 0);
}

function render() {
  $("#shopName").textContent = state.shop.name || "Shesha";
  $("#demoPill").hidden = !state.demo;
  ({ sell: renderSell, stock: renderStock, book: renderBook, pulse: renderPulse, me: renderMe })[current]();
  renderCartBar();
}

/* ---------------- Voice / text ordering ---------------- */

const NUMS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, fifteen: 15, twenty: 20,
  een: 1, twee: 2, drie: 3, vier: 4, vyf: 5, ses: 6, sewe: 7, agt: 8, nege: 9, tien: 10,
};
const FILLER = new Set(["and", "&", "plus", "x", "of", "the", "please", "give", "me", "i", "want", "need", "add", "sell", "en", "asseblief"]);
const stem = (w) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w);
const numOf = (w) => (/^\d+$/.test(w) ? parseInt(w, 10) : NUMS[w]);

function matchProduct(words) {
  const q = words.map(stem);
  let best = null, bestScore = 0;
  for (const p of state.products) {
    const pw = `${p.name} ${p.tags || ""}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem);
    const score = q.reduce((a, w) => a + (pw.some((x) => x === w || (w.length >= 3 && x.startsWith(w))) ? 1 : 0), 0);
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}

function parseOrder(text) {
  const tokens = text.toLowerCase().replace(/[.,;!?]/g, " ").split(/\s+/).filter(Boolean);
  const groups = [];
  let cur = { qty: null, words: [] };
  for (const t of tokens) {
    const n = numOf(t);
    if (n !== undefined) {
      if (cur.words.length) { groups.push(cur); cur = { qty: n, words: [] }; }
      else cur.qty = n;
    } else if (!FILLER.has(t)) cur.words.push(t);
  }
  if (cur.words.length) groups.push(cur);
  const matched = [], unknown = [];
  for (const g of groups) {
    const p = matchProduct(g.words);
    if (p) matched.push({ p, qty: g.qty || 1 });
    else unknown.push(g.words.join(" "));
  }
  return { matched, unknown };
}

const looksLikeOrder = (q) => /\d/.test(q) || q.split(/\s+/).some((w) => NUMS[w] && w.length > 2);

function applyOrder({ matched, unknown }) {
  if (!matched.length) { toast(`🤔 Couldn't find “${unknown.join(", ")}”`); return; }
  matched.forEach(({ p, qty }) => cart.set(p.id, (cart.get(p.id) || 0) + qty));
  buzz(20);
  toast(`⚡ Added ${matched.map(({ p, qty }) => `${qty}× ${p.name}`).join(", ")}${unknown.length ? ` · not found: ${unknown.join(", ")}` : ""}`, 3500);
  $("#search").value = "";
  render();
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("🎙️ Voice selling works in Chrome. Or type: “2 bread 1 milk” and press Enter", 4000); $("#search").focus(); return; }
  const rec = new SR();
  rec.lang = "en-ZA";
  rec.maxAlternatives = 3;
  const mic = $("#micBtn");
  mic.classList.add("listening");
  toast("🎙️ Listening… say e.g. “two bread and a coke”");
  rec.onresult = (e) => {
    let best = null;
    for (const alt of e.results[0]) {
      const r = parseOrder(alt.transcript);
      if (!best || r.matched.length > best.matched.length) best = r;
    }
    applyOrder(best);
  };
  rec.onerror = (e) => toast(e.error === "not-allowed" ? "Allow the microphone to sell by voice" : "Didn't catch that — try again");
  rec.onend = () => mic.classList.remove("listening");
  rec.start();
}

/* ---------------- SELL ---------------- */

function renderSell() {
  const q = $("#search").value.trim().toLowerCase();
  const isOrder = q && looksLikeOrder(q);
  const list = state.products.filter((p) => !q || isOrder || `${p.name} ${p.tags || ""}`.toLowerCase().includes(q));
  let hint = "";
  if (isOrder) {
    const { matched } = parseOrder(q);
    if (matched.length) hint = `<div class="tip" style="grid-column:1/-1"><span class="t-ico">↵</span><div>Press Enter to add <b>${matched.map(({ p, qty }) => `${qty}× ${esc(p.name)}`).join(", ")}</b></div></div>`;
  }
  $("#productGrid").innerHTML = hint + (list.length
    ? list.map((p) => {
        const q = cart.get(p.id) || 0;
        const cls = p.stock <= 0 ? "out" : p.stock <= p.low ? "low" : "";
        return `<button class="tile ${cls}" data-pid="${p.id}">
          ${q ? `<div class="qty">${q}</div>` : ""}
          <div class="emoji">${esc(p.emoji || "🛒")}</div>
          <div class="name">${esc(p.name)}</div>
          <div class="price">${R(p.price)}</div>
          <div class="stock">${p.stock <= 0 ? "out of stock" : `${p.stock} left`}</div>
        </button>`;
      }).join("")
    : `<div class="empty" style="grid-column:1/-1">No products yet. <a href="#" data-goto="stock">Add your first product →</a></div>`);
}

function addToCart(id, n = 1) {
  const p = product(id);
  if (!p) return;
  const q = (cart.get(id) || 0) + n;
  if (q <= 0) cart.delete(id); else cart.set(id, q);
  if (n > 0 && q > p.stock) toast(`⚠️ Stock says only ${Math.max(p.stock, 0)} ${p.name} — fix it in Stock later`);
  buzz();
  render();
}

function renderCartBar() {
  const show = current === "sell" && cart.size > 0;
  $("#cartBar").classList.toggle("show", show);
  if (!show) return;
  const n = cartCount();
  $("#cartCount").textContent = `${n} item${n === 1 ? "" : "s"}`;
  $("#cartTotal").textContent = R(cartTotal());
}

/* ---------------- CHECKOUT ---------------- */

function openCheckout() {
  if (!cart.size) return;
  payMethod = "cash";
  $("#tendered").value = "";
  renderCheckout();
  $("#checkoutDlg").showModal();
}

function quickCashOptions(total) {
  const opts = new Set();
  for (const step of [1000, 2000, 5000, 10000, 20000]) opts.add(Math.ceil(total / step) * step);
  return [...opts].filter((v) => v > total).sort((a, b) => a - b).slice(0, 3);
}

function renderCheckout() {
  if (!cart.size) { $("#checkoutDlg").close(); render(); return; }
  const total = cartTotal();
  $("#checkoutItems").innerHTML = [...cart].map(([id, q]) => {
    const p = product(id);
    return `<div class="row"><div>${esc(p.emoji)} ${esc(p.name)}<div class="meta">${R(p.price)} each</div></div>
      <div class="qtyctl"><button class="btn" data-dec="${id}">−</button><b>${q}</b><button class="btn" data-inc="${id}">+</button>
      <span style="min-width:80px;text-align:right">${R(p.price * q)}</span></div></div>`;
  }).join("");
  $("#checkoutTotal").textContent = R(total);
  $$("#payMethod button").forEach((b) => b.classList.toggle("on", b.dataset.m === payMethod));
  $("#cashBox").hidden = payMethod !== "cash";
  $("#creditBox").hidden = payMethod !== "credit";
  $("#quickCash").innerHTML = quickCashOptions(total).map((v) => `<button class="btn small" data-cash="${v}">${R(v)}</button>`).join("");
  updateChange();
  if (payMethod === "credit") renderCreditSelect();
}

function updateChange() {
  const total = cartTotal();
  const raw = $("#tendered").value;
  const out = $("#changeOut");
  if (!raw) { out.textContent = "Exact amount"; out.style.color = ""; return; }
  const diff = toCents(raw) - total;
  out.textContent = diff >= 0 ? `Change: ${R(diff)}` : `Short: ${R(-diff)}`;
  out.style.color = diff >= 0 ? "" : "var(--red)";
}

function renderCreditSelect(selectId) {
  const sel = $("#creditCustomer");
  const keep = selectId || sel.value;
  sel.innerHTML = `<option value="">— choose customer —</option>` +
    state.customers.map((c) => `<option value="${c.id}">${esc(c.name)} (owes ${R(c.balance)})</option>`).join("") +
    `<option value="__new">➕ New customer…</option>`;
  if (keep && keep !== "__new" && customer(keep)) sel.value = keep;
  const c = customer(sel.value);
  let warn = $("#creditWarn");
  if (!warn) { warn = document.createElement("p"); warn.id = "creditWarn"; warn.className = "muted"; $("#creditBox").append(warn); }
  const over = c && c.limit ? c.balance + cartTotal() - c.limit : 0;
  warn.innerHTML = over > 0 ? `⚠️ This puts <b>${esc(c.name)}</b> ${R(over)} over their limit.` : "";
}

function confirmSale() {
  const total = cartTotal();
  let cid = null, change = 0;
  if (payMethod === "cash" && $("#tendered").value) {
    change = toCents($("#tendered").value) - total;
    if (change < 0) { toast("💵 Not enough cash yet"); return; }
  }
  if (payMethod === "credit") {
    cid = $("#creditCustomer").value;
    if (!customer(cid)) { toast("📒 Choose whose book this goes on"); return; }
  }
  const items = [...cart].map(([id, qty]) => {
    const p = product(id);
    p.stock -= qty;
    return { pid: id, name: p.name, emoji: p.emoji, qty, price: p.price, cost: p.cost };
  });
  const sale = { id: uid(), ts: Date.now(), items, total, method: payMethod, cid, change };
  state.sales.push(sale);
  if (cid) { const c = customer(cid); c.balance += total; c.updated = sale.ts; }
  save();
  cart.clear();
  lastSale = sale;
  chime(); buzz(40);
  $("#checkoutDlg").close();
  const how = { cash: "Cash", card: "Card/EFT", credit: `On ${customer(cid)?.name}'s book` }[payMethod];
  $("#doneText").textContent = `${R(total)} · ${how}${change > 0 ? ` · Change ${R(change)}` : ""}`;
  $("#receiptPhone").value = cid ? customer(cid).phone || "" : "";
  $("#doneDlg").showModal();
  render();
}

function receiptText(s) {
  const d = new Date(s.ts);
  const lines = s.items.map((i) => `${i.qty}× ${i.name} — ${R(i.qty * i.price)}`).join("\n");
  const how = s.method === "credit" ? `On your book. Balance now ${R(customer(s.cid)?.balance || 0)}` : s.method === "card" ? "Paid by card/EFT" : `Paid cash${s.change > 0 ? ` · change ${R(s.change)}` : ""}`;
  return `🧾 *${state.shop.name || "Receipt"}*\n${d.toLocaleDateString("en-ZA")} ${timeStr(s.ts)}\n\n${lines}\n\n*Total: ${R(s.total)}*\n${how}\n\nNgiyabonga! Thank you 🙏\n\n_⚡ Sent with Shesha — free till & credit book for kasi shops${APP_URL ? `: ${APP_URL}` : ""}_`;
}

/* ---------------- STOCK ---------------- */

function renderStock() {
  const rank = (p) => (p.stock <= 0 ? 2 : p.stock <= p.low ? 1 : 0);
  const ps = [...state.products].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  const value = state.products.reduce((a, p) => a + Math.max(p.stock, 0) * p.cost, 0);
  const potential = state.products.reduce((a, p) => a + Math.max(p.stock, 0) * (p.price - p.cost), 0);
  const low = state.products.filter((p) => p.stock <= p.low).length;
  $("#stockValue").innerHTML = `
    <div class="card kpi"><span class="muted">Stock value (cost)</span><b>${R(value)}</b></div>
    <div class="card kpi accent"><span class="muted">Profit waiting on shelf</span><b>${R(potential)}</b></div>
    <div class="card kpi" style="grid-column:1/-1"><span class="muted">Low or out of stock</span><b style="color:${low ? "var(--gold)" : "var(--lime)"}">${low} product${low === 1 ? "" : "s"}</b></div>`;
  $("#stockList").innerHTML = ps.length ? ps.map((p) => {
    const pill = p.stock <= 0 ? `<span class="pill bad">Out</span>` : p.stock <= p.low ? `<span class="pill warn">Low</span>` : "";
    return `<div class="row" data-edit="${p.id}" style="cursor:pointer">
      <div><b>${esc(p.emoji)} ${esc(p.name)}</b> ${pill}
        <div class="meta">${p.stock} in stock · sells ${R(p.price)} · cost ${R(p.cost)}</div></div>
      <button class="btn small" data-restock="${p.id}">+ Restock</button></div>`;
  }).join("") : `<div class="empty">Add the things you sell. Takes 10 seconds each.</div>`;
}

function openProduct(id) {
  const p = id ? product(id) : null;
  $("#productDlg").dataset.id = id || "";
  $("#productDlgTitle").textContent = p ? "Edit product" : "New product";
  $("#pEmoji").value = p?.emoji || "";
  $("#pName").value = p?.name || "";
  $("#pPrice").value = p ? (p.price / 100).toFixed(2) : "";
  $("#pCost").value = p ? (p.cost / 100).toFixed(2) : "";
  $("#pStock").value = p ? p.stock : "";
  $("#pLow").value = p ? p.low : 5;
  $("#deleteProduct").hidden = !p;
  updateMargin();
  $("#productDlg").showModal();
}

function updateMargin() {
  const price = toCents($("#pPrice").value), cost = toCents($("#pCost").value);
  $("#pMargin").textContent = price && cost
    ? `Profit per item: ${R(price - cost)} (${Math.round(((price - cost) / price) * 100)}% margin)`
    : "Tip: add your cost price and Shesha will track your real profit.";
}

function saveProduct() {
  const name = $("#pName").value.trim();
  const price = toCents($("#pPrice").value);
  if (!name) { toast("Give the product a name"); return; }
  if (price <= 0) { toast("Add a selling price"); return; }
  const id = $("#productDlg").dataset.id;
  const data = {
    emoji: $("#pEmoji").value.trim() || "🛒", name, price,
    cost: toCents($("#pCost").value), stock: parseInt($("#pStock").value, 10) || 0,
    low: Math.max(0, parseInt($("#pLow").value, 10) || 0),
  };
  if (id) Object.assign(product(id), data);
  else state.products.push({ id: uid(), ...data });
  save();
  $("#productDlg").close();
  toast(`✅ ${name} saved`);
  render();
}

function restock(id) {
  const p = product(id);
  const n = parseInt(prompt(`How many ${p.name} came in?`, "12"), 10);
  if (!n || n < 0) return;
  p.stock += n;
  save();
  toast(`📦 ${p.name}: ${p.stock} in stock`);
  render();
}

/* ---------------- CREDIT BOOK ---------------- */

function renderBook() {
  const owed = state.customers.reduce((a, c) => a + Math.max(c.balance, 0), 0);
  const over = state.customers.filter((c) => c.limit && c.balance > c.limit).length;
  $("#bookSummary").innerHTML = `
    <div class="card kpi accent"><span class="muted">Owed to you</span><b>${R(owed)}</b></div>
    <div class="card kpi"><span class="muted">Over their limit</span><b style="color:${over ? "var(--red)" : "var(--lime)"}">${over}</b></div>`;
  const cs = [...state.customers].sort((a, b) => b.balance - a.balance);
  $("#customerList").innerHTML = cs.length ? cs.map((c) => {
    const isOver = c.limit && c.balance > c.limit;
    return `<div class="row">
      <div data-cedit="${c.id}" style="cursor:pointer;flex:1"><b>${esc(c.name)}</b> ${isOver ? `<span class="pill bad">Over limit</span>` : ""}
        <div class="meta">${c.limit ? `Limit ${R(c.limit)} · ` : ""}last activity ${ago(c.updated || Date.now())}</div></div>
      <div style="text-align:right">
        <b style="color:${c.balance > 0 ? (isOver ? "var(--red)" : "var(--gold)") : "var(--lime)"}">${R(c.balance)}</b>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn small" data-cpay="${c.id}">Paid</button>
          ${c.balance > 0 ? `<button class="btn small wa" data-remind="${c.id}">Remind</button>` : ""}
        </div></div></div>`;
  }).join("") : `<div class="empty">No one on the book. Customers you add here can buy now and pay later.</div>`;
}

let onCustomerSaved = null;
function openCustomer(id, { pay = false, onSaved = null } = {}) {
  const c = id ? customer(id) : null;
  onCustomerSaved = onSaved;
  $("#customerDlg").dataset.id = id || "";
  $("#customerDlgTitle").textContent = c ? `${c.name} · owes ${R(c.balance)}` : "New customer";
  $("#cName").value = c?.name || "";
  $("#cPhone").value = c?.phone || "";
  $("#cLimit").value = c?.limit ? c.limit / 100 : "";
  $("#cPay").value = "";
  $("#cPayBox").hidden = !c;
  $("#customerDlg").showModal();
  if (pay) setTimeout(() => $("#cPay").focus(), 50);
}

function saveCustomer() {
  const name = $("#cName").value.trim();
  if (!name) { toast("Add a name"); return; }
  const id = $("#customerDlg").dataset.id;
  const data = { name, phone: $("#cPhone").value.trim(), limit: toCents($("#cLimit").value) };
  let c;
  if (id) { c = customer(id); Object.assign(c, data); }
  else { c = { id: uid(), balance: 0, updated: Date.now(), ...data }; state.customers.push(c); }
  const pay = toCents($("#cPay").value);
  if (id && pay > 0) {
    c.balance -= pay;
    c.updated = Date.now();
    state.payments.push({ id: uid(), ts: Date.now(), cid: c.id, amount: pay });
    toast(`💰 ${R(pay)} received from ${c.name}. Now owes ${R(c.balance)}`, 3500);
    chime();
  } else toast(`✅ ${c.name} saved`);
  save();
  $("#customerDlg").close();
  onCustomerSaved?.(c);
  onCustomerSaved = null;
  render();
}

function remind(id) {
  const c = customer(id);
  if (!waNumber(c.phone)) toast("No valid number saved — pick the contact in WhatsApp");
  openWhatsApp(c.phone, `Sawubona ${c.name} 👋\n\nFriendly reminder from *${state.shop.name}*: your book balance is *${R(c.balance)}*.\nYou can pay at the shop any time. Ngiyabonga! 🙏`);
}

/* ---------------- PULSE (insights) ---------------- */

function revenueBetween(from, to) {
  return state.sales.reduce((a, s) => (s.ts >= from && s.ts < to ? a + s.total : a), 0);
}

function buildTips() {
  const tips = [];
  const weekStart = daysAgoStart(6);
  const week = state.sales.filter((s) => s.ts >= weekStart);
  const units = new Map();
  week.forEach((s) => s.items.forEach((i) => units.set(i.pid, (units.get(i.pid) || 0) + i.qty)));

  for (const p of state.products) {
    const perDay = (units.get(p.id) || 0) / 7;
    if (perDay <= 0) continue;
    if (p.stock <= 0) {
      tips.push({ ico: "🚨", score: 100 + perDay * p.price, html: `<b>Out of ${esc(p.name)}</b> — you sell about ${perDay.toFixed(1)} a day. That's roughly <b>${R(Math.round(perDay * p.price))}</b> in sales lost every day.` });
    } else if (p.stock / perDay < 2) {
      const left = p.stock / perDay;
      tips.push({ ico: "📦", score: 80 - left * 10, html: `<b>Restock ${esc(p.name)}</b> — only ${p.stock} left, <b>runs out ${left < 1 ? "today" : `in ~${left.toFixed(1)} days`}</b> at your current pace.` });
    }
  }

  for (const p of state.products) {
    if (!p.cost || !p.price) continue;
    const m = (p.price - p.cost) / p.price;
    if (m < 0) tips.push({ ico: "🛑", score: 90, html: `<b>${esc(p.name)}</b> sells for less than it costs you. You lose ${R(p.cost - p.price)} on each one.` });
    else if (m < 0.1) tips.push({ ico: "🧮", score: 10, html: `<b>${esc(p.name)}</b> only makes ${Math.round(m * 100)}% margin. Fine to bring customers in, but don't put it on the book.` });
  }

  const byHour = new Array(24).fill(0);
  week.forEach((s) => (byHour[new Date(s.ts).getHours()] += s.total));
  const peak = byHour.indexOf(Math.max(...byHour));
  if (week.length >= 20) tips.push({ ico: "⏰", score: 30, html: `Your rush hour is <b>${pad(peak)}:00–${pad(peak + 1)}:00</b>. Have bread, airtime and change ready before then.` });

  for (const c of state.customers) {
    if (c.limit && c.balance > c.limit) tips.push({ ico: "📒", score: 60, html: `<b>${esc(c.name)}</b> is ${R(c.balance - c.limit)} over their limit. <a href="#" data-remind="${c.id}">Send a WhatsApp reminder →</a>` });
  }

  const monthStart = daysAgoStart(27);
  if (state.sales.length && state.sales[0].ts <= daysAgoStart(6)) {
    const perDow = new Array(7).fill(0), seen = new Array(7).fill(0);
    for (let d = 1; d <= 27; d++) {
      const t = daysAgoStart(d);
      if (t < monthStart || t < startOfDay(state.sales[0].ts)) continue;
      const dow = new Date(t).getDay();
      perDow[dow] += revenueBetween(t, daysAgoStart(d - 1)); seen[dow]++;
    }
    const avg = perDow.map((v, i) => (seen[i] ? v / seen[i] : 0));
    const best = avg.indexOf(Math.max(...avg));
    if (avg[best] > 0) tips.push({ ico: "📅", score: 20, html: `<b>${WEEKDAYS[best]}</b> is your biggest day (avg ${R(Math.round(avg[best]))}). Stock up the day before.` });
  }

  if (!tips.length) tips.push({ ico: "⚡", score: 0, html: "All systems go. Keep selling — Shesha learns your shop as you do." });
  return tips.sort((a, b) => b.score - a.score).slice(0, 6);
}

function renderPulse() {
  const today = daysAgoStart(0), now = Date.now();
  const todaySales = state.sales.filter((s) => s.ts >= today);
  const rev = todaySales.reduce((a, s) => a + s.total, 0);
  const profit = todaySales.reduce((a, s) => a + saleProfit(s), 0);
  const lastWeekSame = revenueBetween(daysAgoStart(7), now - 7 * DAY);
  const delta = lastWeekSame ? Math.round(((rev - lastWeekSame) / lastWeekSame) * 100) : null;
  const week = revenueBetween(daysAgoStart(6), now + 1);
  const owed = state.customers.reduce((a, c) => a + Math.max(c.balance, 0), 0);
  $("#pulseKpis").innerHTML = `
    <div class="card kpi accent"><span class="muted">Sales today</span><b>${R(rev)}</b>
      <span class="muted" style="font-size:12px">${delta === null ? `${todaySales.length} sales` : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs last ${WEEKDAYS[new Date().getDay()]}`}</span></div>
    <div class="card kpi"><span class="muted">Profit today</span><b>${R(profit)}</b><span class="muted" style="font-size:12px">${todaySales.length} sales</span></div>
    <div class="card kpi"><span class="muted">Last 7 days</span><b>${R(week)}</b></div>
    <div class="card kpi"><span class="muted">Owed to you</span><b style="color:var(--gold)">${R(owed)}</b></div>`;

  $("#tips").innerHTML = buildTips().map((t) => `<div class="tip"><span class="t-ico">${t.ico}</span><div>${t.html}</div></div>`).join("");

  const wk = new Map();
  state.sales.filter((s) => s.ts >= daysAgoStart(6)).forEach((s) => s.items.forEach((i) => {
    const e = wk.get(i.name) || { emoji: i.emoji, rev: 0, qty: 0 };
    e.rev += i.qty * i.price; e.qty += i.qty; wk.set(i.name, e);
  }));
  const top = [...wk].sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
  const max = top[0]?.[1].rev || 1;
  $("#bestSellers").innerHTML = top.length ? top.map(([n, e]) => `
    <div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><span>${esc(e.emoji)} ${esc(n)} <span class="muted">· ${e.qty} sold</span></span><b>${R(e.rev)}</b></div>
    <div style="height:6px;border-radius:3px;margin-top:6px;background:linear-gradient(90deg,var(--cyan),var(--lime));width:${(e.rev / max) * 100}%"></div></div>`).join("")
    : `<div class="empty">Sell something and your best sellers show up here.</div>`;

  const recent = state.sales.slice(-8).reverse();
  const icon = { cash: "💵", card: "💳", credit: "📒" };
  $("#recentSales").innerHTML = recent.length ? recent.map((s) => `
    <div class="row"><div><b>${icon[s.method]} ${R(s.total)}</b>
      <div class="meta">${ago(s.ts) === "today" ? "Today" : ago(s.ts)} ${timeStr(s.ts)} · ${esc(s.items.map((i) => `${i.qty}× ${i.name}`).join(", "))}</div></div>
      <button class="btn small" data-void="${s.id}" title="Undo this sale">↩︎ Undo</button></div>`).join("")
    : `<div class="empty">No sales yet today.</div>`;

  requestAnimationFrame(drawChart);
}

function drawChart() {
  const c = $("#chart");
  if (!c.clientWidth) return;
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = 180;
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const days = [];
  for (let d = 13; d >= 0; d--) {
    const from = daysAgoStart(d), to = daysAgoStart(d - 1);
    const ss = state.sales.filter((s) => s.ts >= from && s.ts < to);
    days.push({ t: from, rev: ss.reduce((a, s) => a + s.total, 0), profit: ss.reduce((a, s) => a + saleProfit(s), 0) });
  }
  const max = Math.max(...days.map((d) => d.rev), 1);
  const top = 22, bottom = 22, plotH = h - top - bottom, bw = w / days.length;
  const grad = g.createLinearGradient(0, top, 0, h - bottom);
  grad.addColorStop(0, "#2ef2ff"); grad.addColorStop(1, "rgba(182,255,59,0.25)");
  g.font = "11px system-ui"; g.textAlign = "center";
  days.forEach((d, i) => {
    const bh = (d.rev / max) * plotH, x = i * bw + bw * 0.18;
    g.fillStyle = i === days.length - 1 ? "#b6ff3b" : grad;
    g.beginPath();
    g.roundRect ? g.roundRect(x, h - bottom - bh, bw * 0.64, bh, 4) : g.rect(x, h - bottom - bh, bw * 0.64, bh);
    g.fill();
    g.fillStyle = "#8a97b4";
    g.fillText("SMTWTFS"[new Date(d.t).getDay()], i * bw + bw / 2, h - 6);
  });
  g.strokeStyle = "#ffb81c"; g.lineWidth = 2; g.beginPath();
  days.forEach((d, i) => {
    const x = i * bw + bw / 2, y = h - bottom - (d.profit / max) * plotH;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke();
  g.textAlign = "left"; g.fillStyle = "#8a97b4";
  g.fillText(`max ${R(max)}  ·  ▮ sales  ― profit`, 4, 12);
}

function voidSale(id) {
  const s = state.sales.find((x) => x.id === id);
  if (!s || !confirm(`Undo this ${R(s.total)} sale? Stock goes back on the shelf.`)) return;
  s.items.forEach((i) => { const p = product(i.pid); if (p) p.stock += i.qty; });
  if (s.cid && customer(s.cid)) customer(s.cid).balance -= s.total;
  state.sales = state.sales.filter((x) => x.id !== id);
  save();
  toast("↩︎ Sale undone");
  render();
}

/* ---------------- SHOP / SETTINGS ---------------- */

function renderMe() {
  $("#setName").value = state.shop.name || "";
  $("#setPhone").value = state.shop.phone || "";
}

async function exportBackup() {
  const name = `shesha-backup-${dayKey(Date.now())}.json`;
  const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Shesha backup" }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("⬇️ Backup saved to your downloads");
}

function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (s?.v !== 1 || !Array.isArray(s.products) || !Array.isArray(s.sales) || !Array.isArray(s.customers)) throw new Error();
      if (!confirm("Replace everything on this phone with the backup?")) return;
      s.payments ||= [];
      state = s; cart.clear(); save(); toast("✅ Backup restored"); render();
    } catch { toast("❌ That file isn't a Shesha backup"); }
  };
  r.readAsText(file);
}

/* ---------------- Wiring ---------------- */

function wire() {
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.view); });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-goto],[data-remind],[data-void],[data-restock],[data-edit],[data-cedit],[data-cpay],[data-dec],[data-inc],[data-cash]");
    if (!t) return;
    const d = t.dataset;
    if (d.goto) { e.preventDefault(); show(d.goto); }
    else if (d.remind) { e.preventDefault(); remind(d.remind); }
    else if (d.void) voidSale(d.void);
    else if (d.restock) { e.stopPropagation(); restock(d.restock); }
    else if (d.edit) openProduct(d.edit);
    else if (d.cedit) openCustomer(d.cedit);
    else if (d.cpay) openCustomer(d.cpay, { pay: true });
    else if (d.dec) { addToCart(d.dec, -1); renderCheckout(); }
    else if (d.inc) { addToCart(d.inc, 1); renderCheckout(); }
    else if (d.cash) { $("#tendered").value = (d.cash / 100).toFixed(2); updateChange(); }
  });

  $("#productGrid").addEventListener("click", (e) => { const t = e.target.closest("[data-pid]"); if (t) addToCart(t.dataset.pid); });
  $("#productGrid").addEventListener("contextmenu", (e) => {
    const t = e.target.closest("[data-pid]");
    if (t && cart.has(t.dataset.pid)) { e.preventDefault(); addToCart(t.dataset.pid, -1); }
  });
  $("#search").addEventListener("input", renderSell);
  $("#search").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = $("#search").value.trim();
    if (!q) return;
    const r = parseOrder(q);
    if (r.matched.length) applyOrder(r);
    else {
      const only = $$("#productGrid [data-pid]");
      if (only.length === 1) { addToCart(only[0].dataset.pid); $("#search").value = ""; renderSell(); }
      else toast(`🤔 Couldn't find “${q}”`);
    }
  });
  $("#micBtn").addEventListener("click", startVoice);

  $("#clearCart").addEventListener("click", () => { cart.clear(); render(); });
  $("#checkoutBtn").addEventListener("click", openCheckout);
  $("#cancelCheckout").addEventListener("click", () => $("#checkoutDlg").close());
  $("#payMethod").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { payMethod = b.dataset.m; renderCheckout(); } });
  $("#tendered").addEventListener("input", updateChange);
  $("#creditCustomer").addEventListener("change", (e) => {
    if (e.target.value === "__new") {
      e.target.value = "";
      openCustomer(null, { onSaved: (c) => renderCreditSelect(c.id) });
    } else renderCreditSelect();
  });
  $("#confirmSale").addEventListener("click", confirmSale);
  $("#closeDone").addEventListener("click", () => $("#doneDlg").close());
  $("#sendReceipt").addEventListener("click", () => { if (lastSale) openWhatsApp($("#receiptPhone").value, receiptText(lastSale)); $("#doneDlg").close(); });

  $("#addProductBtn").addEventListener("click", () => openProduct(null));
  $("#saveProduct").addEventListener("click", saveProduct);
  $("#cancelProduct").addEventListener("click", () => $("#productDlg").close());
  $("#pPrice").addEventListener("input", updateMargin);
  $("#pCost").addEventListener("input", updateMargin);
  $("#deleteProduct").addEventListener("click", () => {
    const id = $("#productDlg").dataset.id, p = product(id);
    if (!confirm(`Delete ${p.name}? Past sales stay in your history.`)) return;
    state.products = state.products.filter((x) => x.id !== id);
    cart.delete(id); save(); $("#productDlg").close(); render();
  });

  $("#addCustomerBtn").addEventListener("click", () => openCustomer(null));
  $("#saveCustomer").addEventListener("click", saveCustomer);
  $("#cancelCustomer").addEventListener("click", () => $("#customerDlg").close());

  $("#saveShop").addEventListener("click", () => {
    state.shop.name = $("#setName").value.trim() || "My Shop";
    state.shop.phone = $("#setPhone").value.trim();
    save(); toast("✅ Shop saved"); render();
  });
  $("#exportBtn").addEventListener("click", exportBackup);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ""; });
  $("#shareAppBtn").addEventListener("click", () => openWhatsApp("", `I run my shop on Shesha ⚡ — a free till, stock tracker and credit book that works offline, even during load-shedding. No data, no sign-up.${APP_URL ? `\n\nTry it: ${APP_URL}` : ""}`));
  $("#freshBtn").addEventListener("click", () => {
    if (!confirm("Clear all sales and customers? Your product list stays so you can just fix the prices.")) return;
    state.sales = []; state.customers = []; state.payments = []; state.archive = {}; state.demo = false;
    state.products.forEach((p) => { delete p.pop; });
    cart.clear(); save(); toast("🧹 Fresh start. Let's go!"); show("me");
  });
  $("#demoBtn").addEventListener("click", () => {
    if (!confirm("Load the demo shop? This replaces your current data.")) return;
    state = makeDemo(); cart.clear(); save(); toast("🎲 Demo shop loaded"); show("sell");
  });

  const net = () => {
    const on = navigator.onLine;
    $("#netPill").className = `pill ${on ? "live" : "warn"}`;
    $("#netPill").textContent = on ? "● Online" : "● Offline — still working";
  };
  addEventListener("online", net); addEventListener("offline", net); net();
  addEventListener("resize", () => current === "pulse" && drawChart());
}

wire();
save();
render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
