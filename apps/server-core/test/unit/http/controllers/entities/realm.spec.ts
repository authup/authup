/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createFakeRealm, expectClientError, expectPropertiesEqualToSrc } from '../../../../utils/index.ts';
import { createTestApplication } from '../../../../app/index.ts';

describe('src/http/controllers/realm', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const details = createFakeRealm();

    it('should create resource', async () => {
        const response = await suite.client
            .realm
            .create(details);

        expectPropertiesEqualToSrc(details, response);

        details.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .realm
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .realm
            .getOne(details.id!);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .realm
            .getOne(details.name);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const response = await suite.client
            .realm
            .update(details.id!, details);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .realm
            .delete(details.id!);

        expect(response.id).toBeDefined();
    });

    it('should serve fresh data after update of an id-cached read', async () => {
        const entity = await suite.client
            .realm
            .create(createFakeRealm());

        // prime the id-keyed query cache
        await suite.client.realm.getOne(entity.id);

        await suite.client.realm.update(entity.id, { display_name: 'cache-invalidation-check' });

        const response = await suite.client
            .realm
            .getOne(entity.id);

        expect(response.display_name).toEqual('cache-invalidation-check');
    });

    it('should not serve a deleted resource from the id-keyed cache', async () => {
        const entity = await suite.client
            .realm
            .create(createFakeRealm());

        // prime the id-keyed query cache
        await suite.client.realm.getOne(entity.id);

        await suite.client.realm.delete(entity.id);

        await expectClientError(
            () => suite.client.realm.getOne(entity.id),
            { status: 404 },
        );
    });

    it('should create and update resource with put', async () => {
        const { name } = createFakeRealm();
        let response = await suite.client
            .realm
            .createOrUpdate(name, { name });

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);

        const { id } = response;

        const { name: nextName } = createFakeRealm();

        response = await suite.client
            .realm
            .createOrUpdate(name, { name: nextName });

        expect(response).toBeDefined();
        expect(response.name).toEqual(nextName);
        expect(response.id).toEqual(id);
    });
});
