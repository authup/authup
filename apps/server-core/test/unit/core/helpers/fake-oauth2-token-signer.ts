/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { vi } from 'vitest';
import type { IOAuth2TokenSigner } from '../../../../src/core/oauth2/token/signer/types.ts';

export class FakeOAuth2TokenSigner implements IOAuth2TokenSigner {
    constructor(private signature = 'signed-token') {}

    public readonly sign = vi.fn(async () => this.signature);
}
