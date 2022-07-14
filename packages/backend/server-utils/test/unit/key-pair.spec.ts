/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import {
    createKeyPair, deleteKeyPair, loadKeyPair, saveKeyPair,
} from '../../src';

describe('sc/key-pair', () => {
    const directory = path.join(__dirname, '..', '..', 'writable');

    it('should create key-pair', async () => {
        let keyPair = await createKeyPair({
            save: false,
        });

        expect(keyPair).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
        expect(keyPair.publicKey).toBeDefined();

        keyPair = await loadKeyPair();
        expect(keyPair).toBeUndefined();
    });

    it('should save, load & delete key-pair', async () => {
        await createKeyPair({
            directory,
        });

        let keyPair = await loadKeyPair({
            directory,
        });

        expect(keyPair).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
        expect(keyPair.publicKey).toBeDefined();

        await deleteKeyPair({
            directory,
        });

        keyPair = await loadKeyPair({
            directory,
        });

        expect(keyPair).toBeUndefined();
    });
});
