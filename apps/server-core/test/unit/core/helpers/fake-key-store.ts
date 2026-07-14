/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
import type { JWKUse } from '@authup/specs';
import type { IKeyStore } from '../../../../src/core/key/types.ts';

export class FakeKeyStore implements IKeyStore {
    public resolveOrCreateCalls: { realmId: string, use: `${JWKUse}` }[] = [];

    public resolveByIdCalls: string[] = [];

    constructor(private key: Key | null = null) {}

    setKey(key: Key | null) {
        this.key = key;
    }

    async resolveOrCreate(realmId: string, use: `${JWKUse}`): Promise<Key> {
        this.resolveOrCreateCalls.push({ realmId, use });
        if (!this.key) {
            throw new AuthupError(`No active ${use} key is available for realm ${realmId}.`);
        }

        return this.key;
    }

    async resolveById(id: string): Promise<Key | null> {
        this.resolveByIdCalls.push(id);
        return this.key;
    }
}
