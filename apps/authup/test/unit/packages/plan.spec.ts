/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { PackageID, resolveLaunchPlan } from '../../../src/packages';

describe('src/packages/plan', () => {
    it('should target server-core for start without selectors', () => {
        const plan = resolveLaunchPlan('start');

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.commandArgs).toEqual(['start']);
        expect(plan.warnings).toEqual([]);
    });

    it('should target server-core for start with its selector', () => {
        const plan = resolveLaunchPlan('start', ['server.core']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
    });

    // The admin console is served by server-core (plan 081): the selector is
    // still accepted so an existing invocation keeps working, but it warns
    // instead of launching a second process.
    it('should accept the retired admin-console selector with a warning', () => {
        const plan = resolveLaunchPlan('start', ['server-core,client/admin-console']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.warnings).toHaveLength(1);
        expect(plan.warnings[0]).toMatch(/client\.admin-console/);
        expect(plan.warnings[0]).toMatch(/served by server-core/);
    });

    // The old console unit of a two-unit deployment keeps running this; it
    // must not become a second server with default credentials.
    it('should launch nothing when only the retired selector is given', () => {
        const plan = resolveLaunchPlan('start', ['client.admin-console']);

        expect(plan.packages).toEqual([]);
        expect(plan.warnings).toHaveLength(1);
    });

    it('should deduplicate selectors', () => {
        const plan = resolveLaunchPlan('start', ['server.core', 'server-core']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
    });

    it('should fail for an unknown package selector', () => {
        expect(() => resolveLaunchPlan('start', ['foo'])).toThrow(/not supported/);
    });

    it('should route migration to server-core only', () => {
        const plan = resolveLaunchPlan('migration', ['run']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.commandArgs).toEqual(['migration', 'run']);
    });

    it('should drop an explicit server-core selector for migration', () => {
        const plan = resolveLaunchPlan('migration', ['server.core', 'revert']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.commandArgs).toEqual(['migration', 'revert']);
    });

    it('should warn about the retired selector on migration and healthcheck', () => {
        const migration = resolveLaunchPlan('migration', ['client.admin-console', 'run']);
        expect(migration.commandArgs).toEqual(['migration', 'run']);
        expect(migration.warnings).toHaveLength(1);

        const healthcheck = resolveLaunchPlan('healthcheck', ['client.admin-console']);
        expect(healthcheck.packages).toEqual([PackageID.SERVER_CORE]);
        expect(healthcheck.warnings).toHaveLength(1);
    });

    it('should route healthcheck to server-core only', () => {
        const plan = resolveLaunchPlan('healthcheck');

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.commandArgs).toEqual(['healthcheck']);
    });

    it('should fail for an unknown command', () => {
        expect(() => resolveLaunchPlan('reset')).toThrow(/not supported/);
        expect(() => resolveLaunchPlan('reset')).toThrow(/start, migration, healthcheck/);
    });
});
