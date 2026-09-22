/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import { describe, expect, it } from 'vitest';
import {
    applyUTCTimestamps,
    createUTCSessionMysqlDriver,
    parsePostgresTimestampAsUTC,
} from '../../../../src/adapters/database/data-source/options/timezone.ts';

describe('adapters/database (utc timestamp reading)', () => {
    describe('parsePostgresTimestampAsUTC', () => {
        it('should read the zone-less text form as UTC', () => {
            expect(parsePostgresTimestampAsUTC('2026-09-22 19:05:49.850123')).toEqual(new Date('2026-09-22T19:05:49.850Z'));
            expect(parsePostgresTimestampAsUTC('2026-09-22 19:05:49')).toEqual(new Date('2026-09-22T19:05:49.000Z'));
        });

        it('should keep infinity and BC dates working', () => {
            expect(parsePostgresTimestampAsUTC('infinity')).toEqual(Infinity);
            expect(parsePostgresTimestampAsUTC('-infinity')).toEqual(-Infinity);

            const bc = parsePostgresTimestampAsUTC('0005-01-01 00:00:00 BC') as Date;
            expect(bc.getUTCFullYear()).toEqual(-4);
            expect(bc.getUTCHours()).toEqual(0);
        });
    });

    describe('applyUTCTimestamps', () => {
        it('should pin mysql sessions to UTC and read datetimes as UTC', () => {
            const options = applyUTCTimestamps({ type: 'mysql' }) as DataSourceOptions & { driver: any };

            expect(options).toMatchObject({ timezone: 'Z' });
            expect(typeof options.driver.createPool).toEqual('function');
            expect(typeof options.driver.createPoolCluster).toEqual('function');
        });

        it('should run the session SET first on every new mysql connection', () => {
            const listeners: ((connection: any) => void)[] = [];
            const pool = { on: (event: string, fn: (connection: any) => void) => { if (event === 'connection') listeners.push(fn); } };
            const base = { createPool: () => pool } as any;

            const driver = createUTCSessionMysqlDriver(base);
            expect(driver.createPool({})).toBe(pool);
            expect(listeners).toHaveLength(1);

            const queries: string[] = [];
            let destroyed = false;
            const connection = {
                query: (sql: string, cb: (err: unknown) => void) => { queries.push(sql); cb(new Error('denied')); },
                destroy: () => { destroyed = true; },
            };
            listeners[0](connection);

            expect(queries).toEqual(['SET time_zone = \'+00:00\'']);
            expect(destroyed).toBe(true);
        });

        it('should leave an explicit mysql timezone, driver or replication alone', () => {
            for (const input of [
                { type: 'mysql', timezone: '+02:00' },
                { type: 'mysql', driver: {} },
                { type: 'mysql', replication: { master: {}, slaves: [] } },
            ] as DataSourceOptions[]) {
                expect(applyUTCTimestamps(input)).toBe(input);
            }
        });

        it('should pin postgres sessions to UTC and install the timestamp parser', () => {
            const options = applyUTCTimestamps({ type: 'postgres', extra: { max: 3, options: '-c statement_timeout=5000' } }) as DataSourceOptions & { extra: Record<string, any> };

            expect(options.extra.max).toEqual(3);
            expect(options.extra.options).toEqual('-c statement_timeout=5000 -c TimeZone=UTC');
            expect(options.extra.types.getTypeParser(1114, 'text')).toBe(parsePostgresTimestampAsUTC);
            expect(options.extra.types.getTypeParser(1184, 'text')).toBe(pg.types.getTypeParser(1184, 'text'));
            expect(options.extra.types.getTypeParser(23, 'text')).toBe(pg.types.getTypeParser(23, 'text'));
        });

        it('should keep an operator-supplied postgres timezone and types', () => {
            const types = { getTypeParser: () => (value: string) => value };
            const options = applyUTCTimestamps({
                type: 'postgres',
                extra: { types, options: '-c timezone=Europe/Berlin' },
            }) as DataSourceOptions & { extra: Record<string, any> };

            expect(options.extra.types).toBe(types);
            expect(options.extra.options).toEqual('-c timezone=Europe/Berlin');
        });

        it('should leave sqlite untouched', () => {
            const input: DataSourceOptions = { type: 'better-sqlite3', database: ':memory:' };
            expect(applyUTCTimestamps(input)).toBe(input);
        });
    });
});
