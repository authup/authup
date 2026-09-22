/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventStatsGranularity } from '@authup/core-kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { EventStatsParameters } from './types.ts';

/**
 * The two parameters of the stats read that are not filters: the bucket width
 * is a GROUP BY, and the window is bound by hand because a createdAt filter
 * compares wrong on sqlite (the stored `'YYYY-MM-DD HH:MM:SS'` sorts below any
 * ISO literal on the `' '` vs `'T'` byte, so the window's first day would drop
 * out). Both become rapiq parameters once tada5hi/rapiq#938 and #939 land.
 */
export class EventStatsParametersValidator extends Container<EventStatsParameters> {
    protected initialize() {
        super.initialize();

        this.mount(
            'granularity',
            { optional: true },
            createValidator(z.enum(EventStatsGranularity)),
        );

        this.mount(
            'days',
            { optional: true },
            createValidator(z.coerce.number().int().min(1)),
        );
    }
}
