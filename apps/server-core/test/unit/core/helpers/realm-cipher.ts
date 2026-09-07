/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key } from '@authup/core-kit';
import { JWKType, JWKUse } from '@authup/specs';
import { RealmCipher } from '../../../../src/core/key/realm-cipher.ts';
import { FakeKeyStore } from './fake-key-store.ts';

/**
 * A real RealmCipher over one fake active enc key bound to `realmId`, so a
 * service spec exercises the genuine blob format and the realm binding
 * without a database.
 */
export function createFakeRealmCipher(realmId: string): RealmCipher {
    const timestamp = new Date().toISOString();
    const key: Key = {
        id: randomUUID(),
        name: 'enc-test',
        type: JWKType.OCT,
        use: JWKUse.ENCRYPTION,
        status: 'active',
        signatureAlgorithm: null,
        priority: 0,
        decryptionKey: Buffer.alloc(32, 7).toString('base64'),
        encryptionKey: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        realmId,
        realm: {
            id: realmId,
            name: 'test',
            builtIn: false,
            displayName: null,
            description: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    };

    return new RealmCipher({ keyStore: new FakeKeyStore(key) });
}
