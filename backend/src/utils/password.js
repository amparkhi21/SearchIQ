import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.auth.bcryptSaltRounds);

export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

let dummyHashPromise;

/**
 * Performs a bcrypt comparison against a throw-away hash. Used when the email does not
 * exist so that login takes about the same time either way (prevents user enumeration by timing).
 */
export async function burnPasswordCheck(plain) {
  dummyHashPromise ??= bcrypt.hash('dummy-password-for-timing', env.auth.bcryptSaltRounds);
  await bcrypt.compare(plain, await dummyHashPromise);
}
