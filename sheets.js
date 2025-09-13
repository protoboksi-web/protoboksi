// sheets.js — ProtoBoksi (Tuotteet + Materiaalit Google Sheetsistä)
(() => {
  const SHEET_ID = '1c_lpTr8TCILxeNV0lwohgLpagALqTgcHhQAeyTbwYNk';
  const SHEET_PRODUCTS  = 'Tuotteet';
  const SHEET_MATERIALS = 'Materiaalit';
  const IMAGE_BASE = 'images/';
  const PLACEHOLDER = 'images/placeholder.jpg';
  const csvUrl = (name)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

  const fmtEUR = n => `€${n.toFixed(2).replace('.',',')}`;
  const CI = (row, name) => {
    if (!row) return '';
    const key = Object.keys(row).find(k => k && k.trim().toLowerCase() === name);
    return key ? row[key] : '';
  };
  function parsePriceNumber(v){
    if(!v) return null;
    const s = String(v).replace(/[^\d,.\-]/g,'').replace(',','.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  function ensurePapa(cb){
    if (window.Papa) return cb();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
    s.onload = cb;
    s.onerror = ()=>console.error('PapaParse lataus epäonnistui');
    document.head.appendChild(s);
  }

  // ---------- TUOTTEET ----------
  const track = document.getElementById('productsTrack');
  function productCard(p){
    const li=document.createElement('li'); li.className='pcard';
    const top=document.createElement('div'); top.className='imgwrap';
    const img=document.createElement('img'); img.alt=p.title; img.loading='lazy';
    img.src = p.image ? (p.image.startsWith('http') ? p.image : (IMAGE_BASE + p.image)) : PLACEHOLDER;
    img.onerror=()=>{ img.src=PLACEHOLDER; };
    top.appendChild(img);

    const body=document.createElement('div'); body.className='body';
    const h3=document.createElement('h3'); h3.textContent=p.title;
    const price=document.createElement('div'); price.className='price';
    price.textContent = p.priceNum!=null ? fmtEUR(p.priceNum) : (p.priceRaw || '');
    const desc=document.createElement('div'); desc.className='desc'; desc.textContent=p.desc||'';
    body.append(h3, price, desc);
    if(p.badge){ const b=document.createElement('span'); b.className='pill'; b.textContent=p.badge; body.appendChild(b); }

    const actions=document.createElement('div'); actions.className='actions';
    const toForm=document.createElement('a'); toForm.href='#order'; toForm.className='btn'; toForm.textContent='Tilaa';
    toForm.addEventListener('click',()=>{
      const fp=document.getElementById('formProduct'); if(fp) fp.value=p.title;
      const fs=document.getElementById('formSku');     if(fs) fs.value=p.sku||'';
    });
    actions.appendChild(toForm);

    li.append(top, body, actions);
    return li;
  }
  function renderProducts(list){
    if(!track) return;
    track.innerHTML='';
    if(!list.length){
      track.innerHTML = `<li class="pcard"><div class="body"><h3>Ei tuotteita</h3><div class="desc">Tarkista Sheetsin “Tuotteet”.</div></div></li>`;
      return;
    }
    list.forEach(p=>track.appendChild(productCard(p)));
  }
  function loadProducts(){
    Papa.parse(csvUrl(SHEET_PRODUCTS), {
      download:true, header:true, skipEmptyLines:'greedy',
      complete:(res)=>{
        try{
          const rows = (res.data||[]).map(r=>{
            const title = String(CI(r,'title')||CI(r,'product')||'').trim();
            if(!title) return null;
            const priceRaw = String(CI(r,'price')||'').trim();
            const priceNum = parsePriceNumber(priceRaw);
            return {
              title,
              priceRaw, priceNum,
              desc:  String(CI(r,'description')||CI(r,'desc')||'').trim(),
              badge: String(CI(r,'badge')||'').trim(),
              sku:   String(CI(r,'sku')||'').trim(),
              image: String(CI(r,'image')||'').trim()
            };
          }).filter(Boolean);
          renderProducts(rows);
        }catch(e){
          console.error('Tuotteet käsittelyvirhe:', e, res);
          if(track) track.innerHTML = `<li class="pcard"><div class="body"><h3>Virhe</h3><div class="desc">Tuotteiden käsittely epäonnistui.</div></div></li>`;
        }
      },
      error:(e)=>{
        console.error('Tuotteet CSV virhe:', e);
        if(track) track.innerHTML = `<li class="pcard"><div class="body"><h3>Virhe</h3><div class="desc">Tuotteiden lataus epäonnistui.</div></div></li>`;
      }
    });
  }

  // ---------- MATERIAALIT ----------
  const materialsList = document.getElementById('materialsList');
  function renderMaterials(rows){
    if(!materialsList) return;
    materialsList.innerHTML='';
    if(!rows.length){
      materialsList.innerHTML = `<div class="mrow"><div><strong>Ei materiaaleja</strong></div><div class="muted">Tarkista Sheetsin “Materiaalit”.</div></div>`;
      return;
    }
    rows.forEach(m=>{
      const div=document.createElement('div'); div.className='mrow';
      const left=document.createElement('div');
      const name = document.createElement('strong'); name.textContent = m.name;
      const type = document.createElement('small'); type.textContent = m.type ? ` • ${m.type}` : '';
      left.append(name, type);
      const right=document.createElement('div'); right.className='muted'; right.textContent = m.note || '';
      div.append(left, right);
      materialsList.appendChild(div);
    });
  }
  function loadMaterials(){
    Papa.parse(csvUrl(SHEET_MATERIALS), {
      download:true, header:true, skipEmptyLines:'greedy',
      complete:(res)=>{
        try{
          const rows=(res.data||[]).map(r=>{
            const name=String(CI(r,'name')||'').trim(); if(!name) return null;
            return {name, type:String(CI(r,'type')||'').trim(), note:String(CI(r,'note')||'').trim()};
          }).filter(Boolean);
          renderMaterials(rows);
        }catch(e){
          console.error('Materiaalit käsittelyvirhe:', e, res);
          if(materialsList) materialsList.innerHTML = `<div class="mrow"><div><strong>Virhe</strong></div><div class="muted">Materiaalien käsittely epäonnistui.</div></div>`;
        }
      },
      error:(e)=>{
        console.error('Materiaalit CSV virhe:', e);
        if(materialsList) materialsList.innerHTML = `<div class="mrow"><div><strong>Virhe</strong></div><div class="muted">Materiaalien lataus epäonnistui.</div></div>`;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensurePapa(()=>{ loadProducts(); loadMaterials(); });
    const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  });
})();
