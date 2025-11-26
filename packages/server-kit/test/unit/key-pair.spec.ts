/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { CryptoAsymmetricAlgorithm, createAsymmetricKeyPair } from '../../src';

describe('sc/key-pair', () => {
    it('should create key-pair', async () => {
        const keyPair = await createAsymmetricKeyPair({
            name: CryptoAsymmetricAlgorithm.RSA_OAEP,
        });

        expect(keyPair).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
        expect(keyPair.publicKey).toBeDefined();
    });
});
