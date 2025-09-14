/* sheets.js — ProtoBoksi (korjattu)
 * - Lataa tarvittaessa PapaParsen automaattisesti
 * - Lukee Google Sheetsistä "Tuotteet" ja "Materiaalit"
 * - Piirtää tuotekarusellin, materiaalilistan ja täyttää materiaalialasvedon
 */

/* ---------- ASETUKSET ---------- */

// Voit yliajaa nämä ennen skriptiä: window.PROTOBOKSI_SHEET_ID = '...'
const SHEET_ID         = window.PROTOBOKSI_SHEET_ID         || '1UXCthyfZTA1Y4C_WRg6CNoHQuAWPKzFKuoOhoEruuKE';
const SHEET_PRODUCTS   = window.PROTOBOKSI_SHEET_PRODUCTS   || 'Tuotteet';
const SHEET_MATERIALS  = window.PROTOBOKSI_SHEET_MATERIALS  || 'Materiaalit';

// GitHub Pages -juuri (muuta jos julkaiset toisaalle)
const IMAGE_BASE   = window.PROTOBOKSI_IMAGE_BASE || '/protoboksi/images/';
const PLACEHOLDER  = window.PROTOBOKSI_PLACEHOLDER || '/protoboksi/images/placeholder.jpg';

const csvUrl = (name) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

const fmtEUR = n => `€${n.toFixed(2).replace('.', ',')}`;

/* ---------- Apuja ---------- */

function $(s){ return document.querySelector(s); }

function CI(row, key){
  if(!row || !key) return '';
  const want = String(key).trim().toLowerCase();
  const hit = Object.keys(row).find(k => k && k.trim().toLowerCase() === want);
  return hit ? row[hit] : '';
}

function parsePriceNumber(v){
  if(v == null) return null;
  const s = String(v).replace(/[^\d,.\-]/g,'').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* ---------- PapaParse lataus tarvittaessa ---------- */
function ensurePapa(){
  return new Promise((resolve, reject)=>{
    if (window.Papa) return resolve(window.Papa);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
    s.async = true;
    s.onload = ()=> resolve(window.Papa);
    s.onerror = ()=> reject(new Error('PapaParse lataus epäonnistui'));
    document.head.appendChild(s);
  });
}

/* ---------- Tuotekaruselli ---------- */

function productCard(p){
  const li = document.createElement('li');
  li.className = 'pcard';

  const top = document.createElement('div');
  top.className = 'imgwrap';
  const img = document.createElement('img');
  img.alt = p.title || '';
  img.loading = 'lazy';
  img.src = p.image ? (p.image.startsWith('http') ? p.image : (IMAGE_BASE + p.image)) : PLACEHOLDER;
  img.onerror = ()=>{ img.src = PLACEHOLDER; };
  top.appendChild(img);

  const body = document.createElement('div');
  body.className = 'body';
  const h3 = document.createElement('h3');  h3.textContent = p.title || '';
  const price = document.createElement('div'); price.className='price';
  price.textContent = p.priceNum != null ? fmtEUR(p.priceNum) : (p.priceRaw || '');
  const desc = document.createElement('div'); desc.className='desc'; desc.textContent = p.desc || '';
  body.append(h3, price, desc);

  if (p.badge){
    const b = document.createElement('span'); b.className='pill'; b.textContent=p.badge;
    body.appendChild(b);
  }

  const actions = document.createElement('div'); actions.className='actions';
  const toForm = document.createElement('a'); toForm.href='#order'; toForm.className='btn'; toForm.textContent='Tilaa';
  toForm.addEventListener('click', ()=>{
    const fTitle = $('#formProduct'); if (fTitle) fTitle.value = p.title || '';
    const fSku   = $('#formSku');     if (fSku)   fSku.value   = p.sku   || '';
  });
  actions.appendChild(toForm);

  li.append(top, body, actions);
  return li;
}

function renderProducts(list){
  const track = $('#productsTrack');
  if(!track) return; // ei katkaista skriptiä

  track.innerHTML='';
  list.forEach(p => track.appendChild(productCard(p)));

  const prevBtn = $('#prodPrev'), nextBtn = $('#prodNext');
  if (prevBtn) prevBtn.onclick = ()=> track.scrollBy({left:-track.clientWidth, behavior:'smooth'});
  if (nextBtn) nextBtn.onclick = ()=> track.scrollBy({left: track.clientWidth, behavior:'smooth'});
}

function loadProducts(){
  Papa.parse(csvUrl(SHEET_PRODUCTS), {
    download:true, header:true, skipEmptyLines:'greedy',
    complete:(res)=>{
      const rows = (res.data||[])
        .map(r=>{
          const title = String(CI(r,'title') || CI(r,'product') || '').trim();
          if (!title) return null;
          const priceRaw = String(CI(r,'price')||'').trim();
          const priceNum = parsePriceNumber(priceRaw);
          return {
            title,
            priceRaw, priceNum,
            desc:  String(CI(r,'description')||CI(r,'desc')||'').trim(),
            badge: String(CI(r,'badge')||'').trim(),
            sku:   String(CI(r,'sku')||'').trim(),
            image: String(CI(r,'image')||'').trim(),
          };
        })
        .filter(Boolean);
      renderProducts(rows);
    },
    error:(e)=> console.error('Tuotteet CSV virhe:', e)
  });
}

/* ---------- Materiaalit ---------- */

function renderMaterialsList(rows){
  const wrap = $('#materialsList');
  if(!wrap) return;
  wrap.innerHTML='';
  rows.forEach(m=>{
    const div=document.createElement('div'); div.className='mrow';
    const left=document.createElement('div');
    const name=document.createElement('strong'); name.textContent=m.name;
    const type=document.createElement('small');  type.textContent = m.type ? ` • ${m.type}` : '';
    left.append(name, type);
    const right=document.createElement('div'); right.className='muted'; right.textContent=m.note||'';
    div.append(left, right);
    wrap.appendChild(div);
  });
}

// täyttää alasvedon
function fillMaterialsSelect(rows){
  const sel = $('#materialSelect') || document.querySelector('select[name="Materiaali"]');
  if(!sel) return;

  // jätä mahdollinen placeholder (value="")
  sel.querySelectorAll('option:not([value=""])').forEach(o=>o.remove());

  rows.forEach(m=>{
    const label = m.type ? `${m.name} (${m.type})` : m.name;
    sel.appendChild(new Option(label, label));
  });
  sel.appendChild(new Option('Mikä vain kelpaa', 'Mikä vain kelpaa'));
  sel.appendChild(new Option('Jokin muu', 'Jokin muu'));
}

function loadMaterials(){
  Papa.parse(csvUrl(SHEET_MATERIALS), {
    download:true, header:true, skipEmptyLines:'greedy',
    complete:(res)=>{
      const rows = (res.data||[])
        .map(r=>{
          const name = String(CI(r,'name')||'').trim();
          if(!name) return null;
          return {
            name,
            type: String(CI(r,'type')||'').trim(),
            note: String(CI(r,'note')||'').trim(),
          };
        })
        .filter(Boolean);

      renderMaterialsList(rows);
      fillMaterialsSelect(rows);
    },
    error:(e)=> console.error('Materiaalit CSV virhe:', e)
  });
}

/* ---------- INIT ---------- */

function init(){
  ensurePapa()
    .then(()=> {
      loadProducts();
      loadMaterials();
    })
    .catch(err=>{
      console.error(err);
    });
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Debug
window.__protoboksi = Object.assign(window.__protoboksi||{}, { loadProducts, loadMaterials });

