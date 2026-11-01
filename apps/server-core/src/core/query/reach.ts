/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import type {
    ICondition,
    IQuery,
    Schema,
    SchemaRegistry,
} from '@rapiq/core';
import {
    Fields,
    ParseError,
    Query,
    isFilter,
    isFilters,
    isGroupedQuery,
    pruneFiltersByRelations,
    pruneSortsByRelations,
} from '@rapiq/core';
import { ReachCheckField, readDefaultFieldNames } from './projection.ts';
import { RELATION_TARGET_READ_GATES } from './relations.ts';

export type RelationVerdict = 'allow' | 'deny' | 'check';

/**
 * Compile the target's read permissions for the actor: `allow` reaches
 * every row, `deny` none, and `check` (a conditional or non-lowerable
 * verdict) only the rows that pass a per-row evaluation.
 */
export async function compileRelationVerdict(
    actor: ActorContext,
    names: string[] | undefined,
): Promise<RelationVerdict> {
    if (!names) {
        return 'allow';
    }

    const result = await actor.permissionEvaluator.compile({ name: names });

    switch (result.verdict) {
        case 'allow':
            return 'allow';
        case 'deny':
            return 'deny';
        default:
            return 'check';
    }
}

function collectFilterFields(node: ICondition, prefix: string, output: string[]): void {
    if (isFilter(node)) {
        const field = prefix ? `${prefix}.${node.field}` : node.field;

        output.push(field);

        if (node.operator === 'elemMatch' && typeof node.value === 'object' && node.value !== null) {
            collectFilterFields(node.value as ICondition, field, output);
        }

        return;
    }

    if (isFilters(node)) {
        for (const child of node.value) {
            collectFilterFields(child, prefix, output);
        }
    }
}

/**
 * Every relation path a filter leaf or a sort key traverses
 * (`user.realm.name` traverses `user` and `user.realm`).
 */
function collectKeyRelationPaths(query: IQuery): string[] {
    const names: string[] = [];

    if (query.filters) {
        collectFilterFields(query.filters, '', names);
    }

    if (query.sorts) {
        for (const sort of query.sorts.value) {
            names.push(sort.name);
        }
    }

    const paths = new Set<string>();

    for (const name of names) {
        const segments = name.split('.');

        for (let i = 1; i < segments.length; i++) {
            paths.add(segments.slice(0, i).join('.'));
        }
    }

    return [...paths].sort((a, b) => a.length - b.length);
}

function resolveRelationTarget(
    path: string,
    schema: Schema<any>,
    registry: SchemaRegistry,
): string | undefined {
    let current: Schema<any> | undefined = schema;
    let target: string | undefined;

    for (const segment of path.split('.')) {
        if (!current) {
            return undefined;
        }

        target = current.mapSchema(segment);
        current = registry.get(target);
    }

    return target;
}

/**
 * Prune every filter leaf and sort key that traverses a relation the actor
 * cannot read without restriction. The join a dotted key needs is not
 * row-gated the way an included relation is, so its WHERE or ORDER BY would
 * be decided by the values of rows the target's own read route withholds.
 * A target the actor reads unrestricted (`allow`) keeps its keys; any other
 * verdict loses them, the treatment the decode gate gives a denied type. A
 * destructive selection (`throwOnFailure`) is refused instead, since a
 * dropped leaf widens the rows it acts on.
 */
export async function pruneUnreachedRelationKeys(
    query: IQuery,
    schema: Schema<any>,
    registry: SchemaRegistry,
    actor: ActorContext,
    options: { throwOnFailure?: boolean } = {},
): Promise<IQuery> {
    const paths = collectKeyRelationPaths(query);

    if (paths.length === 0) {
        return query;
    }

    const verdicts = new Map<string, RelationVerdict>();
    const rejected: string[] = [];

    for (const path of paths) {
        const covered = rejected.some((item) => path.startsWith(`${item}.`));

        if (covered) {
            continue;
        }

        const target = resolveRelationTarget(path, schema, registry);
        const names = target ?
            RELATION_TARGET_READ_GATES[target as `${EntityType}`] :
            undefined;

        if (!target || !names) {
            continue;
        }

        let verdict = verdicts.get(target);

        if (!verdict) {
            verdict = await compileRelationVerdict(actor, names);
            verdicts.set(target, verdict);
        }

        if (verdict !== 'allow') {
            rejected.push(path);
        }
    }

    if (rejected.length === 0) {
        return query;
    }

    if (options.throwOnFailure) {
        throw ParseError.keyValidateRejected(rejected[0]!);
    }

    return new Query({
        fields: query.fields,
        filters: query.filters ?
            pruneFiltersByRelations(query.filters, rejected, schema.filters) :
            query.filters,
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts && !isGroupedQuery(query) ?
            pruneSortsByRelations(query.sorts, rejected, schema.sorts) :
            query.sorts,
        groups: query.groups,
        aggregates: query.aggregates,
    });
}

/**
 * Widen a sparse `fields[relation]` projection to the relation's whole
 * default row when the actor's reach of the target is anything but `allow`.
 * The per-row reach check (`redactUnreachedRelations`) evaluates the joined
 * row, and a column the projection left out would read as null there, so a
 * policy on it could drop a readable relation or keep an unreadable one.
 * The added columns are {@link ReachCheckField}s, removed again after the
 * check, so the response shape is the one requested.
 */
export async function widenSparseRelationProjections(
    query: IQuery,
    schema: Schema<any>,
    registry: SchemaRegistry,
    actor: ActorContext,
): Promise<IQuery> {
    if (!query.fields || query.fields.value.length === 0) {
        return query;
    }

    const requested = new Map<string, Set<string>>();

    for (const field of query.fields.value) {
        const index = field.name.lastIndexOf('.');

        if (index <= 0) {
            continue;
        }

        const path = field.name.substring(0, index);
        const columns = requested.get(path) ?? new Set<string>();

        columns.add(field.name.substring(index + 1));
        requested.set(path, columns);
    }

    if (requested.size === 0) {
        return query;
    }

    const verdicts = new Map<string, RelationVerdict>();
    const added: ReachCheckField[] = [];

    for (const [path, columns] of requested) {
        const target = resolveRelationTarget(path, schema, registry);
        const names = target ?
            RELATION_TARGET_READ_GATES[target as `${EntityType}`] :
            undefined;
        const targetSchema = target ? registry.get(target) : undefined;

        if (!target || !names || !targetSchema) {
            continue;
        }

        let verdict = verdicts.get(target);

        if (!verdict) {
            verdict = await compileRelationVerdict(actor, names);
            verdicts.set(target, verdict);
        }

        if (verdict === 'allow') {
            continue;
        }

        const defaults = readDefaultFieldNames(targetSchema) ?? [];

        for (const column of defaults) {
            if (!columns.has(column)) {
                added.push(new ReachCheckField(`${path}.${column}`));
            }
        }
    }

    if (added.length === 0) {
        return query;
    }

    return new Query({
        fields: new Fields([...query.fields.value, ...added]),
        filters: query.filters,
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts,
        groups: query.groups,
        aggregates: query.aggregates,
    });
}
