// src/mailer.js
// Envía dos emails al recibir una cotización:
//   1. Notificación interna al equipo MTM
//   2. Confirmación automática al cliente

const { createTransport } = require('nodemailer');

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Etiquetas legibles para mostrar en el email ──────
const NOMBRES_CANCHA = {
  basquetbol: 'Básquetbol',
  padel: 'Pádel / Tenis',
  futbol7: 'Fútbol 7',
  voleibol: 'Voleibol',
  multiple: 'Cancha Múltiple',
  pickleball: 'Pickleball',
};

const NOMBRES_EXTRA = {
  pisoPropio: 'Ya cuenta con piso propio',
  asfalto: 'Piso de asfalto',
  led: 'Iluminación LED',
  mallas: 'Mallas perimetrales',
  canastas: 'Canastas / tableros',
  redes: 'Redes y postes',
  pintura: 'Pintura y rotulación',
  pasto: 'Pasto sintético',
  capacitacion: 'Capacitación de uso',
};

function formatearPrecio(n) {
  if (!n) return '—';
  return '$' + Math.round(n).toLocaleString('es-MX') + ',000 MXN';
}

// ── Email interno para el equipo MTM ────────────────
function htmlNotificacionInterna(data) {
  const extrasLista = data.extras.length
    ? data.extras.map(e => `<li>${NOMBRES_EXTRA[e] ?? e}</li>`).join('')
    : '<li>Ninguno</li>';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; }
    .header { background: #0A0A0A; padding: 24px 32px; }
    .header h1 { color: #A8E63D; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.5); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .campo { margin-bottom: 16px; }
    .campo label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 1px; color: #999; margin-bottom: 4px; }
    .campo span { font-size: 16px; color: #0A0A0A; font-weight: 600; }
    .badge { display: inline-block; background: #A8E63D; color: #0A0A0A; border-radius: 20px;
             padding: 4px 14px; font-size: 13px; font-weight: 700; }
    .estimado { background: #f8f8f6; border-left: 3px solid #A8E63D; border-radius: 4px;
                padding: 14px 18px; margin: 20px 0; }
    .estimado .precio { font-size: 22px; font-weight: 800; color: #0A0A0A; }
    ul { margin: 8px 0 0; padding-left: 20px; color: #555; }
    .footer { background: #f8f8f6; padding: 16px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
    .cta { display: inline-block; margin-top: 20px; background: #0A0A0A; color: #fff !important;
           text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🏀 Nuevo lead recibido</h1>
      <p>MTM Sports — Sistema de cotizaciones</p>
    </div>
    <div class="body">
      <div class="campo">
        <label>Nombre</label>
        <span>${data.nombre}</span>
      </div>
      <div class="campo">
        <label>Teléfono</label>
        <span>${data.telefono}</span>
      </div>
      <div class="campo">
        <label>Ciudad</label>
        <span>${data.ciudad || 'No especificada'}</span>
      </div>
      <div class="campo">
        <label>Tipo de cliente</label>
        <span>${data.tipoCliente || 'No especificado'}</span>
      </div>
      <div class="campo">
        <label>Cancha solicitada</label>
        <span class="badge">${NOMBRES_CANCHA[data.cancha] ?? data.cancha}</span>
      </div>
      <div class="campo">
        <label>Extras seleccionados</label>
        <ul>${extrasLista}</ul>
      </div>
      ${data.estimadoMin ? `
      <div class="estimado">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8BC931;margin-bottom:6px;">Estimado calculado</div>
        <div class="precio">${formatearPrecio(data.estimadoMin)} — ${formatearPrecio(data.estimadoMax)}</div>
      </div>` : ''}
      ${data.comentarios ? `
      <div class="campo">
        <label>Comentarios del cliente</label>
        <span style="font-weight:400;color:#555;">${data.comentarios}</span>
      </div>` : ''}
      <a href="https://wa.me/52${data.telefono}?text=Hola%20${encodeURIComponent(data.nombre)}%2C%20soy%20de%20MTM%20Sports%2C%20recibimos%20tu%20solicitud%20de%20cotizaci%C3%B3n." class="cta">
        Contactar por WhatsApp →
      </a>
    </div>
    <div class="footer">
      Lead #${data.id} · ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · IP: ${data.ip ?? 'N/A'}
    </div>
  </div>
</body>
</html>`;
}

// ── Email de confirmación al cliente ────────────────
function htmlConfirmacionCliente(data) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; }
    .header { background: #0A0A0A; padding: 32px; text-align: center; }
    .header h1 { color: #A8E63D; margin: 0 0 8px; font-size: 26px; }
    .header p { color: rgba(255,255,255,0.5); margin: 0; font-size: 14px; }
    .body { padding: 32px; }
    .body p { color: #444; line-height: 1.7; }
    .highlight { background: #f8f8f6; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .highlight strong { color: #0A0A0A; }
    .badge { background: #A8E63D; color: #0A0A0A; border-radius: 20px;
             padding: 4px 14px; font-size: 13px; font-weight: 700; }
    .steps { list-style: none; padding: 0; margin: 20px 0; }
    .steps li { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; color: #555; font-size: 14px; }
    .steps li span.num { background: #0A0A0A; color: #A8E63D; border-radius: 50%;
                          width: 26px; height: 26px; display: flex; align-items: center;
                          justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
    .footer { background: #0A0A0A; padding: 20px 32px; text-align: center; }
    .footer p { color: rgba(255,255,255,0.3); font-size: 12px; margin: 0; }
    .footer a { color: #A8E63D; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>MTM SPORTS</h1>
      <p>Construcción de canchas deportivas profesionales</p>
    </div>
    <div class="body">
      <p>Hola <strong>${data.nombre}</strong>,</p>
      <p>Recibimos tu solicitud de cotización. Un asesor de MTM Sports se pondrá en contacto contigo en <strong>menos de 24 horas</strong>.</p>

      <div class="highlight">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;">Tu solicitud</p>
        <p style="margin:0;"><strong>Cancha:</strong> <span class="badge">${NOMBRES_CANCHA[data.cancha] ?? data.cancha}</span></p>
        ${data.ciudad ? `<p style="margin:8px 0 0;"><strong>Ciudad:</strong> ${data.ciudad}</p>` : ''}
        ${data.estimadoMin ? `<p style="margin:8px 0 0;"><strong>Estimado referencial:</strong> ${formatearPrecio(data.estimadoMin)} — ${formatearPrecio(data.estimadoMax)}</p>` : ''}
      </div>

      <p><strong>¿Qué sigue?</strong></p>
      <ul class="steps">
        <li>
          <span class="num">1</span>
          <span>Un asesor revisará tu solicitud y te contactará por teléfono o WhatsApp.</span>
        </li>
        <li>
          <span class="num">2</span>
          <span>Evaluamos las necesidades de tu proyecto y te enviamos una cotización formal.</span>
        </li>
        <li>
          <span class="num">3</span>
          <span>Si decides avanzar, coordinamos una visita técnica al terreno.</span>
        </li>
      </ul>

      <p>¿Tienes alguna duda urgente? Escríbenos directamente:</p>
      <p>
        <a href="https://wa.me/5213300000000" style="color:#0A0A0A;font-weight:700;">
          💬 WhatsApp: +52 (33) 0000-0000
        </a>
      </p>
    </div>
    <div class="footer">
      <p>© 2025 MTM Sports Mantenimiento · Guadalajara, Jalisco<br>
      <a href="#">Aviso de privacidad</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Función principal exportada ──────────────────────
async function enviarEmails(data) {
  // 1. Notificación interna
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: `🏀 Nuevo lead MTM — ${NOMBRES_CANCHA[data.cancha] ?? data.cancha} · ${data.nombre}`,
    html: htmlNotificacionInterna(data),
  });
}

module.exports = { enviarEmails };