/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import { vi } from 'vitest';
import type { IOAuth2KeyRepository } from '../../../../src/core/oauth2/key/types.ts';

export class FakeOAuth2KeyRepository implements IOAuth2KeyRepository {
    constructor(private key: Key | null = null) {}

    setKey(key: Key | null) {
        this.key = key;
    }

    public readonly findByRealmId = vi.fn(async () => this.key);

    public readonly findById = vi.fn(async () => this.key);
}
