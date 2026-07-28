/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CoreOptions } from '@vuecs/core';

export type VuecsInstallOptionsInput = Pick<CoreOptions, 'themes'>;

export type VuecsInstallOptions = Pick<CoreOptions, 'themes' | 'icons' | 'defaults'>;
