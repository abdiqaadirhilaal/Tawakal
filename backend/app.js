const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
if (env.isProd) app.set('trust proxy', 1);

app.use(
  helmet({
    // Sawirrada /uploads waxaa laga soo qaadaa frontend-ka oo ku jira origin kale.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, cb) {
      // Codsiyada aan lahayn Origin (curl, server-to-server, tijaabooyin) waa la oggol yahay;
      // browser-yada kaliya liiska CLIENT_URL ayaa loo oggol yahay.
      if (!origin || env.CLIENT_URLS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    index: false,
    dotfiles: 'ignore',
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: { status: 'up' } }));

app.use('/api', apiLimiter);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api', require('./routes/public'));

// Production: frontend-ka la dhisay (frontend/dist) waxaa laga adeegaa isla
// domain-kan API-ga, si cookie-ga fadhiga (SameSite=Lax) uu u shaqeeyo.
// Development-ka Vite ayaa frontend-ka adeegta (http://localhost:5173).
if (env.isProd) {
  const clientDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(clientDist, { index: false, maxAge: '1h', dotfiles: 'ignore' }));
  // SPA fallback: waddo kasta oo aan ahayn /api ama /uploads waxay celisaa index.html.
  app.get(/^\/(?!api(\/|$)|uploads(\/|$)).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
