/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { CONFIG_SCHEMA } from './schema.ts';
import type { Config } from './types.ts';

export class ConfigValidator extends Container<Config> {
    protected override initialize() {
        super.initialize();

        // The mapped ConfigSchema type is the exhaustiveness guard: a Config
        // key without a registry entry fails the build.
        const keys = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];
        for (const key of keys) {
            this.mount(key, { optional: true }, createValidator(CONFIG_SCHEMA[key].type));
        }
    }
}
