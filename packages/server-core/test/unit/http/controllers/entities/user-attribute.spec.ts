/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/user-attribute', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should create, read, update, delete resource', async () => {
        const response = await suite.client.userAttribute.create({
            name: 'foo',
            value: 'bar',
        });

        expect(response.name).toEqual('foo');
        expect(response.value).toEqual('bar');
    });
});
