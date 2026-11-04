import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase public/anon publishable key is intended for browser use.
// Customer data is returned only by the restricted get_customer_catalogue() RPC.
const SUPABASE_URL = "https://tfxsaqvjarbrcdmovapw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_31nPHL6gFDmhy0qGH49vDA_xX6FSSm-";

// Masukkan nombor WhatsApp rasmi CETAKNOW CORP dalam format antarabangsa tanpa +.
// Contoh format Malaysia: 60123456789. Biarkan kosong untuk membolehkan pelanggan
// memilih/menghantar mesej melalui WhatsApp Share.
const WHATSAPP_NUMBER = "601115304189";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const money = value => "RM" + Number(value || 0).toFixed(2);
let products = [];
let activeCategory = "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
}
function productFromId(id) { return products.find(product => product.id === id); }

function indicativeFrom(product) {
  const values = (product.price_tiers || []).map(t => Number(t.selling_price)).filter(n => Number.isFinite(n) && n > 0);
  return values.length ? Math.min(...values) : null;
}

function renderCategories() {
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const current = $("categoryFilter").value;
  $("categoryFilter").innerHTML = '<option value="">Semua kategori</option>' +
    categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  $("categoryFilter").value = categories.includes(current) ? current : "";
  $("categoryChips").innerHTML = ["Semua", ...categories].map(category => {
    const value = category === "Semua" ? "" : category;
    return `<button class="category-chip ${value === activeCategory ? "active" : ""}" data-category="${escapeHtml(value)}">${escapeHtml(category)}</button>`;
  }).join("");
  $("categoryChips").querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    $("categoryFilter").value = activeCategory;
    renderCategories();
    renderProducts();
  }));
}

function renderProducts() {
  const query = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const filtered = products.filter(p => {
    const matchesCategory = !category || p.category === category;
    const haystack = [p.name, p.code, p.category, p.specifications].join(" ").toLowerCase();
    return matchesCategory && haystack.includes(query);
  });
  $("productCount").textContent = String(filtered.length).padStart(2, "0");
  $("productGrid").innerHTML = filtered.length ? filtered.map((p, index) => {
    const price = indicativeFrom(p);
    const image = p.image_url
      ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
      : `<div class="image-placeholder"><span>✦</span><small>CETAKNOW<br>PRODUCT</small></div>`;
    const shortSpec = (p.specifications || "Pilihan produk boleh disesuaikan mengikut keperluan anda.").slice(0, 100);
    return `<article class="product-card">
      <button class="product-image" data-open-product="${escapeHtml(p.id)}" aria-label="Lihat ${escapeHtml(p.name)}">${image}<span class="image-view">VIEW DETAILS ↗</span><span class="product-index">${String(index+1).padStart(2,"0")}</span></button>
      <div class="product-card-content">
        <div class="product-meta"><span>${escapeHtml(p.category || "CORPORATE GIFT")}</span><span>${p.code ? escapeHtml(p.code) : "CUSTOM"}</span></div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(shortSpec)}${(p.specifications || "").length > 100 ? "…" : ""}</p>
        <div class="product-card-bottom"><div class="starting-price"><small>INDICATIVE PRICE</small><strong>${price !== null ? `From ${money(price)}<small> / pc</small>` : "Request price"}</strong></div><button class="round-arrow" data-open-product="${escapeHtml(p.id)}" aria-label="Lihat butiran">↗</button></div>
      </div>
    </article>`;
  }).join("") : `<div class="empty-state"><span>⌕</span><h3>Produk tidak ditemui</h3><p>Cuba kata carian atau kategori yang berbeza.</p></div>`;
  $("productGrid").querySelectorAll("[data-open-product]").forEach(button => button.addEventListener("click", () => openProduct(button.dataset.openProduct)));
}

