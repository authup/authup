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
    buildConfig, createRouter, setConfig, setupLogger,
} from '../../src';

export function useSuperTest() : SuperTest<Test> {
    const config = buildConfig({ env: true });
    config.middlewareRateLimit = false;
    config.middlewarePrometheus = false;
    config.middlewareSwagger = false;

    config.userAuthBasic = true;

    setConfig(config);

    setupLogger({
        env: 'test',
    });

    const router = createRouter();

    return supertest(createNodeDispatcher(router));
}
