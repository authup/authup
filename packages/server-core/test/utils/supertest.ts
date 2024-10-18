/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNodeDispatcher } from 'routup';
import supertest from 'supertest';
import {
    createRouter,
} from '../../src';
import { setupTestConfig } from './config';

export type TestAgent = ReturnType<typeof supertest>;

export function useSuperTest() : TestAgent {
    setupTestConfig();

    const router = createRouter();

    return supertest(createNodeDispatcher(router));
}
