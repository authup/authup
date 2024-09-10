/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    applyConfig, buildConfig, readConfigRawFromEnv, setConfig,
} from '../../src';

export function setupTestConfig() {
    const raw = readConfigRawFromEnv();
    const config = buildConfig(raw);
    config.env = 'test';
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAdminEnabled = true;
    config.userAuthBasic = true;

    config.robotAdminEnabled = true;

    config.redis = false;
    config.vault = false;

    setConfig(config);
    applyConfig(config);
}
