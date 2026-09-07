/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isBCryptHash } from '@authup/kit';
import { hash } from '@authup/server-kit';
import { ClientAuthMethod } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { ClientCredentialsService } from '../../../../../src/core/authentication/credential/entities/client/module.ts';

function buildClient(data: Partial<Client>): Client {
    return {
        authMethod: ClientAuthMethod.SECRET,
        secretHashed: false,
        secretEncrypted: false,
        ...data,
    } as Client;
}

describe('core/authentication/credential/client', () => {
    const service = new ClientCredentialsService();

    describe('protect', () => {
        it('should hash in hashed mode', async () => {
            const stored = await service.protect('start1234', { secretHashed: true, secretEncrypted: false });

            expect(stored).not.toEqual('start1234');
            expect(isBCryptHash(stored)).toBe(true);
        });

        it('should hash a plaintext that merely looks like a bcrypt hash (no input sniffing)', async () => {
            const lookalike = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456';

            const stored = await service.protect(lookalike, { secretHashed: true, secretEncrypted: false });

            expect(stored).not.toEqual(lookalike);
            expect(isBCryptHash(stored)).toBe(true);
        });

        it('should store a plain secret verbatim', async () => {
            const stored = await service.protect('start1234', { secretHashed: false, secretEncrypted: false });

            expect(stored).toEqual('start1234');
        });
    });

    describe('verify', () => {
        it('should compare against a bcrypt hash in hashed mode', async () => {
            const client = buildClient({ secretHashed: true, secret: await hash('start1234') });

            expect(await service.verify('start1234', client)).toBe(true);
            expect(await service.verify('start12345', client)).toBe(false);
        });

        it('should compare a plain secret, unequal lengths included', async () => {
            const client = buildClient({ secret: 'start1234' });

            expect(await service.verify('start1234', client)).toBe(true);
            expect(await service.verify('start123', client)).toBe(false);
            expect(await service.verify('start12345', client)).toBe(false);
        });

        it('should refuse when the client holds no secret or does not authenticate by secret', async () => {
            expect(await service.verify('x', buildClient({ secret: null }))).toBe(false);
            expect(await service.verify('x', buildClient({ authMethod: ClientAuthMethod.NONE, secret: 'x' }))).toBe(false);
        });
    });
});
