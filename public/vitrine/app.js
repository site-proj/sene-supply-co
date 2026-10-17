const WHATSAPP = '5547996102917';
const products = [
  { id:'destination', name:'FUCK THE DESTINATION', line:'MOTO CULTURE · PRETA', category:'moto', badge:'MAIS PEDIDA', image:'../assets/destination.jpg', alt:'Camiseta Sene Fuck the Destination, inspirada na cultura motociclista', detail:'Uma peça para quem sabe que o caminho é parte da história. Estampa marcante e espírito de estrada.' },
  { id:'negroni', name:'NEGRONI', line:'FOOD & BOOZE · PRETA', category:'food', badge:'FOOD & BOOZE', image:'../assets/negroni-model.jpg', alt:'Camiseta Sene com estampa Negroni nas costas', detail:'Uma homenagem às boas noites e às escolhas questionáveis. Arte original Sene em edição sob encomenda.' },
  { id:'classic-white', name:'CLASSIC LOGO', line:'SENE ORIGINAL · BRANCA', category:'classic', badge:'CLÁSSICA', image:'../assets/classic-white.jpg', alt:'Camiseta branca com o logo clássico do Sene', detail:'O logo clássico do Sene em uma peça leve para acompanhar o dia a dia.' },
  { id:'lucky', name:'LUCKY DIRTY HANDS', line:'MOTO CULTURE · PRETA', category:'moto', badge:'NOVO T-SHIRT\'S', image:'../assets/rider.jpg', alt:'Estampa Sene Lucky Dirty Hands com motociclista', detail:'Grafismo autoral para quem volta da estrada com histórias para contar.' },
  { id:'custom', name:'CUSTOM MOTORCYCLE', line:'MOTO CULTURE · PRETA', category:'moto', badge:'MOTO CULTURE', image:'../assets/custom-back.jpg', alt:'Camiseta Sene com arte Custom Motorcycle nas costas', detail:'Uma arte inspirada nas máquinas e na cultura custom que movem o Sene.' },
  { id:'classic-black', name:'SENE CLASSIC', line:'SENE ORIGINAL · PRETA', category:'classic', badge:'ESSENCIAL', image:'../assets/classic-man.jpg', alt:'Camiseta preta Sene Classic', detail:'A identidade do Sene em uma camiseta essencial, feita para usar sem cerimônia.' },
];
const grid = document.querySelector('#products');
const dialog = document.querySelector('#productDialog');
const filters = [...document.querySelectorAll('[data-filter]')];
const params = new URLSearchParams(location.search);
const safe = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const wa = text => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
let selected = products[0];
function card(product, index) {
  return `<article class="product-card" tabindex="0" role="button" aria-label="Ver ${safe(product.name)} e consultar com o Sene" data-product="${product.id}" style="--card-index:${index}">
    <div class="card-image"><img src="${product.image}" alt="${safe(product.alt)}" loading="lazy"><span class="card-badge">${safe(product.badge)}</span><button class="quick-open" type="button" aria-label="Ver detalhes de ${safe(product.name)}">↗</button></div>
    <div class="card-info"><div><h3>${safe(product.name)}</h3><p>${safe(product.line)}</p></div><span class="card-action">VER PEÇA&nbsp; ↗</span></div></article>`;
}
function render(filter='all') {
  const visible = products.filter(product => filter === 'all' || product.category === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('[data-product]').forEach(item => {
    item.addEventListener('click', event => { if (event.target.closest('button')) event.stopPropagation(); open(item.dataset.product); });
    item.addEventListener('keydown', event => { if (event.target === item && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(item.dataset.product); } });
  });
}
function open(id) {
  selected = products.find(product => product.id === id);
  if (!selected) return;
  document.querySelector('#dialogTitle').textContent = selected.name;
  document.querySelector('#dialogDetail').textContent = selected.detail;
  const image = document.querySelector('#dialogImage');
  image.src = selected.image; image.alt = selected.alt;
  updateLink(); dialog.showModal(); document.body.classList.add('dialog-open');
}
function updateLink() {
  const size = document.querySelector('#size').value;
  const fit = document.querySelector('#fit').value;
  const message = `Olá! Vi o Sene pela vitrine e quero consultar uma camiseta.\n\n• Modelo: ${selected.name}\n• Tamanho: ${size}\n• Modelagem: ${fit}\n\nPode me informar disponibilidade, preço e prazo de produção/entrega?`;
  document.querySelector('#dialogWhatsApp').href = wa(message);
}
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(filter => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); });
  render(button.dataset.filter);
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
document.querySelector('#size').addEventListener('change', updateLink);
document.querySelector('#fit').addEventListener('change', updateLink);
document.querySelector('#year').textContent = new Date().getFullYear();
render();
