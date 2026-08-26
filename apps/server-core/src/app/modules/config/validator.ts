/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mountSchema } from '@authup/server-config-kit';
import { Container } from 'validup';
import { CONFIG_SCHEMA } from './registry.ts';
import type { Config } from './types.ts';

export class ConfigValidator extends Container<Config> {
    protected override initialize() {
        super.initialize();

        // The mapped ConfigSchema type is the exhaustiveness guard: a Config
        // key without a registry entry fails the build.
        mountSchema(this, CONFIG_SCHEMA);
    }
}
