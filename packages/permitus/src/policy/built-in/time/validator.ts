/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container, type ContainerOptions } from 'validup';
import { z } from 'zod';
import type { TimePolicy } from './types';
import { TimePolicyInterval } from './constants';

export class TimePolicyValidator extends Container<TimePolicy> {
    constructor(options: ContainerOptions<TimePolicy> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('dayOfWeek', createValidator(z.number().min(0).max(6).optional()));
        this.mount('dayOfMonth', createValidator(z.number().min(1).max(31).optional()));
        this.mount('dayOfYear', createValidator(z.number().min(1).max(366).optional()));

        this.mount('start', createValidator(z.date().or(z.string()).or(z.number()).optional()));
        this.mount('end', createValidator(z.date().or(z.string()).or(z.number()).optional()));

        this.mount('interval', createValidator(z.nativeEnum(TimePolicyInterval).optional()));

        this.mount('invert', createValidator(z.boolean().optional()));
    }
}
