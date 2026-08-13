/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { OAuth2SubKind } from '@authup/specs';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { DataSourceOptionsBuilder } from '../../../../../src/adapters/database/data-source/options/module.ts';
import { ClientEntity, RealmEntity, SessionEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { isSessionTokenRelationMissingError } from '../../../../../src/core/index.ts';
import { SessionTokenRepositoryAdapter } from '../../../../../src/app/modules/oauth2/repositories/session-token/repository.ts';

describe('app/modules/oauth2/repositories/session-token', () => {
    let dataSource : DataSource;
    let realmId : string;

    // Isolated in-memory database. The suite-shared file carries provisioned
    // rows and is copied per worker; this spec only needs a schema whose
    // foreign keys are enforced (better-sqlite3 runs `PRAGMA foreign_keys = ON`).
    beforeAll(async () => {
        dataSource = new DataSource(new DataSourceOptionsBuilder().buildWith({
            type: 'better-sqlite3',
            database: ':memory:',
            synchronize: true,
        }));
        await dataSource.initialize();

        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'master', builtIn: true }),
        );
        realmId = realm.id;
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    async function createSession() : Promise<string> {
        const repository = dataSource.getRepository(SessionEntity);
        const entity = await repository.save(repository.create({
            sub: randomUUID(),
            subKind: OAuth2SubKind.USER,
            realmId,
            ipAddress: '203.0.113.10',
            userAgent: 'test-agent',
            expiresAt: new Date(Date.now() + 100_000).toISOString(),
        }));

        return entity.id;
    }

    async function createClient() : Promise<string> {
        const repository = dataSource.getRepository(ClientEntity);
        const entity = await repository.save(repository.create({
            name: `client-${randomUUID()}`,
            realmId,
        }));

        return entity.id;
    }

    function buildInput(sessionId: string, clientId?: string) {
        return {
            id: randomUUID(),
            sessionId,
            clientId: clientId ?? null,
            kind: 'refresh' as const,
            ipAddress: '203.0.113.10',
            userAgent: 'test-agent',
            expiresAt: new Date(Date.now() + 100_000).toISOString(),
        };
    }

    it('persists a token row for an existing session', async () => {
        const repository = new SessionTokenRepositoryAdapter(dataSource);
        const sessionId = await createSession();

        const input = buildInput(sessionId);
        const row = await repository.create(input);

        expect(row.id).toEqual(input.id);
        expect(row.sessionId).toEqual(sessionId);
        expect(row.createdAt).toBeTypeOf('string');
    });

    // The session can be deleted between the grant resolving it and the issuer
    // writing the row (a concurrent replay revoke, an explicit logout, the
    // session sweeper). The foreign key rejects the insert, and the driver
    // error must not escape as an unhandled internal error (issue #3435).
    it('raises a relation-missing domain error when the session is gone', async () => {
        const repository = new SessionTokenRepositoryAdapter(dataSource);
        const sessionId = await createSession();

        await dataSource.getRepository(SessionEntity).delete({ id: sessionId });

        let error : unknown;
        try {
            await repository.create(buildInput(sessionId));
        } catch (e) {
            error = e;
        }

        expect(isSessionTokenRelationMissingError(error)).toBe(true);
    });

    // The client the row is attributed to can vanish in the same window, and it
    // is reported the same way on purpose. Only postgres names the failing
    // constraint on the error; sqlite reports "FOREIGN KEY constraint failed"
    // and nothing else, so a per-relation verdict is not implementable here. It
    // would also not change any caller: the client cascades onto this table
    // too, so the token's rows are gone either way.
    it('raises the same error when the attributed client is gone', async () => {
        const repository = new SessionTokenRepositoryAdapter(dataSource);
        const sessionId = await createSession();
        const clientId = await createClient();

        await dataSource.getRepository(ClientEntity).delete({ id: clientId });

        let error : unknown;
        try {
            await repository.create(buildInput(sessionId, clientId));
        } catch (e) {
            error = e;
        }

        expect(isSessionTokenRelationMissingError(error)).toBe(true);
    });

    it('persists a token row attributed to a live client', async () => {
        const repository = new SessionTokenRepositoryAdapter(dataSource);
        const sessionId = await createSession();
        const clientId = await createClient();

        const row = await repository.create(buildInput(sessionId, clientId));

        expect(row.clientId).toEqual(clientId);
    });
});
