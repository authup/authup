/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import {
    contains,
    defineQuery,
    or,
} from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import { queryCodec, schemas } from '../../../../src/core/query/module.ts';
import { decodeQuery } from '../../../../src/core/query/index.ts';

/**
 * The admin console's search boxes send a fixed field list per entity, and
 * this is the server half of that contract.
 *
 * `ENTITY_SEARCH_FIELDS` in
 * `packages/client-web-kit/src/components/utility/entity/collection/constants.ts`
 * decides, per entity type, which columns a bare search string is matched
 * against. The kit cannot see these schemas, so the two are coupled by hand
 * across a package boundary, and the failure is a hard one: rapiq resolves
 * keys strictly and answers an unknown one with `keyNotAllowed` (400) rather
 * than pruning it, so dropping a field below turns every search box for that
 * entity from "narrower result" into "failed request".
 *
 * The sibling `indexed-invariant.spec.ts` cannot catch that. It derives its
 * search shape FROM the allow-list (`allowed.includes('displayName') ? or(...)
 * : contains(...)`), so a removal makes it quietly stop exercising the
 * compound shape instead of failing. This spec states the expectation
 * outright: these entities must keep these fields filterable.
 *
 * Adding an entity to the kit map means adding it here too.
 */
const CONSOLE_SEARCH_FIELDS : Record<string, string[]> = {
    [EntityType.CLIENT]: ['name', 'displayName'],
    [EntityType.IDENTITY_PROVIDER]: ['name', 'displayName'],
    [EntityType.PERMISSION]: ['name', 'displayName'],
    [EntityType.POLICY]: ['name', 'displayName'],
    [EntityType.REALM]: ['name', 'displayName'],
    [EntityType.ROLE]: ['name', 'displayName'],
    [EntityType.SCOPE]: ['name', 'displayName'],
    [EntityType.USER]: ['name', 'displayName'],
};

describe('core/query (console search surface)', () => {
    const byName = new Map(
        schemas.map((schema) => [schema.describe().name as string, schema]),
    );

    it.each(Object.keys(CONSOLE_SEARCH_FIELDS))(
        'should register a schema for %s',
        (name) => {
            // a typo here would make every assertion below vacuous
            expect(byName.has(name)).toBe(true);
        },
    );

    it.each(Object.entries(CONSOLE_SEARCH_FIELDS))(
        'should keep every field the console searches filterable on %s',
        (name, fields) => {
            const description = byName.get(name)!.describe();
            const allowed = description.filters?.allowed || [];

            expect(allowed).toEqual(expect.arrayContaining(fields));
        },
    );

    it.each(Object.entries(CONSOLE_SEARCH_FIELDS))(
        'should decode the unscoped compound search for %s',
        async (name, fields) => {
            const schema = byName.get(name)!;

            // the exact shape buildEntitySearchCondition emits, unconditionally
            // rather than derived from the allow-list, and unscoped because that
            // is the strict case: with no anchoring conjunct alongside it, EVERY
            // branch of the OR must lead an index
            const filters = or(...fields.map((field) => contains(field, 'foo')));
            const encoded = queryCodec.encode(defineQuery({ filters } as any));

            // throws keyNotAllowed / keyCombinationNotIndexed on regression
            const parsed = await decodeQuery(encoded as string, { schema });

            for (const field of fields) {
                expect(JSON.stringify(parsed.filters)).toContain(field);
            }
        },
    );
});
