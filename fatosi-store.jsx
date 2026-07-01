import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShoppingBag, Plus, Trash2, Pencil, LayoutDashboard, Package, Users,
  Lock, X, Crown, TrendingUp, Euro, Receipt, ChevronLeft, Check,
  Image as ImageIcon, AlertTriangle, LogOut, Settings
} from "lucide-react";

/* ================= STORAGE ================= */
const K = {
  products: "fatosi-products",
  orders: "fatosi-orders",
  customers: "fatosi-customers",
  settings: "fatosi-settings",
  img: (id) => `fatosi-img-${id}`,
};
// Uses window.storage when the host provides it, otherwise falls back to
// localStorage so the app still persists when run as a plain React app.
async function sGet(key, fallback) {
  try {
    if (typeof window !== "undefined" && window.storage?.get) {
      const r = await window.storage.get(key, true);
      return r ? JSON.parse(r.value) : fallback;
    }
    const r = localStorage.getItem(key);
    return r != null ? JSON.parse(r) : fallback;
  } catch { return fallback; }
}
async function sSet(key, val) {
  const s = JSON.stringify(val);
  try {
    if (typeof window !== "undefined" && window.storage?.set) {
      await window.storage.set(key, s, true);
    } else {
      localStorage.setItem(key, s);
    }
    return true;
  } catch (e) { console.error("storage set failed", key, e); return false; }
}
async function sDel(key) {
  try {
    if (typeof window !== "undefined" && window.storage?.delete) {
      await window.storage.delete(key, true);
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}

const VIP_THRESHOLD = 500;
const VIP_DISCOUNT = 0.10;
const fmt = (n) => "€" + Number(n || 0).toFixed(2);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const SEED = [
  { id: "seed-1", name: "Fatosi Original — Black", price: 89, desc: "The flagship. Replace this with your real product from the admin panel.", hue: 220 },
  { id: "seed-2", name: "Fatosi Limited — Ivory", price: 129, desc: "Limited run sample product. Edit or delete me in Admin → Products.", hue: 40 },
  { id: "seed-3", name: "Fatosi Essential", price: 49, desc: "Entry-level sample product. Add your own photos and descriptions.", hue: 150 },
];

/* ================= APP ================= */
export default function FatosiStore() {
  const [view, setView] = useState("shop"); // shop | admin
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [images, setImages] = useState({});
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState({});
  const [settings, setSettings] = useState({ pin: "1234" });
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      let [p, o, c, s] = await Promise.all([
        sGet(K.products, null),
        sGet(K.orders, []),
        sGet(K.customers, {}),
        sGet(K.settings, { pin: "1234" }),
      ]);
      if (!p) { p = SEED; sSet(K.products, p); }
      setProducts(p); setOrders(o); setCustomers(c); setSettings(s);
      setLoading(false);
      // progressive image load
      for (const prod of p) {
        if (prod.hasImg) {
          sGet(K.img(prod.id), null).then((img) => {
            if (img) setImages((m) => ({ ...m, [prod.id]: img }));
          });
        }
      }
    })();
  }, []);

  /* ---- mutations ---- */
  const saveProducts = async (next) => { setProducts(next); await sSet(K.products, next); };
  const saveOrders = async (next) => { setOrders(next); await sSet(K.orders, next); };
  const saveCustomers = async (next) => { setCustomers(next); await sSet(K.customers, next); };

  const addToCart = (p) => {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      return ex ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
    notify(`${p.name} added`);
    setCartOpen(true);
  };

  const placeOrder = async ({ name, email }) => {
    const em = email.trim().toLowerCase();
    const existing = customers[em] || { name, spent: 0 };
    const isVip = existing.spent >= VIP_THRESHOLD;
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const discount = isVip ? subtotal * VIP_DISCOUNT : 0;
    const total = subtotal - discount;
    const order = {
      id: uid(), name: name.trim(), email: em,
      items: cart.map((i) => ({ ...i })),
      subtotal, discount, total, ts: Date.now(), vip: isVip,
    };
    const nextCustomers = { ...customers, [em]: { name: name.trim(), spent: existing.spent + total } };
    await Promise.all([saveOrders([order, ...orders]), saveCustomers(nextCustomers)]);
    setCart([]);
    return { order, wasVip: isVip, nowVip: nextCustomers[em].spent >= VIP_THRESHOLD, spent: nextCustomers[em].spent };
  };

  const resetStore = async () => {
    await Promise.all([
      ...products.filter((p) => p.hasImg).map((p) => sDel(K.img(p.id))),
      sDel(K.orders), sDel(K.customers),
    ]);
    setOrders([]); setCustomers({}); setImages({}); setCart([]);
    setProducts(SEED);
    await sSet(K.products, SEED);
  };

  if (loading) return <Splash />;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900" style={{ fontFamily: "'Archivo', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .disp{font-variation-settings:'wdth' 125;font-weight:800;text-transform:uppercase;letter-spacing:-0.01em}
        .mono{font-family:'IBM Plex Mono',monospace}
        ::selection{background:#7c3aed;color:#fff}
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-stone-100/85 backdrop-blur border-b border-stone-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => setView("shop")} className="disp text-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-violet-600 rounded-sm inline-block" />FATOSI
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => { setCartOpen(false); setView(view === "admin" ? "shop" : "admin"); }}
              className={`text-xs tracking-widest uppercase px-4 py-2 rounded-full border transition ${view === "admin" ? "bg-stone-900 text-stone-100 border-stone-900" : "border-stone-400 hover:border-stone-900"}`}>
              {view === "admin" ? "Storefront" : "Admin"}
            </button>
            {view === "shop" && (
              <button onClick={() => setCartOpen(true)} aria-label="Open cart"
                className="flex items-center gap-2 border border-stone-900 rounded-full px-4 py-2 text-sm hover:bg-stone-900 hover:text-stone-100 transition">
                <ShoppingBag size={15} />
                <span className="mono text-xs">{cart.reduce((a, i) => a + i.qty, 0)}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {view === "shop" ? (
        <Shop products={products} images={images} addToCart={addToCart} customers={customers} />
      ) : (
        <Admin
          settings={settings} setSettings={setSettings}
          products={products} saveProducts={saveProducts}
          images={images} setImages={setImages}
          orders={orders} customers={customers}
          resetStore={resetStore}
          notify={notify}
        />
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart} setCart={setCart} close={() => setCartOpen(false)}
          customers={customers} placeOrder={placeOrder} notify={notify}
        />
      )}

      {view === "shop" && cart.length > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} aria-label="Open cart"
          className="fixed bottom-5 right-5 z-40 bg-stone-900 text-stone-100 rounded-full pl-5 pr-6 py-4 flex items-center gap-3 shadow-2xl hover:bg-violet-600 transition active:scale-95">
          <ShoppingBag size={18} />
          <span className="font-semibold text-sm">{fmt(cart.reduce((a, i) => a + i.price * i.qty, 0))}</span>
          <span className="mono text-[11px] bg-violet-600 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{cart.reduce((a, i) => a + i.qty, 0)}</span>
        </button>
      )}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-semibold shadow-xl whitespace-nowrap ${toast.type === "err" ? "bg-red-600 text-white" : "bg-stone-900 text-stone-100"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Splash() {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl font-extrabold tracking-tight uppercase mb-3">Fatosi</div>
        <div className="text-stone-500 text-sm animate-pulse">Opening the store…</div>
      </div>
    </div>
  );
}

