/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config as APiConfig } from '@authup/server';
import type { UIConfig } from '../packages';

export type Config = {
    api: APiConfig,
    ui: UIConfig
};
