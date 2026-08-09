/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Client, pickEntityAPI } from '../../src';
import { FakeClient } from '../../src/testing';

describe('client/registry', () => {
    const client = new Client({ baseURL: 'http://localhost:3010' });

    it('should resolve the sub-api serving an entity type', () => {
        expect(pickEntityAPI(client, 'role')).toBe(client.role);
        expect(pickEntityAPI(client, 'session')).toBe(client.session);
        expect(pickEntityAPI(client, 'clientPermission')).toBe(client.clientPermission);
        expect(pickEntityAPI(client, 'event')).toBe(client.event);
        expect(pickEntityAPI(client, 'identityProviderAccount')).toBe(client.identityProviderAccount);
    });

    it('should not resolve entity types without a sub-api', () => {
        expect(pickEntityAPI(client, 'policyAttribute')).toBeUndefined();
        expect(pickEntityAPI(client, 'identityProviderAttribute')).toBeUndefined();
    });

    it('should resolve sub-apis on a fake client', () => {
        const fake = new FakeClient();

        expect(pickEntityAPI(fake, 'user')).toBe(fake.user);
        expect(pickEntityAPI(fake, 'policyAttribute')).toBeUndefined();
    });
});
