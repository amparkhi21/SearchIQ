import { env } from '../config/env.js';
import logger, { closeLogger } from '../config/logger.js';
import { connectMongo, disconnectMongo } from '../config/db.js';
import { ROLES } from '../constants.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from '../utils/validators/auth.validator.js';

async function createAdmin() {
  const { name, email, password } = env.admin;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before running this script');
  }

  const adminName = nameSchema.parse(name);
  const adminEmail = emailSchema.parse(email);
  const adminPassword = passwordSchema.parse(password);

  await connectMongo();

  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    existing.role = ROLES.ADMIN;
    existing.isActive = true;
    await existing.save();
    logger.info(`Existing user ${adminEmail} is now an admin (password was not changed)`);
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash: await hashPassword(adminPassword),
    role: ROLES.ADMIN,
  });
  logger.info(`Admin user created: ${adminEmail}`);
}

let exitCode = 0;

try {
  await createAdmin();
} catch (err) {
  exitCode = 1;
  const details = err.issues ? err.issues.map((issue) => issue.message).join('; ') : err.message;
  logger.error(`Admin seed failed: ${details}`);
} finally {
  await disconnectMongo();
  await closeLogger();
  process.exit(exitCode);
}
