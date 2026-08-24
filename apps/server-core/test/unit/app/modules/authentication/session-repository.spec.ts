/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { MemoryCache } from '@authup/server-kit';
import type { Session } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { DataSourceOptionsBuilder } from '../../../../../src/adapters/database/data-source/options/module.ts';
import { RealmEntity, SessionEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { SESSION_EXPIRY_SWEEP_BATCH_SIZE } from '../../../../../src/core/index.ts';
import { SessionRepository } from '../../../../../src/app/modules/authentication/repositories/session.ts';

describe('app/modules/authentication/repositories/session', () => {
    let dataSource : DataSource;
    let realmId : string;

    // Isolated in-memory database, like the session-token adapter spec: the
    // suite-shared file carries provisioned rows this sweep would delete.
    beforeAll(async () => {
        dataSource = new DataSource(new DataSourceOptionsBuilder().buildWith({
            type: 'better-sqlite3',
            database: ':memory:',
            synchronize: true,
        }));
        await dataSource.initialize();

        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({
                name: 'master',
                builtIn: true,
            }),
        );
        realmId = realm.id;
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    beforeEach(async () => {
        await dataSource.getRepository(SessionEntity).clear();
    });

    const createRepository = () => new SessionRepository({
        repository: dataSource.getRepository<Session>(SessionEntity),
        cache: new MemoryCache(),
    });

    const seed = async (expiresAt: string) => {
        const repository = dataSource.getRepository(SessionEntity);

        await repository.save(repository.create({
            sub: randomUUID(),
            subKind: OAuth2SubKind.USER,
            realmId,
            ipAddress: '203.0.113.10',
            userAgent: 'test-agent',
            expiresAt,
        }));
    };

    const count = async () => dataSource.getRepository(SessionEntity).count();

    describe('deleteExpired', () => {
        it('drains every expired row across several batches', async () => {
            // The sweep runs every minute on every replica. A single bounded
            // statement without the drain loop would leave a permanent
            // backlog behind on a table that only grows.
            const past = new Date(Date.now() - 60_000).toISOString();
            for (let i = 0; i < 5; i++) {
                await seed(past);
            }

            const deleted = await createRepository().deleteExpired(
                new Date().toISOString(),
                { batchSize: 2 },
            );

            expect(deleted).toEqual(5);
            expect(await count()).toEqual(0);
        });

        it('bounds each statement to the batch size', async () => {
            const past = new Date(Date.now() - 60_000).toISOString();
            for (let i = 0; i < 5; i++) {
                await seed(past);
            }

            const ormRepository = dataSource.getRepository<Session>(SessionEntity);
            const findSpy = vi.spyOn(ormRepository, 'find');
            const deleteSpy = vi.spyOn(ormRepository, 'delete');

            const repository = new SessionRepository({
                repository: ormRepository,
                cache: new MemoryCache(),
            });
            await repository.deleteExpired(new Date().toISOString(), { batchSize: 2 });

            // 5 rows at 2 per batch: three bounded DELETEs rather than one
            // sweeping statement, each fed by a select bounded to the size.
            expect(deleteSpy).toHaveBeenCalledTimes(3);
            expect(findSpy).toHaveBeenCalledTimes(3);
            for (const [options] of findSpy.mock.calls) {
                expect(options?.take).toEqual(2);
            }

            findSpy.mockRestore();
            deleteSpy.mockRestore();
        });

        it('falls back to the default batch size for an unusable batchSize', async () => {
            // A batchSize of 0 is the one that matters: typeorm ignores a
            // falsy take, restoring the single unbounded DELETE the batching
            // exists to prevent.
            await seed(new Date(Date.now() - 60_000).toISOString());

            const ormRepository = dataSource.getRepository<Session>(SessionEntity);
            const findSpy = vi.spyOn(ormRepository, 'find');

            const repository = new SessionRepository({
                repository: ormRepository,
                cache: new MemoryCache(),
            });
            await repository.deleteExpired(new Date().toISOString(), { batchSize: 0 });

            expect(findSpy).toHaveBeenCalled();
            for (const [options] of findSpy.mock.calls) {
                expect(options?.take).toEqual(SESSION_EXPIRY_SWEEP_BATCH_SIZE);
            }

            findSpy.mockRestore();
        });

        it('keeps rows that have not expired', async () => {
            await seed(new Date(Date.now() + 600_000).toISOString());
            await seed(new Date(Date.now() - 60_000).toISOString());

            const deleted = await createRepository().deleteExpired(new Date().toISOString());

            expect(deleted).toEqual(1);
            expect(await count()).toEqual(1);
        });

        it('stops when a batch removes nothing', async () => {
            // Another replica's sweep already owns those rows. Re-selecting
            // them would spin: the select still matches, the delete still
            // reports zero.
            const past = new Date(Date.now() - 60_000).toISOString();
            for (let i = 0; i < 4; i++) {
                await seed(past);
            }

            const ormRepository = dataSource.getRepository<Session>(SessionEntity);
            const findSpy = vi.spyOn(ormRepository, 'find');
            vi.spyOn(ormRepository, 'delete').mockResolvedValue({
                raw: [],
                affected: 0,
            });

            const repository = new SessionRepository({
                repository: ormRepository,
                cache: new MemoryCache(),
            });
            const deleted = await repository.deleteExpired(
                new Date().toISOString(),
                { batchSize: 2 },
            );

            expect(findSpy).toHaveBeenCalledTimes(1);
            expect(deleted).toEqual(0);

            vi.restoreAllMocks();
        });
    });
});
