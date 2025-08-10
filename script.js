const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const state = { products: [], filtered: [], cart: [], categories: new Set() };

async function loadProducts(){
  const res = await fetch('products.json?ts=' + Date.now());
  const data = await res.json();
  state.products = data;
  state.filtered = data;
  data.forEach(p => state.categories.add(p.category));
  renderCategories();
  renderGrid();
}

function renderCategories(){
  const sel = $('#category');
  sel.innerHTML = '<option value="all">All categories</option>' + 
    [...state.categories].map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderGrid(){
  const grid = $('#grid');
  const list = [...state.filtered];
  const sort = $('#sort').value;
  list.sort((a,b)=>{
    if(sort==='price-asc') return a.price - b.price;
    if(sort==='price-desc') return b.price - a.price;
    if(sort==='commission-desc') return (b.commission||0) - (a.commission||0);
    if(sort==='newest') return new Date(b.added||0) - new Date(a.added||0);
    return (b.featured?1:0) - (a.featured?1:0);
  });
  grid.innerHTML = list.map(card).join('');
}

function card(p){
  const price = p.price ? `$${p.price.toFixed(2)}` : 'See price';
  const comm = p.commission ? `<span class="badge green">${p.commission}% comm</span>` : '';
  const badge = p.badge ? `<span class="badge">${p.badge}</span>` : '';
  return `<article class="card">
    <img class="img" src="${p.image}" alt="${p.title}"/>
    <div class="body">
      <div class="price-row">
        <strong>${price}</strong>
        <div>${comm} ${badge}</div>
      </div>
      <h3 style="margin:.2rem 0 .3rem;font-size:1rem">${p.title}</h3>
      <p style="color:#b0b3b8;margin:0;font-size:.9rem">${p.subtitle||''}</p>
      <div class="btn-row" style="margin-top:.6rem">
        <button class="add" onclick='addToCart(${JSON.stringify(p)})'>Add</button>
        <a class="buy" href="${p.link}" target="_blank" rel="noopener">Buy</a>
      </div>
    </div>
  </article>`;
}

function search(q){
  const term = q.toLowerCase();
  state.filtered = state.products.filter(p=> [p.title,p.subtitle,(p.tags||[]).join(' ')].join(' ').toLowerCase().includes(term));
  renderGrid();
}

function filterCategory(cat){
  if(cat==='all'){ state.filtered = [...state.products]; }
  else{ state.filtered = state.products.filter(p=> p.category===cat); }
  renderGrid();
}

function addToCart(p){
  const existing = state.cart.find(i=> i.id===p.id);
  if(existing){ existing.qty += 1; }
  else{ state.cart.push({ ...p, qty:1 }); }
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartUI();
  $('#cart').classList.add('open');
}

function updateCartUI(){
  $('#cartCount').textContent = state.cart.reduce((s,i)=> s+i.qty, 0);
  const items = state.cart.map(i=>`
    <div class="cart-item">
      <img src="${i.image}" alt="${i.title}">
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;gap:.5rem">
          <strong style="font-size:.95rem">${i.title}</strong>
          <button onclick="removeItem('${i.id}')">✕</button>
        </div>
        <div style="color:#b0b3b8;font-size:.9rem">${i.price?('$'+i.price.toFixed(2)):'See price'} • x${i.qty}</div>
      </div>
    </div>`).join('');
  $('#cartItems').innerHTML = items || '<p style="color:#b0b3b8">Cart is empty.</p>';
  const total = state.cart.reduce((s,i)=> s + (i.price||0)*i.qty, 0);
  $('#cartTotal').textContent = '$' + total.toFixed(2);
  // For "checkout", just send to the first item's link (affiliate) as a demo
  $('#checkout').href = state.cart[0]?.link || '#';
}

function removeItem(id){
  state.cart = state.cart.filter(i=> i.id!==id);
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartUI();
}

function restoreCart(){
  try{
    state.cart = JSON.parse(localStorage.getItem('cart')||'[]');
  }catch{ state.cart = []; }
  updateCartUI();
}

function exportCSV(){
  const rows = [['id','title','price','commission','category','badge','link','image','tags']];
  state.products.forEach(p=> rows.push([p.id,p.title,p.price,p.commission||'',p.category||'',p.badge||'',p.link||'',p.image||'',(p.tags||[]).join('|')]));
  const csv = rows.map(r=> r.map(x=> ('"'+String(x).replace(/"/g,'""')+'"')).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;a.download='products.csv';a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded',()=>{
  $('#year').textContent = new Date().getFullYear();
  restoreCart();
  loadProducts();
  $('#search').addEventListener('input', e=> search(e.target.value));
  $('#category').addEventListener('change', e=> filterCategory(e.target.value));
  $('#sort').addEventListener('change', renderGrid);
  $('#cartBtn').addEventListener('click', ()=> $('#cart').classList.add('open'));
  $('#closeCart').addEventListener('click', ()=> $('#cart').classList.remove('open'));
  $('#exportBtn').addEventListener('click', (e)=>{ e.preventDefault(); exportCSV(); });
});
