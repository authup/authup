/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import {
    KeyPairContext, decodeToken, deleteKeyPair, signToken,
} from '../../src';

describe('src/json-web-token', () => {
    const directory = path.join(__dirname, '..', '..', 'writable');

    it('should sign and decrypt json webtoken', async () => {
        const data = { text: 'secretText' };

        const signedText = await signToken(data, {
            keyPair: {
                directory,
            },
        });
        const decoded : Record<string, any> = await decodeToken(signedText);

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);

        await deleteKeyPair({
            directory,
        });
    });

    it('should sign and decrypt json webtoken with passphrase', async () => {
        const data = { text: 'secretText' };
        const keyPairOptions : KeyPairContext = {
            passphrase: 'start123',
            alias: 'encrypted',
            directory,
        };

        const signedText = await signToken(data, {
            keyPair: keyPairOptions,
        });

        const decoded : Record<string, any> = await decodeToken(signedText);

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);
        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');

        await deleteKeyPair(keyPairOptions);
    });
});
