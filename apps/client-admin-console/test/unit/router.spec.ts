/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { RouteRecordRaw } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { LayoutKey } from '../../src/config/layout';
import { routes } from '../../src/router';

function walk(records: RouteRecordRaw[], prefix = '') : { path: string, permissions: string[] }[] {
    return records.flatMap((record) => {
        const path = record.path.startsWith('/') ? record.path : `${prefix}/${record.path}`;
        const permissions = (record.meta?.[LayoutKey.REQUIRED_PERMISSIONS] ?? []) as string[];

        return [
            { path: path.replace(/\/$/, '') || '/', permissions },
            ...walk(record.children ?? [], path),
        ];
    });
}

describe('src/router', () => {
    // The table builds the CRUD families from strings; a typo would compile
    // and silently gate a section on a permission nobody holds.
    it('should gate routes on real permission names only', () => {
        const known = new Set<string>(Object.values(PermissionName));
        const gated = walk(routes).filter((entry) => entry.permissions.length > 0);

        expect(gated.length).toBeGreaterThan(20);

        for (const entry of gated) {
            for (const permission of entry.permissions) {
                expect(known.has(permission), `${entry.path}: ${permission}`).toBe(true);
            }
        }
    });

    it('should keep every section behind a login', () => {
        const top = routes.filter((record) => record.path !== '/login' &&
            record.path !== '/logout' &&
            !record.path.startsWith('/:'));

        for (const record of top) {
            expect(record.meta?.[LayoutKey.REQUIRED_LOGGED_IN], record.path).toBe(true);
        }
    });
});
