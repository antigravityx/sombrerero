require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.BASE_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'VerixRichon Payment Service' });
});

// Create Stripe checkout session
app.post('/api/payment/create', async (req, res) => {
  try {
    const { items, return_url, metadata } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items inválidos' });
    }

    // Crear sesión de checkout con Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: item.currency || 'usd',
          product_data: {
            name: item.title,
            description: item.description || '',
          },
          unit_amount: Math.round(item.unit_price * 100), // convertir a centavos
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: return_url || `${process.env.BASE_URL}/success`,
      cancel_url: return_url || `${process.env.BASE_URL}/cancel`,
      metadata: metadata || {},
    });

    res.json({ 
      checkout_url: session.url,
      session_id: session.id 
    });
  } catch (error) {
    console.error('Error al crear sesión de pago:', error);
    res.status(500).json({ 
      error: 'Error al procesar el pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook para recibir eventos de Stripe
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Error en webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Pago completado:', session.id);
      // Aquí puedes actualizar tu base de datos, enviar emails, etc.
      break;
    case 'payment_intent.succeeded':
      console.log('PaymentIntent exitoso');
      break;
    case 'payment_intent.payment_failed':
      console.log('PaymentIntent falló');
      break;
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  res.json({ received: true });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 VerixRichon Payment Service escuchando en puerto ${PORT}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV}`);
  console.log(`💳 Stripe configurado (${process.env.STRIPE_SECRET_KEY ? 'OK' : 'FALTA KEY'})`);
});
