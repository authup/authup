/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CERTIFICATE_SOURCES } from './constants.ts';

export type CertificateSource = typeof CERTIFICATE_SOURCES[number];
