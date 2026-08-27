/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';

/**
 * The shape every console url key carries: a url, or the empty string that
 * means "derive it from publicUrl". Shared so the three sections cannot
 * disagree on what an unset console url looks like.
 */
export const urlOrEmpty = z.union([z.literal(''), z.url()]);
