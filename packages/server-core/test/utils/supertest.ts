/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNodeDispatcher } from 'routup';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { SuperTest, Test } from 'supertest';
import supertest from 'supertest';
import {
    applyConfig, buildConfig, createRouter, readConfigRawFromEnv, setConfig,
} from '../../src';

export function useSuperTest() : SuperTest<Test> {
    const raw = readConfigRawFromEnv();
    const config = buildConfig(raw);
    config.env = 'test';
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAdminEnabled = true;
    config.userAuthBasic = true;

    config.robotAdminEnabled = true;

    setConfig(config);
    applyConfig(config);

    const router = createRouter();

    return supertest(createNodeDispatcher(router));
}
