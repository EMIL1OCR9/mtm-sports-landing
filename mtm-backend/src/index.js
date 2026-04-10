// src/index.js
// Punto de entrada del servidor MTM Sports Backend

require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const { validarCotizacion } = require('./validators');
const { enviarEmails }      = require('./mailer');

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════
//  SEGURIDAD — Middleware globales
// ═══════════════════════════════════════════════════

// Helmet: cabeceras HTTP seguras (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS: solo permite peticiones desde tu dominio
const origenesPermitidos = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite Postman / curl en desarrollo (sin origin)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (origenesPermitidos.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Parsear JSON con límite de tamaño para evitar payload bombing
app.use(express.json({ limit: '16kb' }));

// IP real detrás de Railway/proxies
app.set('trust proxy', 1);

// ── Rate limiting general ──────────────────────────
const limitGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
});
app.use(limitGeneral);

// ── Rate limiting estricto para el formulario ──────
const limitCotizacion = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,                    // máximo 5 cotizaciones por hora por IP
  message: { error: 'Límite de cotizaciones alcanzado. Intenta en una hora o contáctanos por WhatsApp.' },
});

// ═══════════════════════════════════════════════════
//  RUTAS
// ═══════════════════════════════════════════════════

// ── Health check (Railway lo necesita) ────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── POST /api/cotizacion ───────────────────────────
app.post('/api/cotizacion', limitCotizacion, async (req, res) => {
  try {
    // 1. Validar y sanitizar
    const resultado = validarCotizacion(req.body);
    if (!resultado.ok) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: resultado.errores });
    }

    const { data } = resultado;

    // 2. Guardar en la base de datos
    const lead = await prisma.lead.create({
      data: {
        nombre:      data.nombre,
        telefono:    data.telefono,
        ciudad:      data.ciudad,
        tipoCliente: data.tipoCliente,
        comentarios: data.comentarios,
        cancha:      data.cancha,
        extras:      JSON.stringify(data.extras),
        estimadoMin: data.estimadoMin,
        estimadoMax: data.estimadoMax,
        ip:          req.ip,
        userAgent:   req.headers['user-agent']?.slice(0, 300) ?? null,
      },
    });

    // 3. Enviar emails (no bloqueamos la respuesta si falla)
    enviarEmails({ ...data, id: lead.id, ip: req.ip }).catch(err => {
      console.error('[mailer] Error al enviar email:', err.message);
    });

    // 4. Respuesta exitosa
    return res.status(201).json({
      ok: true,
      mensaje: '¡Cotización recibida! Te contactamos en menos de 24 horas.',
      leadId: lead.id,
    });

  } catch (err) {
    console.error('[cotizacion] Error inesperado:', err);
    return res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' });
  }
});

// ── GET /api/leads  (protegido por token de admin) ──
app.get('/api/leads', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return res.json({ total: leads.length, leads });
  } catch (err) {
    console.error('[leads] Error:', err);
    return res.status(500).json({ error: 'Error al obtener leads.' });
  }
});

// ── Ruta no encontrada ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Manejo global de errores ───────────────────────
app.use((err, req, res, next) => {
  console.error('[global]', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ═══════════════════════════════════════════════════
//  INICIO
// ═══════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`✅ MTM Sports Backend corriendo en puerto ${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV ?? 'development'}`);
});

// Cerrar Prisma limpiamente al apagar el proceso
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

