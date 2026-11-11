/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeScopedUuid } from '@rapiq/cache';
import type { ScopedTagValueNormalizer } from '@rapiq/cache';

/**
 * The one spelling of a scoped tag value, handed to the reader and the
 * invalidation subscriber alike, or their tags no longer meet (#3688).
 */
export const QUERY_CACHE_SCOPED_VALUE_NORMALIZER : ScopedTagValueNormalizer = normalizeScopedUuid;
