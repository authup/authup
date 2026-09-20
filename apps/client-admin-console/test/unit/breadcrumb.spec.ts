/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BreadcrumbItem } from '@vuecs/navigation';
import { describe, expect, it } from 'vitest';
import { buildEntityBreadcrumb, buildPathAncestors } from '../../src/composables/breadcrumb';

const PATH_ID = '4f0f6f2c-4a0b-4f4a-9a3f-4b7d4b4a1f11';

const base : BreadcrumbItem[] = [
    {
        label: 'Home', 
        to: '/', 
        icon: 'fa6-solid:house', 
    },
    {
        label: 'Users', 
        to: '/users', 
        icon: 'fa6-solid:user', 
    },
];

describe('src/composables/breadcrumb', () => {
    it('should place the folder ancestors between the section and the record', () => {
        const items = buildEntityBreadcrumb({
            base,
            ancestors: [
                { label: 'sales', url: '/paths?path=sales' },
                { label: 'berlin', url: `/paths/${PATH_ID}` },
            ],
            entity: { label: 'alice', url: '/users/1' },
        });

        expect(items.map((item) => item.label)).toEqual([
            'Home',
            'Users',
            'sales',
            'berlin',
            'alice',
        ]);
        expect(items.map((item) => item.to)).toEqual([
            '/',
            '/users',
            '/paths?path=sales',
            `/paths/${PATH_ID}`,
            '/users/1',
        ]);
    });

    it('should leave the trail unchanged without ancestors', () => {
        const items = buildEntityBreadcrumb({
            base,
            entity: { label: 'alice', url: '/users/1' },
        });

        expect(items).toEqual([
            ...base,
            { label: 'alice', to: '/users/1' },
        ]);
    });

    it('should keep the tab crumb last', () => {
        const items = buildEntityBreadcrumb({
            base,
            ancestors: [{ label: 'sales', url: '/paths?path=sales' }],
            entity: { label: 'alice', url: '/users/1' },
            path: '/users/1/roles',
            tabs: [
                {
                    name: '', 
                    icon: 'fa6-solid:arrow-left', 
                    url: '/users', 
                },
                {
                    name: 'Roles', 
                    icon: 'fa6-solid:user-group', 
                    url: '/users/1/roles', 
                },
            ],
        });

        expect(items.map((item) => item.label)).toEqual([
            'Home',
            'Users',
            'sales',
            'alice',
            'Roles',
        ]);
    });
});

describe('src/composables/breadcrumb -> buildPathAncestors', () => {
    it('should link every segment but the leaf to the scoped collection', () => {
        expect(buildPathAncestors({ id: PATH_ID, path: 'sales/berlin' })).toEqual([
            { label: 'sales', url: '/paths?path=sales' },
            { label: 'berlin', url: `/paths/${PATH_ID}` },
        ]);
    });

    it('should link a root folder to its own record', () => {
        expect(buildPathAncestors({ id: PATH_ID, path: 'sales' })).toEqual([
            { label: 'sales', url: `/paths/${PATH_ID}` },
        ]);
    });

    it('should encode the separator of a nested prefix', () => {
        const items = buildPathAncestors({ id: PATH_ID, path: 'sales/berlin/west' });

        expect(items.map((item) => item.url)).toEqual([
            '/paths?path=sales',
            '/paths?path=sales%2Fberlin',
            `/paths/${PATH_ID}`,
        ]);
    });

    it('should yield no ancestors for a record without a folder', () => {
        expect(buildPathAncestors(null)).toEqual([]);
        expect(buildPathAncestors(undefined)).toEqual([]);
    });
});
