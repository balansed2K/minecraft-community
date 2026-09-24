const data = SITE_SETTINGS.houses;
const houses = document.getElementById('houses');

data.forEach((h, i) => {
  const el = document.createElement('article');
  el.className = 'house';
  el.innerHTML = `<div class="houseImg"><img src="${h.image}" alt="${h.name}" loading="lazy"><span>HOUSE</span></div><div class="houseBody"><h3>${h.name}</h3><div class="spec"><span>Тип</span><b>${h.floors}</b></div><div class="spec"><span>Цена</span><b>${h.price}</b></div><button data-i="${i}">Подробнее →</button></div>`;
  houses.appendChild(el);
});

const houseDialog = document.getElementById('houseDialog');
document.addEventListener('click', e => {
  if (!e.target.matches('[data-i]')) return;
  const h = data[+e.target.dataset.i];
  document.getElementById('houseTitle').textContent = h.name;
  document.getElementById('houseInfo').textContent = `${h.floors}. Цена: ${h.price}. Здесь позже можно добавить размеры, описание и другие характеристики.`;
  houseDialog.showModal();
});

const nav = document.getElementById('nav');
document.querySelector('.mob').onclick = () => nav.classList.toggle('open');
document.querySelectorAll('nav a').forEach(a => a.onclick = () => nav.classList.remove('open'));
document.getElementById('theme').onclick = () => { document.body.classList.toggle('light'); document.getElementById('theme').textContent = document.body.classList.contains('light') ? '☀' : '☾'; };

document.querySelector('.heroText h1').innerHTML = SITE_SETTINGS.heroTitle.replace('\n', '<br>');
document.querySelector('.heroText p').textContent = SITE_SETTINGS.heroSubtitle;
document.querySelector('.discord .btn').href = SITE_SETTINGS.discordUrl;

const reviewDialog = document.getElementById('reviewDialog');
document.getElementById('reviewOpen').onclick = () => reviewDialog.showModal();
function safe(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function addReview(r) { const el = document.createElement('article'); el.innerHTML = `<div class="avatar">${safe(r.name[0]).toUpperCase()}</div><div><b>${safe(r.name)}</b><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div><p>${safe(r.text)}</p>`; document.getElementById('reviewsGrid').prepend(el); }
JSON.parse(localStorage.getItem('mc_reviews') || '[]').forEach(addReview);
document.getElementById('reviewForm').onsubmit = e => { e.preventDefault(); const r = {name:name.value.trim(), rating:+rating.value, text:text.value.trim()}; if (!r.name || !r.text) return; const arr = JSON.parse(localStorage.getItem('mc_reviews') || '[]'); arr.unshift(r); localStorage.setItem('mc_reviews', JSON.stringify(arr.slice(0,30))); addReview(r); reviewForm.reset(); reviewDialog.close(); };
