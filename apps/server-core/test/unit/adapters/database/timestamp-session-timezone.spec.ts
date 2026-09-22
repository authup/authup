/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { readDataSourceOptionsFromEnv } from 'typeorm-extension';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { DataSourceOptionsBuilder } from '../../../../src/adapters/database/data-source/options/module.ts';
import { RoleEntity } from '../../../../src/adapters/database/domains/index.ts';

const env = readDataSourceOptionsFromEnv();
const type = env?.type;

/**
 * A database whose own default timezone is not UTC (#3641). The columns
 * are stamped by the database in its SESSION timezone and read back by the
 * driver, so both halves must be pinned to UTC or `createdAt` answers a
 * shifted instant (and `auth_time`, read from a session's `createdAt`,
 * lands in the future). UTC+14 makes any shift impossible to miss.
 *
 * The default is changed for NEW sessions only, which is why every check
 * opens a pool of its own. The control pool, built without the fix, proves
 * the database really runs in the foreign zone, so the main assertion
 * cannot pass vacuously.
 */
describe.skipIf(type !== 'mysql' && type !== 'postgres')('adapters/database (utc session timezone)', () => {
    let admin: DataSource;
    let previous: string | undefined;

    async function stampRole(options: DataSourceOptions) : Promise<number> {
        const dataSource = new DataSource(options);
        await dataSource.initialize();
        try {
            const repository = dataSource.getRepository(RoleEntity);
            const saved = await repository.save(repository.create({ name: `tz-${randomUUID()}` }));
            const read = await repository.findOneByOrFail({ id: saved.id });
            await repository.delete({ id: saved.id });

            return Date.parse(read.createdAt as unknown as string);
        } finally {
            await dataSource.destroy();
        }
    }

    beforeAll(async () => {
        admin = new DataSource(new DataSourceOptionsBuilder().buildWith(env as DataSourceOptions));
        await admin.initialize();

        if (type === 'postgres') {
            await admin.query(`ALTER DATABASE "${env!.database}" SET timezone TO 'Pacific/Kiritimati'`);
        } else {
            const [row] = await admin.query('SELECT @@GLOBAL.time_zone AS zone');
            previous = row.zone;
            await admin.query('SET GLOBAL time_zone = \'+14:00\'');
        }
    });

    afterAll(async () => {
        if (!admin) {
            return;
        }

        if (type === 'postgres') {
            await admin.query(`ALTER DATABASE "${env!.database}" RESET timezone`);
        } else {
            await admin.query(`SET GLOBAL time_zone = '${previous ?? 'SYSTEM'}'`);
        }

        await admin.destroy();
    });

    it('should shift without the fix (environment check)', async () => {
        const raw = new DataSourceOptionsBuilder().buildWith(env as DataSourceOptions) as Record<string, any>;
        delete raw.timezone;
        delete raw.driver;
        if (raw.extra) {
            delete raw.extra.options;
            delete raw.extra.types;
        }

        const before = Date.now();
        const stamped = await stampRole(raw as DataSourceOptions);

        // the process may itself run in UTC (CI), so only require that the
        // unpinned read is off by hours, in whichever direction
        expect(Math.abs(stamped - before)).toBeGreaterThan(3_600_000);
    });

    it('should stamp and read the true instant', async () => {
        const before = Date.now();
        const stamped = await stampRole(new DataSourceOptionsBuilder().buildWith(env as DataSourceOptions));

        expect(Math.abs(stamped - before)).toBeLessThan(60_000);
    });
});
