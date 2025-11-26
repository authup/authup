/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { TimePolicy } from './types';
import { TimePolicyInterval } from './constants';

export class TimePolicyValidator extends Container<TimePolicy> {
    initialize() {
        super.initialize();

        this.mount('dayOfWeek', createValidator(
            z.number()
                .min(0).max(6)
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));
        this.mount('dayOfMonth', createValidator(
            z.number()
                .min(1)
                .max(31)
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));
        this.mount('dayOfYear', createValidator(
            z.number()
                .min(1)
                .max(365)
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));

        this.mount('start', createValidator(
            z.date()
                .or(z.string().datetime())
                .or(z.string().time())
                .or(z.number())
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));
        this.mount('end', createValidator(
            z.date()
                .or(z.string().datetime())
                .or(z.string().time())
                .or(z.number())
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));

        this.mount(
            'interval',
            createValidator(
                z.nativeEnum(TimePolicyInterval)
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'invert',
            createValidator(
                z.boolean()
                    .or(z.undefined())
                    .or(z.null())
                    .optional(),
            ),
        );
    }
}
