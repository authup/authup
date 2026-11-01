/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, reachesRecordOneOf } from '@authup/access';
import { EntityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import type { IQuery, Schema } from '@rapiq/core';
import { isObject } from '@authup/kit';
import { schemaRegistry } from './module.ts';
import { RELATION_TARGET_READ_GATES } from './relations.ts';
import { trimReachCheckFields } from './projection.ts';
import { compileRelationVerdict } from './reach.ts';
import type { RelationVerdict } from './reach.ts';

type Cache = {
    compiled: Map<string, RelationVerdict>,
    rows: Map<string, boolean>,
};

function isOwnIdentity(actor: ActorContext, target: string, row: Record<string, any>): boolean {
    if (!actor.identity) {
        return false;
    }

    return (
        (target === EntityType.USER && actor.identity.type === 'user') ||
        (target === EntityType.CLIENT && actor.identity.type === 'client')
    ) && actor.identity.data.id === row.id;
}

async function reachesJoinedRow(
    actor: ActorContext,
    target: string,
    names: string[],
    row: Record<string, any>,
    verdicts: Map<string, boolean>,
): Promise<boolean> {
    if (isOwnIdentity(actor, target, row)) {
        return true;
    }

    // a projection that dropped the realm column must not read as a global row
    if (typeof row.realmId === 'undefined') {
        return false;
    }

    const key = typeof row.id === 'string' ? `${target}:${row.id}` : undefined;
    const cached = key ? verdicts.get(key) : undefined;

    if (typeof cached === 'boolean') {
        return cached;
    }

    const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
        name: names,
        realm: row.realmId,
        data: { [BuiltInPolicyType.ATTRIBUTES]: row },
    });

    if (key) {
        verdicts.set(key, reached);
    }

    return reached;
}

async function redactLevel(
    rows: Record<string, any>[],
    paths: string[],
    schema: Schema<any>,
    actor: ActorContext,
    cache: Cache,
): Promise<void> {
    const roots = new Set(paths.map((path) => path.split('.')[0]));

    for (const root of roots) {
        const target = schema.mapSchema(root);
        const names = RELATION_TARGET_READ_GATES[target as `${EntityType}`];

        let verdict = cache.compiled.get(target);

        if (!verdict) {
            verdict = await compileRelationVerdict(actor, names);
            cache.compiled.set(target, verdict);
        }

        const keeps = async (item: unknown): Promise<boolean> => {
            if (!isObject(item)) {
                return false;
            }

            switch (verdict) {
                case 'allow':
                    return true;
                case 'deny':
                    return isOwnIdentity(actor, target, item);
                default:
                    return reachesJoinedRow(actor, target, names!, item, cache.rows);
            }
        };

        const kept: Record<string, any>[] = [];

        for (const row of rows) {
            const value = row[root];

            if (Array.isArray(value)) {
                const items: Record<string, any>[] = [];

                for (const item of value) {
                    if (await keeps(item)) {
                        items.push(item);
                    }
                }

                row[root] = items;
                kept.push(...items);

                continue;
            }

            if (value === null || typeof value === 'undefined') {
                continue;
            }

            if (await keeps(value)) {
                kept.push(value);
            } else {
                Reflect.deleteProperty(row, root);
            }
        }

        const nested = paths
            .filter((path) => path.startsWith(`${root}.`))
            .map((path) => path.substring(root.length + 1));
        const child = schemaRegistry.get(target);

        if (child && nested.length > 0 && kept.length > 0) {
            await redactLevel(kept, nested, child, actor, cache);
        }
    }
}

/**
 * The relation paths a decoded query hydrates onto its rows: every include,
 * and every relation a `fields[relation]` projection joins without one.
 */
function collectRelationPaths(query: IQuery): string[] {
    const paths = new Set<string>();

    if (query.relations) {
        for (const relation of query.relations.value) {
            paths.add(relation.name);
        }
    }

    if (query.fields) {
        for (const field of query.fields.value) {
            const index = field.name.lastIndexOf('.');

            if (index > 0) {
                paths.add(field.name.substring(0, index));
            }
        }
    }

    return [...paths];
}

/**
 * Remove every joined relation whose row the actor could not read through
 * the target's own read route. The relations read gate
 * (`createRelationsReadGate`) only decides at decode time whether the target
 * TYPE may be joined; this applies the target's read reach (realm and
 * policies) to each joined row after the fetch. The reach is compiled once
 * per target: `allow` keeps every joined row and `deny` none but the
 * actor's own identity, while a conditional or non-lowerable verdict
 * evaluates each distinct joined row once. The parent row stays: its own
 * gate already passed. Dotted filter and sort keys through such a relation
 * are pruned at decode time (`pruneUnreachedRelationKeys`). Call it on every
 * read that answers a caller with a decoded query.
 */
export async function redactUnreachedRelations<T extends Record<string, any>>(
    rows: T[],
    query: IQuery,
    schema: Schema<any>,
    actor: ActorContext,
): Promise<T[]> {
    const paths = collectRelationPaths(query);

    if (paths.length === 0 || rows.length === 0) {
        return rows;
    }

    await redactLevel(rows, paths, schema, actor, {
        compiled: new Map(),
        rows: new Map(),
    });

    trimReachCheckFields(rows, query);

    return rows;
}
