/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '../../src';

describe('src/error', () => {
    it('should throw error', () => {
        const error = TokenError.expired();
        expect(error.statusCode).toEqual(400);
        expect(error.message).toEqual('The token has expired.');
    });
});
