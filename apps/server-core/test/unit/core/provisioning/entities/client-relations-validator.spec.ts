/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { ValidatorGroup } from '@authup/kit';
import { describe, expect, it } from 'vitest';
import { ClientProvisioningRelationsValidator } from '../../../../../src/core/provisioning/entities/client/relations-validator.ts';
import type { ClientProvisioningRelations } from '../../../../../src/core/provisioning/entities/client/index.ts';
import { mergeProvisioningEntities } from '../../../../../src/core/provisioning/merge/index.ts';

function validate(tokenExchangeCapabilities: unknown[]) {
    return new ClientProvisioningRelationsValidator().run(
        { tokenExchangeCapabilities } as ClientProvisioningRelations,
        { group: ValidatorGroup.PROVISIONING },
    );
}

describe('core/provisioning/entities/client tokenExchangeCapabilities', () => {
    it('should keep what a file declares and normalize the value', async () => {
        const output = await validate([{
            strategy: { type: 'merge' },
            attributes: {
                audience: 'storage',
                value: 'bucket:read   bucket-file',
                maxAge: 600,
                realmScope: 'any',
            },
        }]);

        expect(output.tokenExchangeCapabilities).toEqual([{
            strategy: { type: 'merge' },
            attributes: {
                audience: 'storage',
                value: 'bucket:read bucket-file',
                maxAge: 600,
                realmScope: 'any',
            },
        }]);
    });

    it('should not let a file name the client or the realm of a capability', async () => {
        const output = await validate([{
            attributes: {
                audience: 'storage',
                value: 'bucket',
                maxAge: 600,
                clientId: randomUUID(),
                realmId: randomUUID(),
            },
        }]);

        const [capability] = output.tokenExchangeCapabilities!;

        expect(capability!.attributes.clientId).toBeUndefined();
        expect(capability!.attributes.realmId).toBeUndefined();
    });

    it.each([
        ['a missing audience', { value: 'bucket', maxAge: 600 }],
        ['an audience with whitespace', {
            audience: 'a b',
            value: 'bucket',
            maxAge: 600,
        }],
        ['a malformed value', {
            audience: 'storage',
            value: 'Bucket',
            maxAge: 600,
        }],
        ['a type both bare and with an action', {
            audience: 'storage',
            value: 'bucket bucket:read',
            maxAge: 600,
        }],
        ['a zero max age', {
            audience: 'storage',
            value: 'bucket',
            maxAge: 0,
        }],
        ['an unknown realm scope', {
            audience: 'storage',
            value: 'bucket',
            maxAge: 600,
            realmScope: 'some',
        }],
    ])('should refuse %s', async (_label, attributes) => {
        await expect(validate([{ attributes }])).rejects.toThrow();
    });

    it('should accept an entry identified by its audience alone', async () => {
        const output = await validate([{
            strategy: { type: 'absent' },
            attributes: { audience: 'storage' },
        }]);

        expect(output.tokenExchangeCapabilities![0]!.attributes).toEqual({ audience: 'storage' });
    });

    it('should fold two sources declaring one audience and keep different audiences apart', () => {
        const merged = mergeProvisioningEntities(
            [
                { attributes: { audience: 'storage', value: 'bucket' } },
                { attributes: { audience: 'registry', value: 'image' } },
            ] as never[],
            [
                { attributes: { audience: 'storage', value: 'bucket-file' } },
            ] as never[],
        ) as { attributes: Record<string, string> }[];

        expect(merged.map((entry) => entry.attributes)).toEqual([
            { audience: 'storage', value: 'bucket-file' },
            { audience: 'registry', value: 'image' },
        ]);
    });
});
