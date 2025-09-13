// library.js — Mallikirjasto (lukee samasta Sheetistä kuin muutkin)
(() => {
  const SHEET_ID = '1UXCthyfZTA1Y4C_WRg6CNoHQuAWPKzFKuoOhoEruuKE';
  const SHEET_LIBS = 'Kirjastot';
  const SHEET_CADS = 'OmatCADit';
  const csvUrl = (name)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

  const IMAGE_BASE = 'images/';
  const PLACEHOLDER = 'images/placeholder.jpg';

  const CI = (row, name) => {
    const k = Object.keys(row).find(x => x && x.trim().toLowerCase() === name.toLowerCase());
    return k ? row[k] : '';
  };

  function ensurePapa(cb){
    if (window.Papa) return cb();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
    s.onload = cb;
    s.onerror = ()=>console.error('PapaParse lataus epäonnistui');
    document.head.appendChild(s);
  }

  // --- Kirjastot ---
  const libList = document.getElementById('libList');
  function libCard(r){
    const div = document.createElement('div'); div.className='item card pad';
    const title = String(CI(r,'title')||'').trim() || 'Linkki';
    const url = String(CI(r,'url')||'').trim() || '#';
    const desc = String(CI(r,'desc')||'').trim();
    const tag = String(CI(r,'tag')||'').trim();
    let img = String(CI(r,'image')||'').trim();
    if(img) img = img.startsWith('http') ? img : (IMAGE_BASE + img);

    const a = document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.textContent=title;
    const p = document.createElement('p'); p.className='muted'; p.textContent=desc;
    const meta = document.createElement('div'); meta.className='sm muted'; meta.textContent=tag;

    div.appendChild(a);
    if(img){ const im=document.createElement('img'); im.src=img; im.alt=title; im.loading='lazy'; im.onerror=()=>im.remove(); im.style.marginTop='8px'; div.appendChild(im); }
    if(desc) div.appendChild(p);
    if(tag) div.appendChild(meta);
    return div;
  }
  function loadLibraries(){
    if(!libList) return;
    Papa.parse(csvUrl(SHEET_LIBS), {
      download:true, header:true, skipEmptyLines:'greedy',
      complete:(res)=>{
        const rows=(res.data||[]).map(r=>{
          const t=String(CI(r,'title')||'').trim(), u=String(CI(r,'url')||'').trim();
          return (t && u) ? r : null;
        }).filter(Boolean);
        libList.innerHTML='';
        if(!rows.length){ libList.innerHTML='<div class="item pad">Ei linkkejä – lisää Sheetin "Kirjastot"-välilehdelle.</div>'; return; }
        rows.forEach(r=>libList.appendChild(libCard(r)));
      },
      error:(e)=>console.error('Kirjastot CSV virhe:', e)
    });
  }

  // --- Omat CADit ---
  const cadList = document.getElementById('cadList');
  function cadCard(r){
    const div=document.createElement('div'); div.className='item card pad';
    const title=String(CI(r,'title')||'').trim()||'Nimetön';
    const link=String(CI(r,'link')||'').trim();
    const note=String(CI(r,'note')||'').trim();
    let img=String(CI(r,'image')||'').trim();
    if(img) img = img.startsWith('http') ? img : (IMAGE_BASE + img);

    const h3=document.createElement('h3'); h3.textContent=title; div.appendChild(h3);
    if(img){ const im=document.createElement('img'); im.src=img; im.alt=title; im.loading='lazy'; im.onerror=()=>{ im.src=PLACEHOLDER; }; div.appendChild(im); }
    if(note){ const p=document.createElement('p'); p.className='muted'; p.textContent=note; div.appendChild(p); }
    if(link){ const a=document.createElement('a'); a.href=link; a.target='_blank'; a.rel='noopener'; a.className='btn'; a.textContent='Avaa malli'; div.appendChild(a); }
    return div;
  }
  function loadCADs(){
    if(!cadList) return;
    Papa.parse(csvUrl(SHEET_CADS), {
      download:true, header:true, skipEmptyLines:'greedy',
      complete:(res)=>{
        const rows=(res.data||[]).map(r=>{
          // riittää että joku kenttä on täytetty
          const t=String(CI(r,'title')||'').trim(), i=String(CI(r,'image')||'').trim(), l=String(CI(r,'link')||'').trim();
          return (t || i || l) ? r : null;
        }).filter(Boolean);
        cadList.innerHTML='';
        if(!rows.length){ cadList.innerHTML='<div class="item pad">Ei CAD-kokeiluja – lisää Sheetin "OmatCADit"-välilehdelle.</div>'; return; }
        rows.forEach(r=>cadList.appendChild(cadCard(r)));
      },
      error:(e)=>console.error('OmatCADit CSV virhe:', e)
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{ ensurePapa(()=>{ loadLibraries(); loadCADs(); }); });
})();

