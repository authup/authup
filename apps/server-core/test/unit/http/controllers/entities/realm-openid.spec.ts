/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Realm } from '@authup/core-kit';
import {
    describe,
    expect,
    it,
} from 'vitest';
import type { Repository } from 'typeorm';
import type { IRealmService } from '../../../../../src/core/index.ts';
import { RealmController } from '../../../../../src/adapters/http/controllers/entities/realm/module.ts';
import type { KeyEntity } from '../../../../../src/adapters/database/domains/index.ts';

function createController(realm: Realm, baseURL = 'https://auth.example.com') {
    const service: Pick<IRealmService, 'getOne'> = { getOne: async () => realm };
    return new RealmController({
        options: { baseURL },
        service: service as IRealmService,
        keyRepository: {} as Repository<KeyEntity>,
    });
}

describe('RealmController.getOpenIdConfiguration', () => {
    const realmId = randomUUID();
    const realm = {
        id: realmId,
        name: 'master',
    } as Realm;

    it('should construct issuer from realm name (matching the JWT iss claim format)', async () => {
        const controller = createController(realm);
        const config = await controller.getOpenIdConfiguration(realmId);

        expect(config.issuer).toEqual('https://auth.example.com/realms/master');
    });

    it('should construct jwks_uri from realm name', async () => {
        const controller = createController(realm);
        const config = await controller.getOpenIdConfiguration(realmId);

        expect(config.jwks_uri).toEqual('https://auth.example.com/realms/master/jwks');
    });

    it('should strip a trailing slash from baseURL when building issuer', async () => {
        const controller = createController(realm, 'https://auth.example.com/');
        const config = await controller.getOpenIdConfiguration(realmId);

        expect(config.issuer).toEqual('https://auth.example.com/realms/master');
    });

    it('should resolve realm via service so name and id forms produce the same issuer', async () => {
        const controller = createController(realm);

        const byId = await controller.getOpenIdConfiguration(realmId);
        const byName = await controller.getOpenIdConfiguration('master');

        expect(byId.issuer).toEqual(byName.issuer);
        expect(byId.jwks_uri).toEqual(byName.jwks_uri);
    });
});
