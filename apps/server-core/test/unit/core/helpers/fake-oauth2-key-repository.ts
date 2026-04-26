/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { IOAuth2KeyRepository } from '../../../../src/core/oauth2/key/types.ts';

export class FakeOAuth2KeyRepository implements IOAuth2KeyRepository {
    public findByRealmIdCalls: string[] = [];

    public findByIdCalls: string[] = [];

    constructor(private key: Key | null = null) {}

    setKey(key: Key | null) {
        this.key = key;
    }

    async findByRealmId(realmId: string): Promise<Key | null> {
        this.findByRealmIdCalls.push(realmId);
        return this.key;
    }

    async findById(id: string): Promise<Key | null> {
        this.findByIdCalls.push(id);
        return this.key;
    }
}
