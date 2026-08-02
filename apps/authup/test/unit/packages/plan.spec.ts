/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { PackageID, resolveLaunchPlan } from '../../../src/packages';

describe('src/packages/plan', () => {
    it('should target all packages for start without selectors', () => {
        const plan = resolveLaunchPlan('start');

        expect(plan.packages).toEqual([PackageID.SERVER_CORE, PackageID.CLIENT_ADMIN_CONSOLE]);
        expect(plan.commandArgs).toEqual(['start']);
    });

    it('should target a single package for start with a selector', () => {
        const plan = resolveLaunchPlan('start', ['server.core']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
    });

    it('should support comma separated and aliased selectors', () => {
        const plan = resolveLaunchPlan('start', ['server-core,client/admin-console']);

        expect(plan.packages).toEqual([PackageID.SERVER_CORE, PackageID.CLIENT_ADMIN_CONSOLE]);
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

    it('should reject migration targeting client-admin-console', () => {
        expect(() => resolveLaunchPlan('migration', ['client.admin-console'])).toThrow(/client\.admin-console/);
    });

    it('should route healthcheck to server-core only', () => {
        const plan = resolveLaunchPlan('healthcheck');

        expect(plan.packages).toEqual([PackageID.SERVER_CORE]);
        expect(plan.commandArgs).toEqual(['healthcheck']);
    });

    it('should reject healthcheck targeting client-admin-console', () => {
        expect(() => resolveLaunchPlan('healthcheck', ['client.admin-console'])).toThrow(/client\.admin-console/);
    });

    it('should fail for an unknown command', () => {
        expect(() => resolveLaunchPlan('reset')).toThrow(/not supported/);
        expect(() => resolveLaunchPlan('reset')).toThrow(/start, migration, healthcheck/);
    });
});