/* ================= SHOP ================= */
function Shop({ products, images, addToCart, customers }) {
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");
  const shown = products.filter((p) =>
    (p.name + " " + (p.desc || "")).toLowerCase().includes(q.trim().toLowerCase())
  );
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
      <header className="py-10 sm:py-16 border-b border-stone-300 mb-6 sm:mb-10">
        <div className="flex justify-between text-[11px] uppercase tracking-widest text-stone-500 mb-4">
          <span>Official store</span><span className="mono">VIP unlocks at €{VIP_THRESHOLD}</span>
        </div>
        <h1 className="disp text-5xl sm:text-7xl leading-[0.95]">Fatosi</h1>
        <p className="mt-4 text-stone-600 max-w-md">Every purchase counts toward VIP. Spend {fmt(VIP_THRESHOLD)} total and get {VIP_DISCOUNT * 100}% off everything, forever.</p>
      </header>

      {products.length > 0 && (
        <div className="relative mb-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
            className="w-full border border-stone-300 rounded-full pl-5 pr-12 py-3.5 bg-white text-base focus:outline-none focus:border-violet-600" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900"><X size={16} /></button>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-24 text-stone-500">No products yet. The admin hasn't stocked the shelves.</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-24 text-stone-500">Nothing matches "{q}". Try a different word or <button onClick={() => setQ("")} className="underline">clear the search</button>.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden group hover:shadow-lg transition-shadow">
              <button onClick={() => setDetail(p)} className="block w-full text-left">
                <ProductImage p={p} img={images[p.id]} className="aspect-[4/3]" />
              </button>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">{p.desc}</div>
                  </div>
                  <div className="mono text-sm whitespace-nowrap">{fmt(p.price)}</div>
                </div>
                <button onClick={() => addToCart(p)}
                  className="mt-4 w-full bg-stone-900 text-stone-100 rounded-full py-2.5 text-sm font-semibold hover:bg-violet-600 transition">
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <Modal close={() => setDetail(null)}>
          <ProductImage p={detail} img={images[detail.id]} className="aspect-[16/9] rounded-xl" />
          <h3 className="disp text-2xl mt-5">{detail.name}</h3>
          <div className="mono text-lg mt-1">{fmt(detail.price)}</div>
          <p className="text-stone-600 mt-3 whitespace-pre-wrap leading-relaxed">{detail.desc}</p>
          <button onClick={() => { addToCart(detail); setDetail(null); }}
            className="mt-6 w-full bg-stone-900 text-stone-100 rounded-full py-3 font-semibold hover:bg-violet-600 transition">
            Add to cart — {fmt(detail.price)}
          </button>
        </Modal>
      )}
    </main>
  );
}

