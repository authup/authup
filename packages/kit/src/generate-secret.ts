/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from './nanoid';

const SECRET_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.';
const SECRET_LENGTH = 32;

/**
 * Generate a cryptographically strong client/robot secret.
 *
 * Unlike {@link generateName}, this never accepts a seed: a secret must stay
 * unpredictable, so it must not be derived from a hydration-stable value. Call
 * it client-side (e.g. in `onMounted`) to avoid an SSR hydration mismatch.
 */
export function generateSecret(): string {
    return createNanoID(SECRET_ALPHABET, SECRET_LENGTH);
}
