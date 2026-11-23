/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { IProvisioningSynchronizer, ProvisioningSynchronizeContext } from '../../../../../src/core/provisioning/index.ts';
import { RealmProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/realm/module.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';

type Named = { attributes: { name?: string } };

/**
 * A synchronizer that queues one binding per entry on the context it is
 * handed, as the client, role and user synchronizers do.
 */
function createDeferring<T extends Named>(order: string[], failing?: string): IProvisioningSynchronizer<T> {
    const synchronize = async (input: T, context?: ProvisioningSynchronizeContext) => {
        context?.defer(async () => {
            if (input.attributes.name === failing) {
                throw new Error(`binding ${failing} failed`);
            }

            order.push(input.attributes.name as string);
        });

        return input;
    };

    return {
        synchronize,
        synchronizeMany: async (inputs, context) => {
            for (const input of inputs) {
                await synchronize(input, context);
            }

            return inputs;
        },
    };
}

function createPassthrough<T>(): IProvisioningSynchronizer<T> {
    return {
        synchronize: async (input) => input,
        synchronizeMany: async (inputs) => inputs,
    };
}

describe('core/provisioning/synchronizer/realm', () => {
    it('should run every binding after the entities and fail with the first error', async () => {
        const bound: string[] = [];

        const synchronizer = new RealmProvisioningSynchronizer({
            repository: new FakeRealmRepository(),
            clientSynchronizer: createDeferring(bound, 'first-client'),
            roleSynchronizer: createDeferring(bound),
            userSynchronizer: createDeferring(bound, 'second-user'),
            permissionSynchronizer: createPassthrough(),
            scopeSynchronizer: createPassthrough(),
            pathSynchronizer: createPassthrough(),
        });

        await expect(synchronizer.synchronize({
            attributes: { name: 'acme' },
            relations: {
                roles: [{ attributes: { name: 'ops' } }],
                clients: [
                    { attributes: { name: 'first-client' } },
                    { attributes: { name: 'second-client' } },
                ],
                users: [
                    { attributes: { name: 'first-user' } },
                    { attributes: { name: 'second-user' } },
                    { attributes: { name: 'third-user' } },
                ],
            },
        })).rejects.toThrow('binding first-client failed');

        expect(bound).toEqual([
            'ops',
            'second-client',
            'first-user',
            'third-user',
        ]);
    });
});
