/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createTestSuite } from '../../../utils';

describe('src/http/controllers/user-attribute', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
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
