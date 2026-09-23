/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { StatsGranularity } from '@authup/core-http-kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { EntityStatsParameters } from './types.ts';

/**
 * The two parameters of a statistic that are not filters: the bucket width
 * is a GROUP BY, and the window is appended server-side. Both become rapiq
 * parameters once tada5hi/rapiq#938 (a group/aggregate parameter) lands.
 */
export class EntityStatsParametersValidator extends Container<EntityStatsParameters> {
    protected initialize() {
        super.initialize();

        this.mount(
            'granularity',
            { optional: true },
            createValidator(z.enum(StatsGranularity)),
        );

        this.mount(
            'days',
            { optional: true },
            createValidator(z.coerce.number().int().min(1)),
        );
    }
}