function getQuoteTiers(product, itemType, method, size, quantity) {
  return (product.price_tiers || []).filter(t =>
    String(t.bag_type || "Standard") === itemType &&
    String(t.printing_method || "") === method &&
    String(t.printing_size || "") === size &&
    quantity >= Number(t.quantity_min || 1) &&
    (t.quantity_max == null || quantity <= Number(t.quantity_max))
  ).sort((a,b) => Number(a.quantity_min) - Number(b.quantity_min));
}
function quoteMessage(product, itemType, method, size, quantity, tier) {
  const priceLine = tier ? `Anggaran harga seunit: ${money(tier.selling_price)}\nAnggaran jumlah: ${money(Number(tier.selling_price) * quantity)}` : "Harga untuk kombinasi ini perlu disahkan melalui quotation.";
  return `Salam CETAKNOW CORP, saya berminat dengan produk berikut:\n\nProduk: ${product.name} (${product.code || "-"})\nJenis item: ${itemType}\nJenis printing: ${method}\nSaiz printing: ${size || "-"}\nKuantiti: ${quantity} pcs\n${priceLine}\n\nMohon quotation rasmi dan maklumat lanjut. Terima kasih.`;
}
function whatsappUrl(message) {
  const text = encodeURIComponent(message);
  return WHATSAPP_NUMBER.trim()
    ? `https://wa.me/${WHATSAPP_NUMBER.trim()}?text=${text}`
    : `https://wa.me/?text=${text}`;
}
function openProduct(id) {
  const p = productFromId(id);
  if (!p) return;
  const tiers = p.price_tiers || [];
  const itemTypes = [...new Set(tiers.map(t => t.bag_type || "Standard"))];
  const methods = [...new Set(tiers.map(t => t.printing_method).filter(Boolean))];
  const firstItem = itemTypes[0] || "";
  const firstMethod = methods[0] || "";
  const firstSize = tiers.find(t => (t.bag_type || "Standard") === firstItem && t.printing_method === firstMethod)?.printing_size || "";
  const gallery = p.reference_images || [];
  $("dialogProductName").textContent = p.name;
  $("dialogBody").innerHTML = `
    <div class="detail-layout">
      <div class="detail-gallery">
        <div class="detail-main-image">${p.image_url ? `<img id="detailMainImage" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">` : `<div class="image-placeholder"><span>✦</span><small>PRODUCT IMAGE</small></div>`}</div>
        ${gallery.length ? `<div class="detail-thumbs">${gallery.map((g,i)=>`<button class="detail-thumb ${i===0 && !p.image_url ? "selected" : ""}" data-gallery-image="${escapeHtml(g.image_url)}"><img src="${escapeHtml(g.image_url)}" alt="${escapeHtml(g.caption || "Gambar rujukan")}" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="detail-copy">
        <div class="product-meta"><span>${escapeHtml(p.category || "CORPORATE GIFT")}</span><span>${escapeHtml(p.code || "CUSTOM")}</span></div>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="detail-description">${escapeHtml(p.specifications || "Spesifikasi produk boleh dibincangkan mengikut keperluan tempahan.")}</p>
        <div class="detail-facts">
          <div><small>MINIMUM ORDER</small><b>${escapeHtml(p.moq || "—")} pcs</b></div>
          <div><small>LEAD TIME</small><b>${escapeHtml(p.lead_time || "6-7 hari bekerja")}</b></div>
          <div><small>GAMBAR RUJUKAN</small><b>${gallery.length} gambar</b></div>
          <div><small>HARGA</small><b>Indicative</b></div>
        </div>
        <div class="detail-disclaimer">Harga indikatif sahaja. Harga akhir tertakluk kepada kuantiti, artwork, spesifikasi dan pengesahan pihak CETAKNOW CORP.</div>
      </div>
    </div>
    <section class="price-checker">
      <div class="price-checker-head"><div><span class="eyebrow dark-eyebrow">QUICK PRICE ESTIMATOR</span><h3>Semak anggaran harga</h3><p>Pilih variasi produk dan kuantiti tempahan anda.</p></div><span class="price-icon">RM</span></div>
      ${tiers.length ? `<div class="quote-fields">
        <label>Jenis item<select id="quoteItem">${itemTypes.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}</select></label>
        <label>Jenis printing<select id="quoteMethod"></select></label>
        <label>Saiz printing<select id="quoteSize"></select></label>
        <label>Kuantiti (pcs)<input id="quoteQuantity" type="number" min="1" value="${Math.max(Number(p.moq)||1, Number(tiers[0]?.quantity_min)||1)}"></label>
      </div>
      <div class="quote-output" id="quoteOutput" aria-live="polite"></div>
      <a class="btn btn-dark quote-whatsapp" id="quoteWhatsapp" target="_blank" rel="noopener">Minta quotation rasmi <span>↗</span></a>` : `<div class="no-price">Harga indikatif belum tersedia untuk produk ini. Hubungi kami untuk mendapatkan quotation.</div><a class="btn btn-dark quote-whatsapp" href="${whatsappUrl(`Salam CETAKNOW CORP, saya ingin mendapatkan quotation untuk ${p.name} (${p.code || "-"})`)}" target="_blank" rel="noopener">Minta quotation <span>↗</span></a>`}
    </section>
    ${gallery.length ? `<section class="reference-gallery"><div><span class="eyebrow dark-eyebrow">INSPIRATION</span><h3>Contoh produk & galeri</h3></div><div class="reference-grid">${gallery.map(g=>`<a href="${escapeHtml(g.image_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(g.image_url)}" alt="${escapeHtml(g.caption || "Contoh produk")}" loading="lazy"><span>${g.image_type === "testimonial" ? "Testimoni pelanggan" : "Contoh produk"}${g.caption ? ` · ${escapeHtml(g.caption)}` : ""}</span></a>`).join("")}</div></section>` : ""}
    <div class="detail-bottom-cta"><div><b>Perlukan cadangan atau customisation?</b><small>Kami boleh bantu semak pilihan yang sesuai untuk projek anda.</small></div><a class="btn btn-light" href="${whatsappUrl(`Salam CETAKNOW CORP, saya ingin bertanya tentang ${p.name} (${p.code || "-"})`)}" target="_blank" rel="noopener">Hubungi kami ↗</a></div>
  `;
  $("dialogBody").querySelectorAll("[data-gallery-image]").forEach(button => button.addEventListener("click", () => {
    const main = $("detailMainImage");
    if (main) main.src = button.dataset.galleryImage;
    $("dialogBody").querySelectorAll(".detail-thumb").forEach(el => el.classList.remove("selected"));
    button.classList.add("selected");
  }));
  if (tiers.length) setupQuoteCalculator(p);
  $("productDialog").showModal();
}
function setupQuoteCalculator(product) {
  const item = $("quoteItem"), method = $("quoteMethod"), size = $("quoteSize"), quantity = $("quoteQuantity");
  const updateMethod = () => {
    const methods = [...new Set((product.price_tiers || []).filter(t => (t.bag_type || "Standard") === item.value).map(t=>t.printing_method).filter(Boolean))];
    method.innerHTML = methods.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    updateSize();
  };
  const updateSize = () => {
    const sizes = [...new Set((product.price_tiers || []).filter(t => (t.bag_type || "Standard") === item.value && t.printing_method === method.value).map(t=>t.printing_size || "Tidak dinyatakan"))];
    size.innerHTML = sizes.map(v=>`<option value="${escapeHtml(v === "Tidak dinyatakan" ? "" : v)}">${escapeHtml(v)}</option>`).join("");
    updateQuote();
  };
  const updateQuote = () => {
    const qty = Math.floor(Number(quantity.value));
    const selectedSize = size.value;
    const tier = qty > 0 ? getQuoteTiers(product, item.value, method.value, selectedSize, qty)[0] : null;
    const output = $("quoteOutput");
    if (!qty || qty < 1) {
      output.innerHTML = `<p class="quote-hint">Masukkan kuantiti yang sah.</p>`;
      $("quoteWhatsapp").href = whatsappUrl(quoteMessage(product,item.value,method.value,selectedSize,qty||0,null));
      return;
    }
    if (!tier) {
      output.innerHTML = `<p class="quote-hint">Tiada tier harga direkodkan untuk ${qty.toLocaleString("en-MY")} pcs. Sila minta quotation untuk kuantiti ini.</p>`;
      $("quoteWhatsapp").href = whatsappUrl(quoteMessage(product,item.value,method.value,selectedSize,qty,null));
      return;
    }
    const total = Number(tier.selling_price) * qty;
    output.innerHTML = `<div class="quote-price"><small>ANGGARAN HARGA SEUNIT</small><strong>${money(tier.selling_price)} <small>/ pc</small></strong></div><div class="quote-total"><span>Anggaran jumlah (${qty.toLocaleString("en-MY")} pcs)</span><b>${money(total)}</b></div><p class="quote-hint">Harga indikatif sahaja. Pengesahan akhir melalui quotation rasmi.</p>`;
    $("quoteWhatsapp").href = whatsappUrl(quoteMessage(product,item.value,method.value,selectedSize,qty,tier));
  };
  item.addEventListener("change", updateMethod);
  method.addEventListener("change", updateSize);
  size.addEventListener("change", updateQuote);
  quantity.addEventListener("input", updateQuote);
  updateMethod();
}
async function loadCatalogue() {
  const { data, error } = await supabase.rpc("get_customer_catalogue");
  if (error) {
    $("productGrid").innerHTML = `<div class="empty-state"><span>!</span><h3>Katalog belum dapat dimuatkan</h3><p>${escapeHtml(error.message)}<br>Pastikan SQL migration customer catalogue telah dijalankan di Supabase.</p></div>`;
    $("productCount").textContent = "00";
    return;
  }
  products = Array.isArray(data) ? data : [];
  renderCategories();
  renderProducts();
}
$("searchInput").addEventListener("input", renderProducts);
$("categoryFilter").addEventListener("change", () => { activeCategory = $("categoryFilter").value; renderCategories(); renderProducts(); });
$("closeDialog").addEventListener("click", () => $("productDialog").close());
$("productDialog").addEventListener("click", event => { if (event.target === $("productDialog")) $("productDialog").close(); });
$("year").textContent = new Date().getFullYear();
$("generalWhatsapp").href = whatsappUrl("Salam CETAKNOW CORP, saya ingin bertanya tentang corporate gifts dan printing.");
$("mobileMenu").addEventListener("click", () => document.querySelector(".desktop-nav").classList.toggle("nav-open"));
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault(); $("searchInput").focus();
  }
});
loadCatalogue();