function ProductImage({ p, img, className = "" }) {
  if (img) return <img src={img} alt={p.name} className={`w-full object-cover bg-stone-200 ${className}`} />;
  const hue = p.hue ?? (p.id.charCodeAt(0) * 7) % 360;
  return (
    <div className={`w-full flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 25% 22%), hsl(${hue} 30% 40%))` }}>
      <span className="disp text-white/25 text-3xl">Fatosi</span>
    </div>
  );
}

function useEscape(close) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [close]);
}

function Modal({ children, close, wide }) {
  useEscape(close);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={close}>
      <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()}
        className={`relative bg-stone-50 rounded-t-2xl sm:rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[92vh] overflow-y-auto p-6 shadow-2xl`}>
        <button onClick={close} aria-label="Close" className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}

/* ================= CART / CHECKOUT ================= */
function CartDrawer({ cart, setCart, close, customers, placeOrder, notify }) {
  const [step, setStep] = useState("cart"); // cart | checkout | done
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEscape(close);

  const em = email.trim().toLowerCase();
  const existing = customers[em];
  const isVip = existing && existing.spent >= VIP_THRESHOLD;
  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discount = isVip ? subtotal * VIP_DISCOUNT : 0;
  const total = subtotal - discount;

  const qty = (id, d) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));

  const submit = async () => {
    if (!name.trim() || !/.+@.+\..+/.test(em)) { notify("Enter a valid name and email", "err"); return; }
    if (cart.length === 0) { notify("Your cart is empty", "err"); setStep("cart"); return; }
    setBusy(true);
    const r = await placeOrder({ name, email: em });
    setBusy(false);
    setResult(r);
    setStep("done");
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" onClick={close} />
      <aside className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-stone-50 border-l border-stone-300 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-300">
          <h3 className="disp text-lg">{step === "done" ? "Order placed" : step === "checkout" ? "Checkout" : "Cart"}</h3>
          <button onClick={close} aria-label="Close cart" className="text-stone-400 hover:text-stone-900"><X size={20} /></button>
        </div>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center text-stone-500 py-20 text-sm">Your cart is empty.</div>
              ) : cart.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-4 border-b border-stone-200">
                  <div>
                    <div className="font-semibold text-sm">{i.name}</div>
                    <div className="flex items-center gap-1 mt-2 border border-stone-300 rounded-full w-fit">
                      <button onClick={() => qty(i.id, -1)} aria-label={`Remove one ${i.name}`} className="w-7 h-7 text-stone-500 hover:text-stone-900">−</button>
                      <span className="mono text-xs w-6 text-center">{i.qty}</span>
                      <button onClick={() => qty(i.id, +1)} aria-label={`Add one ${i.name}`} className="w-7 h-7 text-stone-500 hover:text-stone-900">+</button>
                    </div>
                  </div>
                  <div className="mono text-sm">{fmt(i.price * i.qty)}</div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-stone-300 px-6 py-5">
                <div className="flex justify-between text-sm mb-4"><span>Subtotal</span><span className="mono font-semibold">{fmt(subtotal)}</span></div>
                <button onClick={() => setStep("checkout")} className="w-full bg-stone-900 text-stone-100 rounded-full py-3.5 font-semibold hover:bg-violet-600 transition">Checkout</button>
              </div>
            )}
          </>
        )}

        {step === "checkout" && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <button onClick={() => setStep("cart")} className="flex items-center gap-1 text-xs text-stone-500 mb-5"><ChevronLeft size={14} />Back to cart</button>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1.5">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Kovači"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 mb-4 bg-white focus:outline-none focus:border-violet-600" />
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1.5">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-violet-600" />

            {isVip && (
              <div className="mt-4 flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 text-sm">
                <Crown size={16} /> VIP member — {VIP_DISCOUNT * 100}% off applied
              </div>
            )}
            {existing && !isVip && (
              <div className="mt-4 text-xs text-stone-500">
                You've spent {fmt(existing.spent)}. {fmt(VIP_THRESHOLD - existing.spent)} more to unlock VIP.
              </div>
            )}

            <div className="mt-6 border-t border-stone-300 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span className="mono">{fmt(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-amber-700"><span>VIP −{VIP_DISCOUNT * 100}%</span><span className="mono">−{fmt(discount)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2"><span>Total</span><span className="mono">{fmt(total)}</span></div>
            </div>

            <button onClick={submit} disabled={busy}
              className="mt-6 w-full bg-violet-600 text-white rounded-full py-3.5 font-semibold hover:bg-violet-700 transition disabled:opacity-50">
              {busy ? "Placing order…" : `Place order — ${fmt(total)}`}
            </button>
            <p className="text-[11px] text-stone-400 text-center mt-3">Prototype checkout — no real payment is processed.</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4"><Check size={26} /></div>
            <div className="disp text-xl mb-1">Thank you, {result.order.name.split(" ")[0]}</div>
            <div className="mono text-sm text-stone-500 mb-4">Order #{result.order.id.slice(-6).toUpperCase()} · {fmt(result.order.total)}</div>
            {result.wasVip ? (
              <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-full px-5 py-2.5 text-sm font-semibold">
                <Crown size={16} /> VIP discount applied — you saved {fmt(result.order.discount)}
              </div>
            ) : result.nowVip ? (
              <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-full px-5 py-2.5 text-sm font-semibold">
                <Crown size={16} /> You're a VIP member — {VIP_DISCOUNT * 100}% off from now on
              </div>
            ) : (
              <div className="text-xs text-stone-500">Total spent: {fmt(result.spent)} · VIP at {fmt(VIP_THRESHOLD)}</div>
            )}
            <button onClick={close} className="mt-8 border border-stone-900 rounded-full px-6 py-2.5 text-sm hover:bg-stone-900 hover:text-stone-100 transition">Keep shopping</button>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ================= ADMIN ================= */
function Admin({ settings, setSettings, products, saveProducts, images, setImages, orders, customers, resetStore, notify }) {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState("dash");

  if (!authed) {
    const tryUnlock = () => {
      if (pin === settings.pin) { setAuthed(true); setPin(""); }
      else notify("Wrong PIN", "err");
    };
    return (
      <div className="max-w-sm mx-auto px-6 py-24 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-stone-900 text-stone-100 flex items-center justify-center mb-5"><Lock size={20} /></div>
        <h2 className="disp text-2xl mb-2">Admin access</h2>
        <p className="text-sm text-stone-500 mb-6">Enter the admin PIN. <span className="block mt-1 text-[11px]">(Prototype gate — not real security.)</span></p>
        <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" placeholder="PIN" autoFocus
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-center mono bg-white focus:outline-none focus:border-violet-600" />
        <button onClick={tryUnlock}
          className="mt-4 w-full bg-stone-900 text-stone-100 rounded-full py-3 font-semibold hover:bg-violet-600 transition">Unlock</button>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div className="flex items-center justify-between py-8">
        <h2 className="disp text-3xl">Admin</h2>
        <button onClick={() => setAuthed(false)} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900"><LogOut size={14} />Lock</button>
      </div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {[["dash", "Dashboard", LayoutDashboard], ["products", "Products", Package], ["customers", "Customers", Users], ["settings", "Settings", Settings]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition ${tab === id ? "bg-stone-900 text-stone-100 border-stone-900" : "border-stone-300 hover:border-stone-900"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === "dash" && <Dashboard orders={orders} customers={customers} products={products} />}
      {tab === "products" && <ProductsAdmin products={products} saveProducts={saveProducts} images={images} setImages={setImages} notify={notify} />}
      {tab === "customers" && <CustomersAdmin customers={customers} orders={orders} />}
      {tab === "settings" && <SettingsAdmin settings={settings} setSettings={setSettings} resetStore={resetStore} notify={notify} />}
    </main>
  );
}

/* ---- dashboard ---- */
function Dashboard({ orders, customers, products }) {
  const stats = useMemo(() => {
    const revenue = orders.reduce((a, o) => a + o.total, 0);
    const aov = orders.length ? revenue / orders.length : 0;
    const vips = Object.values(customers).filter((c) => c.spent >= VIP_THRESHOLD).length;
    const byProduct = {};
    orders.forEach((o) => o.items.forEach((i) => {
      byProduct[i.name] = byProduct[i.name] || { qty: 0, rev: 0 };
      byProduct[i.name].qty += i.qty;
      byProduct[i.name].rev += i.price * i.qty;
    }));
    const top = Object.entries(byProduct).sort((a, b) => b[1].rev - a[1].rev);
    // last 7 days
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      return { t: d.getTime(), label: d.toLocaleDateString("en-GB", { weekday: "short" }), rev: 0 };
    });
    orders.forEach((o) => {
      const day = days.find((d) => o.ts >= d.t && o.ts < d.t + 86400000);
      if (day) day.rev += o.total;
    });
    return { revenue, aov, vips, top, days };
  }, [orders, customers]);

  const maxDay = Math.max(...stats.days.map((d) => d.rev), 1);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Euro} label="Total revenue" value={fmt(stats.revenue)} />
        <Stat icon={Receipt} label="Orders" value={orders.length} />
        <Stat icon={TrendingUp} label="Avg order" value={fmt(stats.aov)} />
        <Stat icon={Crown} label="VIP members" value={stats.vips} gold />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-4">Last 7 days</div>
          <div className="flex items-end gap-2 h-36">
            {stats.days.map((d) => (
              <div key={d.t} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                <div className="mono text-[10px] text-stone-500">{d.rev > 0 ? fmt(d.rev) : ""}</div>
                <div className="w-full bg-violet-600 rounded-t-md transition-all" style={{ height: `${(d.rev / maxDay) * 70}%`, minHeight: d.rev > 0 ? 6 : 2, opacity: d.rev > 0 ? 1 : 0.15 }} />
                <div className="text-[10px] text-stone-400">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-4">Top products</div>
          {stats.top.length === 0 ? <div className="text-sm text-stone-400 py-8 text-center">No sales yet</div> :
            stats.top.slice(0, 5).map(([name, d]) => (
              <div key={name} className="flex justify-between items-center py-2.5 border-b border-stone-100 last:border-0 text-sm">
                <span className="font-medium">{name} <span className="text-stone-400 text-xs">×{d.qty}</span></span>
                <span className="mono">{fmt(d.rev)}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-4">Every order — full detail</div>
        {orders.length === 0 ? <div className="text-sm text-stone-400 py-8 text-center">No orders yet. Share the store link.</div> : (
          <>
            {/* mobile: cards */}
            <div className="sm:hidden space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="border border-stone-200 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">{o.name}{o.vip && <Crown size={12} className="text-amber-500" />}</div>
                      <div className="text-xs text-stone-400">{o.email}</div>
                    </div>
                    <div className="mono font-bold">{fmt(o.total)}</div>
                  </div>
                  <div className="text-xs text-stone-600 mt-2">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
                  <div className="flex justify-between items-center mt-3 text-[11px] text-stone-400">
                    <span className="mono">#{o.id.slice(-6).toUpperCase()}{o.discount > 0 ? ` · VIP −${fmt(o.discount)}` : ""}</span>
                    <span>{new Date(o.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-stone-400 border-b border-stone-200">
                  <th className="py-2 pr-4">Order</th><th className="pr-4">Customer</th><th className="pr-4">Items</th>
                  <th className="pr-4">Discount</th><th className="pr-4">Total</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-stone-100 last:border-0 align-top">
                    <td className="py-3 pr-4 mono text-xs">#{o.id.slice(-6).toUpperCase()}</td>
                    <td className="pr-4">
                      <div className="font-medium flex items-center gap-1.5">{o.name}{o.vip && <Crown size={12} className="text-amber-500" />}</div>
                      <div className="text-xs text-stone-400">{o.email}</div>
                    </td>
                    <td className="pr-4 text-xs text-stone-600">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                    <td className="pr-4 mono text-xs">{o.discount > 0 ? "−" + fmt(o.discount) : "—"}</td>
                    <td className="pr-4 mono font-semibold">{fmt(o.total)}</td>
                    <td className="text-xs text-stone-400 whitespace-nowrap">{new Date(o.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, gold }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${gold ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-600"}`}><Icon size={16} /></div>
      <div className="mono text-xl font-medium">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-stone-500 mt-1">{label}</div>
    </div>
  );
}

/* ---- products admin ---- */
function ProductsAdmin({ products, saveProducts, images, setImages, notify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | product

  const remove = async (p) => {
    await saveProducts(products.filter((x) => x.id !== p.id));
    if (p.hasImg) sDel(K.img(p.id));
    setImages((m) => { const n = { ...m }; delete n[p.id]; return n; });
    notify("Product deleted");
  };

  return (
    <div>
      <button onClick={() => setEditing("new")}
        className="flex items-center gap-2 bg-violet-600 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-violet-700 transition mb-6">
        <Plus size={16} />New product
      </button>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <ProductImage p={p} img={images[p.id]} className="aspect-[4/3]" />
            <div className="p-4">
              <div className="flex justify-between gap-2">
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="mono text-sm">{fmt(p.price)}</div>
              </div>
              <div className="text-xs text-stone-500 line-clamp-2 mt-1">{p.desc}</div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setEditing(p)} className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 rounded-full py-2 text-xs hover:border-stone-900"><Pencil size={12} />Edit</button>
                <button onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="flex items-center justify-center gap-1.5 border border-red-200 text-red-600 rounded-full px-4 py-2 text-xs hover:bg-red-50"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          images={images}
          close={() => setEditing(null)}
          save={async (data, imgData) => {
            let next;
            if (editing === "new") {
              const p = { id: uid(), ...data, hasImg: !!imgData };
              if (imgData) {
                const ok = await sSet(K.img(p.id), imgData);
                if (!ok) { notify("Image too large to save — try a smaller photo", "err"); p.hasImg = false; }
                else setImages((m) => ({ ...m, [p.id]: imgData }));
              }
              next = [p, ...products];
            } else {
              const p = { ...editing, ...data };
              if (imgData) {
                const ok = await sSet(K.img(p.id), imgData);
                if (ok) { p.hasImg = true; setImages((m) => ({ ...m, [p.id]: imgData })); }
                else notify("Image too large to save — try a smaller photo", "err");
              }
              next = products.map((x) => (x.id === p.id ? p : x));
            }
            await saveProducts(next);
            setEditing(null);
            notify("Product saved");
          }}
        />
      )}
    </div>
  );
}

function ProductForm({ product, images, close, save }) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [desc, setDesc] = useState(product?.desc || "");
  const [imgData, setImgData] = useState(null);
  const [preview, setPreview] = useState(product ? images[product.id] : null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const data = cv.toDataURL("image/jpeg", 0.78);
        setImgData(data);
        setPreview(data);
      };
      img.onerror = () => console.error("could not decode image file");
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!name.trim() || !(Number(price) > 0)) return;
    setBusy(true);
    await save({ name: name.trim(), price: Number(price), desc: desc.trim() }, imgData);
    setBusy(false);
  };

  return (
    <Modal close={close} wide>
      <h3 className="disp text-xl mb-5">{product ? "Edit product" : "New product"}</h3>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <button onClick={() => fileRef.current?.click()}
            className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-stone-300 hover:border-violet-500 transition flex items-center justify-center overflow-hidden bg-stone-100">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : (
              <div className="text-stone-400 text-sm flex flex-col items-center gap-2"><ImageIcon size={22} />Upload photo</div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <p className="text-[11px] text-stone-400 mt-2">Photos are resized automatically. Tap to replace.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name"
              className="w-full border border-stone-300 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:border-violet-600" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1.5">Price (€)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="49.00"
              className="w-full border border-stone-300 rounded-xl px-4 py-2.5 bg-white mono focus:outline-none focus:border-violet-600" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1.5">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="What is it, what's it made of, why should someone buy it…"
              className="w-full border border-stone-300 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:border-violet-600 resize-none" />
          </div>
        </div>
      </div>
      <button onClick={submit} disabled={busy || !name.trim() || !(Number(price) > 0)}
        className="mt-6 w-full bg-stone-900 text-stone-100 rounded-full py-3 font-semibold hover:bg-violet-600 transition disabled:opacity-40">
        {busy ? "Saving…" : "Save product"}
      </button>
    </Modal>
  );
}

/* ---- customers admin ---- */
function CustomersAdmin({ customers, orders }) {
  const list = Object.entries(customers)
    .map(([email, c]) => ({ email, ...c, orders: orders.filter((o) => o.email === email).length }))
    .sort((a, b) => b.spent - a.spent);
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-stone-500 mb-4">Customers · VIP at {fmt(VIP_THRESHOLD)}</div>
      {list.length === 0 ? <div className="text-sm text-stone-400 py-8 text-center">No customers yet.</div> : (
        <>
          {/* mobile: cards */}
          <div className="sm:hidden space-y-3">
            {list.map((c) => (
              <div key={c.email} className="border border-stone-200 rounded-xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-stone-400 break-all">{c.email}</div>
                  </div>
                  {c.spent >= VIP_THRESHOLD ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0"><Crown size={11} />VIP</span>
                  ) : (
                    <span className="text-[11px] text-stone-400 shrink-0 text-right">{fmt(VIP_THRESHOLD - c.spent)}<br/>to VIP</span>
                  )}
                </div>
                <div className="flex justify-between mt-3 text-xs text-stone-500">
                  <span>{c.orders} order{c.orders !== 1 ? "s" : ""}</span>
                  <span className="mono font-semibold text-stone-900">{fmt(c.spent)}</span>
                </div>
              </div>
            ))}
          </div>
          {/* desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-stone-400 border-b border-stone-200">
                <th className="py-2 pr-4">Customer</th><th className="pr-4">Orders</th><th className="pr-4">Total spent</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.email} className="border-b border-stone-100 last:border-0">
                  <td className="py-3 pr-4"><div className="font-medium">{c.name}</div><div className="text-xs text-stone-400">{c.email}</div></td>
                  <td className="pr-4 mono">{c.orders}</td>
                  <td className="pr-4 mono font-semibold">{fmt(c.spent)}</td>
                  <td>{c.spent >= VIP_THRESHOLD ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1 text-xs font-semibold"><Crown size={12} />VIP</span>
                  ) : (
                    <span className="text-xs text-stone-400">{fmt(VIP_THRESHOLD - c.spent)} to VIP</span>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- settings ---- */
function SettingsAdmin({ settings, setSettings, resetStore, notify }) {
  const [pin, setPin] = useState(settings.pin);
  const [confirming, setConfirming] = useState(false);
  const [wiping, setWiping] = useState(false);

  const savePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) { notify("PIN must be 4–8 digits", "err"); return; }
    const next = { ...settings, pin };
    setSettings(next);
    await sSet(K.settings, next);
    notify("PIN updated");
  };

  const wipe = async () => {
    setWiping(true);
    await resetStore();
    setWiping(false);
    setConfirming(false);
    notify("Store reset — sample products restored");
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Admin PIN</div>
        <div className="flex gap-2">
          <input value={pin} onChange={(e) => setPin(e.target.value)} className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 mono bg-stone-50 focus:outline-none focus:border-violet-600" />
          <button onClick={savePin} className="bg-stone-900 text-stone-100 rounded-xl px-5 text-sm font-semibold hover:bg-violet-600 transition">Save</button>
        </div>
        <p className="text-[11px] text-stone-400 mt-2 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />This gate is client-side only. Anyone technical can bypass it — don't store anything sensitive here.</p>
      </div>
      <div className="bg-white border border-red-200 rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-red-500 mb-3">Danger zone</div>
        {confirming ? (
          <div className="flex gap-2">
            <button onClick={wipe} disabled={wiping} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">{wiping ? "Deleting…" : "Yes, delete everything"}</button>
            <button onClick={() => setConfirming(false)} disabled={wiping} className="flex-1 border border-stone-300 rounded-xl py-2.5 text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="w-full border border-red-300 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50">Reset all store data</button>
        )}
      </div>
    </div>
  );
}
