/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Where this console sits under the deployment's own origin when the document
 * names no url. Declared beside the key that derives from it, so the
 * derivation and the segment cannot drift; the serving service imports it
 * rather than repeating the literal.
 */
export const ACCOUNT_CONSOLE_BASE_PATH = '/console/account';
