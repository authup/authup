/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    and, 
    contains, 
    defineQuery, 
    inArray, 
    or,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { queryCodec, schemas } from '../../../../src/core/query/module.ts';
import { decodeQuery } from '../../../../src/core/query/index.ts';

/**
 * The invariant the index declarations rest on: every allowed filter key
 * and every allowed sort key must LEAD a declared index.
 *
 * Anchor mode requires one conjunct per AND group to lead an index, and a
 * sort key list must equal a leftmost prefix of one index — so a key that
 * leads nothing is a hard 400 the moment a client filters or sorts by it
 * alone (no schema declares a filters default, so the drop path escalates
 * to a throw). An OR search is stricter still: EVERY branch must anchor,
 * which is what makes a compound `or(contains(name), contains(displayName))`
 * viable only when both columns lead an index.
 */
describe('core/query (indexed invariant)', () => {
    it('should have schemas to check', () => {
        expect(schemas.length).toBeGreaterThan(0);
    });

    it('should let every allowed filter key anchor an index', () => {
        const offenders : string[] = [];

        for (const schema of schemas) {
            const description = schema.describe();
            const leading = new Set((description.indexes || []).map((index: string[]) => index[0]));

            for (const key of description.filters?.allowed || []) {
                if (!leading.has(key)) {
                    offenders.push(`${description.name}.${key}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    /**
     * Guards both checks against passing vacuously. Each reads an
     * allow-list off the schema DESCRIPTION and iterates it, so a
     * renamed description key yields `undefined`, the loop never runs
     * and the invariant reports green while checking nothing — which is
     * exactly what the `sort` to `sorts` rename in rapiq 2.1.0 (#906)
     * did. The description is upstream's shape, so pin that it still
     * carries the keys these checks depend on.
     */
    it.each(['filters', 'sorts'] as const)('should have %s allow-lists to check', (parameter) => {
        const keys = schemas
            .flatMap((schema) => schema.describe()[parameter]?.allowed || []);

        expect(keys.length).toBeGreaterThan(0);
    });

    it('should let every allowed sort key lead an index', () => {
        const offenders : string[] = [];

        for (const schema of schemas) {
            const description = schema.describe();
            const leading = new Set((description.indexes || []).map((index: string[]) => index[0]));

            for (const key of description.sorts?.allowed || []) {
                if (!leading.has(key)) {
                    offenders.push(`${description.name}.${key}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    /**
     * The console's list search, end to end through the real encoder: the
     * kit's `queryFilters` hook searches name and display name at once,
     * and the header realm switcher injects its scope alongside.
     *
     * Both shapes are pinned because they fail differently:
     *
     * - `AND(realmScope, or(...))` anchors on `realmId`, so the OR rides
     *   along as residual filtering and survives even a branch that leads
     *   no index;
     * - the bare OR carries no such anchor, so EVERY branch must lead one
     *   and a single missing index rejects the whole search with a 400.
     *
     * A missing allow-list entry (`keyNotAllowed`) fails both.
     */
    describe('console list search', () => {
        const REALM_ID = '11111111-1111-1111-1111-111111111111';

        const searchable = schemas
            .map((schema) => ({ schema, description: schema.describe() }))
            .filter(({ description }) => (description.filters?.allowed || []).includes('name'));

        it('should cover the searchable schemas', () => {
            expect(searchable.length).toBeGreaterThan(0);
        });

        it.each(searchable.map(({ schema, description }) => [description.name as string, schema] as const))(
            'should decode both search shapes for %s',
            async (_name, schema) => {
                const description = schema.describe();
                const allowed = description.filters?.allowed || [];

                const search = allowed.includes('displayName') ?
                    or(contains('name', 'foo'), contains('displayName', 'foo')) :
                    contains('name', 'foo');

                const shapes = [search];
                if (allowed.includes('realmId')) {
                    // header realm switcher: active realm + global rows
                    shapes.push(and(inArray('realmId', [REALM_ID, null] as any), search));
                }

                for (const filters of shapes) {
                    const encoded = queryCodec.encode(defineQuery({ filters } as any));
                    expect(encoded).toBeTruthy();

                    // throws (keyNotAllowed / keyCombinationNotIndexed) on regression
                     
                    const parsed = await decodeQuery(encoded as string, { schema });
                    expect(JSON.stringify(parsed.filters)).toContain('foo');
                }
            },
        );
    });
});
