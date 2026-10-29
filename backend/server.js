const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

async function start() {
  try {
    await connectDB();
    console.log(`MongoDB waa lagu xirmay: ${env.MONGO_URI.replace(/\/\/[^@/]*@/, '//***@')}`);
  } catch (err) {
    console.error('MongoDB laguma xirmi karin. Hubi in adeegga MongoDB uu socdo iyo MONGO_URI.');
    console.error(err.message);
    process.exit(1);
  }
  const server = app.listen(env.PORT, () => {
    console.log(`TAWAKAL API wuxuu ka socdaa http://localhost:${env.PORT}/api  (${env.NODE_ENV})`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
