/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { KeyStatus } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { IdentityProviderAttributeEntity } from '../../../../../../src/adapters/database/index.ts';
import { DatabaseInjectionKey } from '../../../../../../src/app/modules/database/index.ts';
import { isRealmCipherBlob } from '../../../../../../src/core/index.ts';
import { createTestApplication } from '../../../../../app';
import {
    createFakeLdapIdentityProvider,
    createFakeOAuth2IdentityProvider,
    expectClientError,
} from '../../../../../utils';

const suite = createTestApplication();

describe('src/http/controllers/identity-provider (secrets at rest)', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        await suite.setup();

        dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function stored(providerId: string, name: string): Promise<string | null> {
        const row = await dataSource
            .getRepository(IdentityProviderAttributeEntity)
            .findOneByOrFail({ providerId, name });

        return row.value;
    }

    it('stores the OAuth2 client secret as a realm cipher blob and answers the plaintext', async () => {
        const input = createFakeOAuth2IdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(input);

        // the write answers what it was given, never the blob
        expect((created as OAuth2IdentityProvider).clientSecret).toEqual(input.clientSecret);

        const value = await stored(created.id, 'clientSecret');
        expect(value).not.toEqual(input.clientSecret);
        expect(isRealmCipherBlob(value!)).toBe(true);

        const { data: read } = await suite.client.identityProvider.getOne(created.id);
        expect((read as OAuth2IdentityProvider).clientSecret).toEqual(input.clientSecret);
    });

    it('re-encrypts a rotated secret and keeps an untouched one readable across a partial update', async () => {
        const input = createFakeOAuth2IdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(input);
        const before = await stored(created.id, 'clientSecret');

        await suite.client.identityProvider.update(created.id, { ...input, clientSecret: 'rotated-secret' });
        const rotated = await stored(created.id, 'clientSecret');
        expect(rotated).not.toEqual(before);
        expect(isRealmCipherBlob(rotated!)).toBe(true);

        // a partial update that says nothing about the secret leaves the blob
        // as it is (keepAll), and the read still decrypts it
        await suite.client.identityProvider.update(created.id, {
            ...input, 
            clientSecret: undefined, 
            displayName: 'renamed', 
        });
        expect(await stored(created.id, 'clientSecret')).toEqual(rotated);

        const { data: read } = await suite.client.identityProvider.getOne(created.id);
        expect((read as OAuth2IdentityProvider).clientSecret).toEqual('rotated-secret');
    });

    it('passes a legacy plaintext through and encrypts it on the next save', async () => {
        const input = createFakeOAuth2IdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(input);

        // a row written by a release before the secrets were encrypted
        await dataSource
            .getRepository(IdentityProviderAttributeEntity)
            .update({ providerId: created.id, name: 'clientSecret' }, { value: 'legacy-plain' });

        const { data: read } = await suite.client.identityProvider.getOne(created.id);
        expect((read as OAuth2IdentityProvider).clientSecret).toEqual('legacy-plain');

        await suite.client.identityProvider.update(created.id, { ...input, clientSecret: 'legacy-plain' });
        const value = await stored(created.id, 'clientSecret');
        expect(value).not.toEqual('legacy-plain');
        expect(isRealmCipherBlob(value!)).toBe(true);

        const { data: reread } = await suite.client.identityProvider.getOne(created.id);
        expect((reread as OAuth2IdentityProvider).clientSecret).toEqual('legacy-plain');
    });

    it('stores the LDAP bind password as a blob and answers the plaintext', async () => {
        const input = createFakeLdapIdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(input);

        const value = await stored(created.id, 'password');
        expect(value).not.toEqual(input.password);
        expect(isRealmCipherBlob(value!)).toBe(true);

        const { data: read } = await suite.client.identityProvider.getOne(created.id);
        expect((read as LdapIdentityProvider).password).toEqual(input.password);
    });

    it('binds the secret to the realm encryption key\'s lifecycle', async () => {
        const input = createFakeOAuth2IdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(input);

        // the blob names the key it was encrypted under: v1.<key_id>.<payload>
        const keyId = (await stored(created.id, 'clientSecret'))!.split('.')[1];

        // a provider secret is a live reference, like an MFA seed or an
        // encrypted client secret
        await expectClientError(
            () => suite.client.key.delete(keyId),
            { status: 409 },
        );

        // disabled: the provider stays readable, the secret is withheld
        await suite.client.key.update(keyId, { status: KeyStatus.DISABLED });
        const { data: withheld } = await suite.client.identityProvider.getOne(created.id);
        expect(withheld.id).toEqual(created.id);
        expect((withheld as OAuth2IdentityProvider).clientSecret).toBeUndefined();

        // re-enabled: recoverable again, the blob was never touched
        await suite.client.key.update(keyId, { status: KeyStatus.ACTIVE });
        const { data: recovered } = await suite.client.identityProvider.getOne(created.id);
        expect((recovered as OAuth2IdentityProvider).clientSecret).toEqual(input.clientSecret);

        // crypto-shredded: the provider survives, its secret does not
        await suite.client.key.delete(keyId, { force: true });
        const { data: shredded } = await suite.client.identityProvider.getOne(created.id);
        expect((shredded as OAuth2IdentityProvider).clientSecret).toBeUndefined();
    });
});
