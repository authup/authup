/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createKey, decryptWithKey, encryptWithKey } from '../../../src';

describe('src/domains/key', () => {
    it('should encrypt and decrypt key', async () => {
        const entity = await createKey('foo');
        const data = 'foo';

        const encrypted = encryptWithKey(entity, data);
        expect(encrypted).toBeDefined();

        const decrypted = decryptWithKey(entity, encrypted);
        expect(decrypted).toBeDefined();

        expect(decrypted).toEqual(data);
    });
});
