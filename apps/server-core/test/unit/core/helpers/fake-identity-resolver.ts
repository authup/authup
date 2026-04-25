/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity } from '@authup/core-kit';
import { vi } from 'vitest';
import type { IIdentityResolver } from '../../../../src/core/identity/resolver/types.ts';

export class FakeIdentityResolver implements IIdentityResolver {
    private identity: Identity | null = null;

    setIdentity(identity: Identity | null) {
        this.identity = identity;
    }

    public readonly resolve = vi.fn(async () => this.identity);
}
