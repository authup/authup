/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import { OptionsError } from 'typeorm-extension';
import { describe, expect, it } from 'vitest';
import { applyUTCTimestamps } from '../../../../src/adapters/database/data-source/options/timezone.ts';

/**
 * The mechanics of the pin are typeorm-extension's (`pinTimezone`) and are
 * tested there. These pin what authup decides on top: which options reach
 * it, and what an operator setting does to it.
 */
describe('adapters/database (utc timestamps)', () => {
    it('should pin mysql sessions to UTC and read datetimes as UTC', () => {
        const options = applyUTCTimestamps({ type: 'mysql' }) as DataSourceOptions & { driver: any };

        expect(options).toMatchObject({ timezone: 'Z', dateStrings: ['DATE'] });
        expect(typeof options.driver.createPool).toEqual('function');
    });

    it('should pin postgres sessions to UTC and keep other startup options', () => {
        const options = applyUTCTimestamps({
            type: 'postgres',
            extra: { max: 3, options: '-c statement_timeout=5000' },
        }) as DataSourceOptions & { extra: Record<string, any> };

        expect(options.extra.max).toEqual(3);
        expect(options.extra.options).toEqual('-c statement_timeout=5000 -c TimeZone=UTC');
        expect(options.extra.types).toBeDefined();
    });

    it('should be idempotent', () => {
        const once = applyUTCTimestamps({ type: 'mysql' });
        expect(applyUTCTimestamps(once)).toBe(once);
    });

    it('should refuse an explicit non-UTC timezone rather than half apply the pin', () => {
        expect(() => applyUTCTimestamps({ type: 'mysql', timezone: '+02:00' }))
            .toThrow(OptionsError);
        expect(() => applyUTCTimestamps({ type: 'postgres', extra: { options: '-c TimeZone=Europe/Berlin' } }))
            .toThrow(OptionsError);
    });

    it('should leave a mysql replication setup as configured', () => {
        const input = { type: 'mysql', replication: { master: {}, slaves: [] } } as unknown as DataSourceOptions;
        expect(applyUTCTimestamps(input)).toBe(input);
    });

    it('should leave sqlite untouched', () => {
        const input: DataSourceOptions = { type: 'better-sqlite3', database: ':memory:' };
        expect(applyUTCTimestamps(input)).toBe(input);
    });
});
