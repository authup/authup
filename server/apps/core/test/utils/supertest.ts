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
import { createRouter, useConfig } from '../../src';

export function useSuperTest() : SuperTest<Test> {
    const config = useConfig();
    config.set('middlewareRateLimit', false);
    config.set('middlewarePrometheus', false);
    config.set('middlewareSwagger', false);

    const router = createRouter();

    return supertest(createNodeDispatcher(router));
}
