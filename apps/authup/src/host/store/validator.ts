/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { HostsDocument } from './types.ts';

export const hostTokensSchema = z.strictObject({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    expiresAt: z.number().int().nonnegative(),
});

const hostEntrySchema = z.strictObject({
    clientId: z.string().min(1),
    realm: z.string().min(1).optional(),
    storage: z.enum(['keychain', 'file']),
    accessToken: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    expiresAt: z.number().int().nonnegative().optional(),
});

export class HostsDocumentValidator extends Container<HostsDocument> {
    protected override initialize() {
        super.initialize();

        this.mount('current', { optional: true }, createValidator(z.url()));
        this.mount('hosts', createValidator(z.record(z.url(), hostEntrySchema)));
    }
}
