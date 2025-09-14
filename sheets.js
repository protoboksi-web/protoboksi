/* sheets.js — ProtoBoksi
 * Lukee Google Sheetsistä “Tuotteet” ja “Materiaalit”
 * – renderöi tuotekarusellin
 * – renderöi materiaalilistan
 * – täyttää lomakkeen “Materiaali”-alasvetovalikon
 *
 * Riippuvuudet: PapaParse (cdn: jsDelivr)
 * Sivulla pitäisi olla:
 *   #productsTrack (ul), #prodPrev, #prodNext
 *   #materialsList (div)
 *   #materialSelect (select)  — alasvetoon syötetään materiaalit
 *   (valinnainen) #formProduct, #formSku — täytetään kun klikataan “Tilaa”
 */

// ---------- ASETUKSET ----------

// Voit yliajaa nämä ennen tämän tiedoston latausta, esim:
// <script>window.PROTOBOKSI_SHEET_ID='...';</script>
const SHEET_ID = window.PROTOBOKSI_SHEET_ID || '1UXCthyfZTA1Y4C_WRg6CNoHQuAWPKzFKuoOhoEruuKE';
const SHEET_PRODUCTS  = window.PROTOBOKSI_SHEET_PRODUCTS  || 'Tuotteet';
const SHEET_MATERIALS = window.PROTOBOKSI_SHEET_MATERIALS || 'Materiaalit';

const csvUrl = (name) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

const IMAGE_BASE = '/protoboksi/images/';      // GitHub Pages -polku (muuta jos tarpeen)
const PLACEHOLDER = '/protoboksi/images/placeholder.jpg';

const fmtEUR = n => `€${n.toFixed(2).replace('.', ',')}`;

// ---------- APUFUNKTIOITA ----------

// Case-insensitive kentän nouto riviltä (Title vs title jne.)
function CI(obj, keyName) {
  if (!obj) return '';
  const want = String(keyName || '').trim().toLowerCase();
  const hit = Object.keys(obj).find(k => k && k.trim().toLowerCase() === want);
  return hit ? obj[hit] : '';
}

