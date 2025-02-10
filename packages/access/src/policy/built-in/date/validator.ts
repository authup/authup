/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container, type ContainerOptions } from 'validup';
import { z } from 'zod';
import type { DatePolicy } from './types';

export class DatePolicyValidator extends Container<DatePolicy> {
    constructor(options: ContainerOptions<DatePolicy> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('start', createValidator(
            z.date()
                .or(z.string().date())
                .or(z.number())
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));
        this.mount('end', createValidator(
            z.date()
                .or(z.string().date())
                .or(z.number())
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));

        this.mount('invert', createValidator(
            z.boolean()
                .or(z.undefined())
                .or(z.null())
                .optional(),
        ));
    }
}
