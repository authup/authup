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
import { createFakeUserAttribute } from '../../../../utils';

describe('src/http/controllers/user-attribute', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should create, read, update, delete resource', async () => {
        const attribute = createFakeUserAttribute();
        const response = await suite.client.userAttribute.create(attribute);

        expect(response.name).toEqual(attribute.name);
        expect(response.value).toEqual(attribute.value);
    });
});
