/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from '../type';
import { configureRedis } from '../../utils';

export function applyConfig(config: Config) {
    configureRedis(config.redis);
}