// “19,90 €” -> 19.90 (Number)
function parsePriceNumber(v) {
  if (v == null) return null;
  const s = String(v).replace(/[^\d,.\-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Turvallinen elementin hakija
function $(sel) { return document.querySelector(sel); }

// ---------- TUOTTEET ----------

function productCard(p) {
  const li = document.createElement('li');
  li.className = 'pcard';

  // Yläkuva
  const top = document.createElement('div');
  top.className = 'imgwrap';
  const img = document.createElement('img');
  img.alt = p.title || '';
  img.loading = 'lazy';
  img.src = p.image ? (p.image.startsWith('http') ? p.image : (IMAGE_BASE + p.image)) : PLACEHOLDER;
  img.onerror = () => { img.src = PLACEHOLDER; };
  top.appendChild(img);

  // Body
  const body = document.createElement('div');
  body.className = 'body';

  const h3 = document.createElement('h3');
  h3.textContent = p.title || '';

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = p.priceNum != null ? fmtEUR(p.priceNum) : (p.priceRaw || '');

  const desc = document.createElement('div');
  desc.className = 'desc';
  desc.textContent = p.desc || '';

  body.append(h3, price, desc);

  if (p.badge) {
    const b = document.createElement('span');
    b.className = 'pill';
    b.textContent = p.badge;
    body.appendChild(b);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'actions';

  const toForm = document.createElement('a');
  toForm.href = '#order';
  toForm.className = 'btn';
  toForm.textContent = 'Tilaa';

  toForm.addEventListener('click', () => {
    const fTitle = $('#formProduct');
    const fSku   = $('#formSku');
    if (fTitle) fTitle.value = p.title || '';
    if (fSku)   fSku.value   = p.sku   || '';
  });

  actions.appendChild(toForm);

  li.append(top, body, actions);
  return li;
}

function renderProducts(list) {
  const track  = $('#productsTrack');
  const prevBtn = $('#prodPrev');
  const nextBtn = $('#prodNext');

  if (!track) return;

  track.innerHTML = '';
  list.forEach(p => track.appendChild(productCard(p)));

  if (prevBtn) prevBtn.onclick = () => track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => track.scrollBy({ left:  track.clientWidth, behavior: 'smooth' });
}

function loadProducts() {
  if (typeof Papa === 'undefined') {
    console.error('PapaParse puuttuu – lisää se ennen sheets.js:ää');
    return;
  }

  Papa.parse(csvUrl(SHEET_PRODUCTS), {
    download: true,
    header:   true,
    skipEmptyLines: 'greedy',
    complete: (res) => {
      const rows = (res.data || [])
        .map(r => {
          const title = String(CI(r, 'title') || CI(r, 'product') || '').trim();
          if (!title) return null;

          const priceRaw = String(CI(r, 'price') || '').trim();
          const priceNum = parsePriceNumber(priceRaw);

          return {
            title,
            priceRaw,
            priceNum,
            desc:  String(CI(r, 'description') || CI(r, 'desc') || '').trim(),
            badge: String(CI(r, 'badge') || '').trim(),
            sku:   String(CI(r, 'sku') || '').trim(),
            image: String(CI(r, 'image') || '').trim(),
          };
        })
        .filter(Boolean);

      renderProducts(rows);
    },
    error: (e) => console.error('Tuotteet CSV virhe:', e)
  });
}

// ---------- MATERIAALIT ----------

function renderMaterialsList(rows) {
  const wrap = $('#materialsList');
  if (!wrap) return;
  wrap.innerHTML = '';

  rows.forEach(m => {
    const div = document.createElement('div');
    div.className = 'mrow';

    const left = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = m.name;
    const type = document.createElement('small');
    type.textContent = m.type ? ` • ${m.type}` : '';

    left.append(name, type);

    const right = document.createElement('div');
    right.className = 'muted';
    right.textContent = m.note || '';

    div.append(left, right);
    wrap.appendChild(div);
  });
}

// Täyttää lomakkeen materiaalialasvedon
function fillMaterialsSelect(rows) {
  const sel = $('#materialSelect') || document.querySelector('select[name="Materiaali"]');
  if (!sel) return;

  // Tyhjennä kaikki paitsi mahdollinen placeholder (value="")
  sel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  rows.forEach(m => {
    const label = m.type ? `${m.name} (${m.type})` : m.name;
    sel.appendChild(new Option(label, label));
  });

  sel.appendChild(new Option('Mikä vain kelpaa', 'Mikä vain kelpaa'));
  sel.appendChild(new Option('Jokin muu', 'Jokin muu'));
}

function loadMaterials() {
  if (typeof Papa === 'undefined') {
    console.error('PapaParse puuttuu – lisää se ennen sheets.js:ää');
    return;
  }

  Papa.parse(csvUrl(SHEET_MATERIALS), {
    download: true,
    header:   true,
    skipEmptyLines: 'greedy',
    complete: (res) => {
      const rows = (res.data || [])
        .map(r => {
          const name = String(CI(r, 'name') || '').trim();
          if (!name) return null;
          return {
            name,
            type: String(CI(r, 'type') || '').trim(),
            note: String(CI(r, 'note') || '').trim(),
          };
        })
        .filter(Boolean);

      renderMaterialsList(rows);
      fillMaterialsSelect(rows);
    },
    error: (e) => console.error('Materiaalit CSV virhe:', e)
  });
}

// ---------- INIT ----------

function initSheets() {
  // Aja vasta kun DOM on valmis
  loadProducts();
  loadMaterials();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSheets);
} else {
  initSheets();
}

// Debug-käyttöön konsoliin
window.__protoboksi = Object.assign(window.__protoboksi || {}, {
  loadProducts, loadMaterials, fillMaterialsSelect
});

