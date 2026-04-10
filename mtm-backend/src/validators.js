// src/validators.js
// Valida y sanitiza todos los datos antes de guardarlos o enviarlos

const validator = require('validator');
const xss = require('xss');

const CANCHAS_VALIDAS = [
  'basquetbol', 'padel', 'futbol7',
  'voleibol', 'multiple', 'pickleball'
];

const EXTRAS_VALIDOS = [
  'pisoPropio', 'asfalto', 'led', 'mallas',
  'canastas', 'redes', 'pintura', 'pasto', 'capacitacion'
];

const TIPOS_CLIENTE_VALIDOS = [
  'Empresa / club deportivo',
  'Fraccionamiento / condominio',
  'Municipio / gobierno',
  'Escuela',
  'Particular'
];

/**
 * Limpia un string: quita HTML/XSS y espacios extra
 */
function limpiar(str) {
  if (typeof str !== 'string') return '';
  return xss(str.trim()).slice(0, 1000); // máximo 1000 chars
}

/**
 * Valida el body del formulario de cotización.
 * Devuelve { ok: true, data } o { ok: false, errores: [...] }
 */
function validarCotizacion(body) {
  const errores = [];

  // ── Nombre ──────────────────────────────────────────
  const nombre = limpiar(body.nombre ?? '');
  if (!nombre || nombre.length < 2) {
    errores.push('El nombre es obligatorio (mínimo 2 caracteres).');
  } else if (nombre.length > 100) {
    errores.push('El nombre es demasiado largo.');
  }

  // ── Teléfono ─────────────────────────────────────────
  const telefono = limpiar(body.telefono ?? '');
  const telLimpio = telefono.replace(/[\s\-().+]/g, '');
  if (!telLimpio || telLimpio.length < 8 || telLimpio.length > 15) {
    errores.push('El teléfono es obligatorio y debe tener entre 8 y 15 dígitos.');
  } else if (!/^\d+$/.test(telLimpio)) {
    errores.push('El teléfono solo debe contener números.');
  }

  // ── Cancha ───────────────────────────────────────────
  const cancha = limpiar(body.cancha ?? '');
  if (!CANCHAS_VALIDAS.includes(cancha)) {
    errores.push('Tipo de cancha inválido.');
  }

  // ── Extras (array opcional) ───────────────────────────
  let extras = [];
  if (Array.isArray(body.extras)) {
    extras = body.extras
      .filter(e => EXTRAS_VALIDOS.includes(e))
      .slice(0, 10); // máximo 10 extras
  }

  // ── Ciudad (opcional) ────────────────────────────────
  const ciudad = limpiar(body.ciudad ?? '').slice(0, 100);

  // ── Tipo de cliente (opcional) ────────────────────────
  const tipoCliente = TIPOS_CLIENTE_VALIDOS.includes(body.tipoCliente)
    ? body.tipoCliente
    : null;

  // ── Comentarios (opcional) ────────────────────────────
  const comentarios = limpiar(body.comentarios ?? '').slice(0, 2000);

  // ── Estimado (opcional, números) ──────────────────────
  const estimadoMin = Number.isInteger(body.estimadoMin) ? body.estimadoMin : null;
  const estimadoMax = Number.isInteger(body.estimadoMax) ? body.estimadoMax : null;

  if (errores.length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      nombre,
      telefono: telLimpio,
      cancha,
      extras,
      ciudad,
      tipoCliente,
      comentarios,
      estimadoMin,
      estimadoMax,
    }
  };
}

module.exports = { validarCotizacion };

