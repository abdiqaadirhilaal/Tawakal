/*
 * Abuuritaanka maamulaha ugu horreeya (ama mid dheeraad ah).
 *   npm run create-admin
 * Wuxuu ku weydiinayaa magaca, email-ka iyo furaha sirta ah. Sidoo kale waxaad ku
 * siin kartaa ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD faylka .env (kadibna ka tirtir).
 * Ma jiro bog dadweyne oo lagu diiwaangeliyo maamule.
 */
const readline = require('readline');
const bcrypt = require('bcryptjs');
require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { createUser } = require('../validators/auth');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (str) => {
        if (str.includes(question)) process.stdout.write(str);
        else if (str === '\r\n' || str === '\n') process.stdout.write('\n');
        else process.stdout.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const name = process.env.ADMIN_NAME || (await ask('Magaca maamulaha: '));
  const email = process.env.ADMIN_EMAIL || (await ask('Email: '));
  const password = process.env.ADMIN_PASSWORD || (await ask('Furaha sirta ah (ugu yaraan 10 xaraf): ', { hidden: true }));

  const parsed = createUser.safeParse({ name, email, password, role: 'admin' });
  if (!parsed.success) {
    console.error('Xogta sax ma aha:');
    parsed.error.issues.forEach((i) => console.error(` - ${i.path.join('.')}: ${i.message}`));
    process.exit(1);
  }

  await connectDB();
  try {
    if (await User.exists({ email: parsed.data.email })) {
      console.error(`Isticmaale leh email-ka ${parsed.data.email} hore ayuu u jiray. Waxba lama beddelin.`);
      process.exitCode = 1;
      return;
    }
    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      role: 'admin',
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    });
    console.log(`Maamulaha waa la abuuray: ${parsed.data.email}`);
    if (process.env.ADMIN_PASSWORD) console.log('Xusuusin: ka tirtir ADMIN_PASSWORD faylka .env hadda.');
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
