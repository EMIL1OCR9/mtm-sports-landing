// src/index.js
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const { validarCotizacion } = require('./validators');
const { enviarEmails }      = require('./mailer');

const app  = express();
const PORT = process.env.PORT || 3000;

// Inicializar Prisma con la URL explícita
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: ['error'],
});

// ═══════════════════════════════════════════════════
//  SEGURIDAD
// ═══════════════════════════════════════════════════
app.use(helmet());

const origenesPermitidos = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // permite curl/Postman siempre
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    if (origenesPermitidos.includes('*')) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '16kb' }));
app.set('trust proxy', 1);

const limitGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
});
app.use(limitGeneral);

const limitCotizacion = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Límite de cotizaciones alcanzado. Intenta en una hora o contáctanos por WhatsApp.' },
});

// ═══════════════════════════════════════════════════
//  RUTAS
// ═══════════════════════════════════════════════════

// Health check — no usa Prisma, siempre responde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/cotizacion', limitCotizacion, async (req, res) => {
  try {
    const resultado = validarCotizacion(req.body);
    if (!resultado.ok) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: resultado.errores });
    }

    const { data } = resultado;

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

    enviarEmails({ ...data, id: lead.id, ip: req.ip }).catch(err => {
      console.error('[mailer] Error:', err.message);
    });

    return res.status(201).json({
      ok: true,
      mensaje: '¡Cotización recibida! Te contactamos en menos de 24 horas.',
      leadId: lead.id,
    });

  } catch (err) {
    console.error('[cotizacion] Error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' });
  }
});

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
    console.error('[leads] Error:', err.message);
    return res.status(500).json({ error: 'Error al obtener leads.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

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
  console.log(`   DATABASE_URL definida: ${!!process.env.DATABASE_URL}`);
});

prisma.$connect()
  .then(() => console.log('✅ Base de datos conectada'))
  .catch(err => console.error('❌ Error BD:', err.message));

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
