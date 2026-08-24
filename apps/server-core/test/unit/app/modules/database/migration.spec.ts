/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { DataSource } from 'typeorm';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { assertNoPendingMigrations } from '../../../../../src/app/modules/database/migration';

const createDataSource = (
    options: Record<string, any>,
    showMigrations: () => Promise<boolean>,
) : DataSource => ({
    options,
    showMigrations,
}) as unknown as DataSource;

describe('app/modules/database/migration', () => {
    it('should throw when migrations are pending', async () => {
        const showMigrations = vi.fn().mockResolvedValue(true);
        const dataSource = createDataSource({ migrations: ['migration-a'] }, showMigrations);

        await expect(assertNoPendingMigrations(dataSource)).rejects.toThrow(AuthupError);
        await expect(assertNoPendingMigrations(dataSource)).rejects.toThrow(/migration/);
    });

    it('should resolve when no migrations are pending', async () => {
        const showMigrations = vi.fn().mockResolvedValue(false);
        const dataSource = createDataSource({ migrations: ['migration-a'] }, showMigrations);

        await expect(assertNoPendingMigrations(dataSource)).resolves.toEqual(true);
        expect(showMigrations).toHaveBeenCalledTimes(1);
    });

    it('should report a migration-less data source for the synchronize path', async () => {
        // the sqlite shape: the options carry no migrations at all, so
        // nothing can be pending and the caller still has to create the
        // schema. The predicate is the options, never a dialect compare.
        const showMigrations = vi.fn().mockResolvedValue(true);

        const variants: any[] = [undefined, [], {}];
        for (const migrations of variants) {
            const dataSource = createDataSource({ migrations }, showMigrations);

            await expect(assertNoPendingMigrations(dataSource)).resolves.toEqual(false);
        }

        expect(showMigrations).not.toHaveBeenCalled();
    });
});
