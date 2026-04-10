// ── PICKLEBALL 3D ──
const canvas = document.getElementById('pickleball-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

function crearTextura() {
  const size = 1024;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#C8E830';
  ctx.fillRect(0, 0, size, size);


  const hoyos = [
    [0.15,0.12],[0.45,0.08],[0.75,0.12],[0.95,0.20],
    [0.05,0.30],[0.28,0.25],[0.60,0.22],[0.85,0.32],
    [0.15,0.42],[0.42,0.40],[0.70,0.38],[0.92,0.46],
    [0.08,0.55],[0.32,0.58],[0.58,0.55],[0.80,0.60],
    [0.20,0.68],[0.48,0.70],[0.72,0.72],[0.95,0.68],
    [0.10,0.80],[0.38,0.82],[0.65,0.80],[0.88,0.82],
    [0.22,0.92],[0.52,0.95],[0.78,0.90],
  ];

  hoyos.forEach(([x, y]) => {
    const cx = x * size;
    const cy = y * size;
    const r  = size * 0.038;

    ctx.beginPath();
    ctx.arc(cx + 4, cy + 4, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  });

  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.bezierCurveTo(size * 0.25, size * 0.35, size * 0.75, size * 0.65, size, size * 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 6;
  ctx.stroke();

  return new THREE.CanvasTexture(cv);
}

const geometry = new THREE.SphereGeometry(2, 64, 64);
const material = new THREE.MeshStandardMaterial({
  map: crearTextura(),
  roughness: 0.45,
  metalness: 0.05,
});

const pelota = new THREE.Mesh(geometry, material);
pelota.position.set(2.8, 0.2, 0);
scene.add(pelota);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const luzPrincipal = new THREE.DirectionalLight(0xA8E63D, 1.2);
luzPrincipal.position.set(-4, 3, 4);
scene.add(luzPrincipal);

const luzRelleno = new THREE.DirectionalLight(0xffffff, 0.3);
luzRelleno.position.set(4, -2, 2);
scene.add(luzRelleno);

function animar() {
  requestAnimationFrame(animar);
  pelota.rotation.y += 0.006;
  pelota.rotation.x += 0.001;
  renderer.render(scene, camera);
}
animar();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ══════════════════════════════════════════════════════
//  CONFIGURACIÓN — cambia esta URL al deployar en Railway
// ══════════════════════════════════════════════════════
const API_URL = 'https://TU-PROYECTO.up.railway.app/api/cotizacion';

// ── COTIZADOR ─────────────────────────────────────────
const precios = {
  basquetbol: [80, 150],
  padel:      [120, 200],
  futbol7:    [200, 400],
  voleibol:   [70, 130],
  multiple:   [150, 300],
  pickleball: [90, 160]
};

const extras = {
  pisoPropio:   [-15, -10],
  asfalto:      [20, 35],
  led:          [20, 50],
  mallas:       [15, 40],
  canastas:     [8, 20],
  redes:        [8, 18],
  pintura:      [8, 20],
  pasto:        [30, 60],
  capacitacion: [5, 10]
};

const activos = {
  pisoPropio: false, asfalto: false, led: false,
  mallas: false, canastas: false, redes: false,
  pintura: false, pasto: false, capacitacion: false
};

// Mapa extra key → id del toggle en el HTML
const TOGGLE_IDS = {
  pisoPropio: 't-piso-propio', asfalto: 't-asfalto', led: 't-led',
  mallas: 't-mallas', canastas: 't-canastas', redes: 't-redes',
  pintura: 't-pintura', pasto: 't-pasto', capacitacion: 't-capacitacion'
};

function toggleExtra(key) {
  // PisoPropio y asfalto son mutuamente excluyentes
  if (key === 'pisoPropio' && activos.asfalto) {
    activos.asfalto = false;
    document.getElementById(TOGGLE_IDS.asfalto)?.classList.remove('on');
  }
  if (key === 'asfalto' && activos.pisoPropio) {
    activos.pisoPropio = false;
    document.getElementById(TOGGLE_IDS.pisoPropio)?.classList.remove('on');
  }

  activos[key] = !activos[key];
  document.getElementById(TOGGLE_IDS[key])?.classList.toggle('on', activos[key]);
  calcular();
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-MX') + ',000 MXN';
}

// Valores del estimado actual (para enviarlos al backend)
let estimadoActual = { min: null, max: null };

function calcular() {
  const cancha = document.getElementById('cancha').value;
  if (!cancha) return;

  let min = precios[cancha][0];
  let max = precios[cancha][1];

  Object.keys(activos).forEach(key => {
    if (activos[key] && extras[key]) {
      min += extras[key][0];
      max += extras[key][1];
    }
  });

  min = Math.max(min, 20);
  estimadoActual = { min, max };

  document.getElementById('estimado-precio').textContent = fmt(min) + ' — ' + fmt(max);
  document.getElementById('estimado-box').classList.add('show');
}

// ── Envío al backend ──────────────────────────────────
async function enviarCotizacion() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const tel    = document.getElementById('f-tel').value.trim();
  const cancha = document.getElementById('cancha').value;

  if (!nombre || !tel || !cancha) {
    mostrarError('Por favor completa al menos: tipo de cancha, nombre y teléfono.');
    return;
  }

  const ciudad      = document.getElementById('f-ciudad').value.trim();
  const tipoCliente = document.getElementById('f-tipo').value;
  const comentarios = document.getElementById('f-msg').value.trim();

  const extrasActivos = Object.keys(activos).filter(k => activos[k]);

  const payload = {
    nombre,
    telefono:    tel,
    cancha,
    extras:      extrasActivos,
    ciudad,
    tipoCliente,
    comentarios,
    estimadoMin: estimadoActual.min,
    estimadoMax: estimadoActual.max,
  };

  // Estado de carga en el botón
  const btn = document.querySelector('.form-submit');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      // El backend devolvió un error controlado
      const msg = json.detalles?.join(' · ') ?? json.error ?? 'Error al enviar.';
      mostrarError(msg);
      return;
    }

    // ✅ Éxito: mostrar mensaje y abrir WhatsApp como respaldo
    document.getElementById('form-success').classList.add('show');

    const textoWA = `Hola MTM Sports, me interesa una cotización:%0A%0A*Cancha:* ${cancha}%0A*Nombre:* ${nombre}`;
    setTimeout(() => {
      window.open(`https://wa.me/5213300000000?text=${textoWA}`, '_blank');
    }, 1500);

  } catch (err) {
    // Error de red (sin conexión, CORS, etc.)
    mostrarError('No se pudo conectar con el servidor. Por favor escríbenos por WhatsApp.');
    console.error('[cotizacion] Error de red:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

function mostrarError(msg) {
  // Reutiliza el bloque de éxito con estilo de error si no tienes uno propio
  const el = document.getElementById('form-success');
  el.style.background = 'rgba(255,80,80,0.1)';
  el.style.borderColor = 'rgba(255,80,80,0.4)';
  el.querySelector('.form-success__title').style.color = '#ff6b6b';
  el.querySelector('.form-success__title').textContent = '⚠️ ' + msg;
  el.querySelector('.form-success__sub').textContent = 'También puedes escribirnos directamente por WhatsApp.';
  el.classList.add('show');
}

// ── FAQ ───────────────────────────────────────────────
function toggleFaq(el) {
  const item   = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ── MENÚ HAMBURGUESA ──────────────────────────────────
function toggleMenu() {
  const menu      = document.getElementById('nav-menu');
  const hamburger = document.getElementById('hamburger');
  const isOpen    = menu.classList.contains('open');

  menu.classList.toggle('open', !isOpen);
  hamburger.classList.toggle('open', !isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function cerrarMenu() {
  const menu      = document.getElementById('nav-menu');
  const hamburger = document.getElementById('hamburger');
  menu.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) cerrarMenu();
});