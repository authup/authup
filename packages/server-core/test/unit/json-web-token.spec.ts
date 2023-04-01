/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import type { KeyPairOptions } from '../../src';
import { decodeToken, deleteKeyPair, signToken } from '../../src';

describe('src/json-web-token', () => {
    const directory = path.join(__dirname, '..', '..', 'writable');

    it('should sign and decrypt json webtoken', async () => {
        const data = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });
        const decoded = decodeToken(signedText) as Record<string, any>;

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);

        await deleteKeyPair({
            directory,
        });
    });

    it('should sign and decrypt json webtoken with passphrase', async () => {
        const data = { text: 'secretText' };
        const keyPairOptions : Partial<KeyPairOptions> = {
            passphrase: 'start123',
            privateName: 'private-passphrase',
            publicName: 'public-passphrase',
            directory,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: keyPairOptions,
        });

        const decoded = decodeToken(signedText);

        expect(decoded).toBeDefined();

        if (
            typeof decoded === 'object' &&
            decoded !== null
        ) {
            expect(decoded.text).toEqual(data.text);
        }

        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');

        await deleteKeyPair(keyPairOptions);
    });
});
