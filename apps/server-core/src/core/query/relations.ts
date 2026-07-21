/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { KeyValidator } from '@rapiq/core';
import { EntityType, PermissionName } from '@authup/core-kit';
import type { QueryDecodeContext } from './types.ts';

/**
 * Read gate per include target: the permission disjunction an actor
 * must hold (data-availability-derived pre-gate, issue #3290) for the
 * target entity type to be joinable via `include=`. Mirrors each
 * target service's own `getMany` read pre-gate, so "may list the
 * entity type" and "may join it onto another list" stay one predicate.
 * Policies are deliberately gated under the PERMISSION family — they
 * are managed under the permission domain.
 *
 * Absent entries are ungated: `realm` (the realm list is public — the
 * login realm chooser reads it anonymously) and `identityProvider`
 * (the anonymous login page lists providers; its schema field
 * allow-list is the safe-DTO layer).
 */
const RELATION_TARGET_READ_GATES : Partial<Record<`${EntityType}`, PermissionName[]>> = {
    [EntityType.CLIENT]: [
        PermissionName.CLIENT_READ,
        PermissionName.CLIENT_UPDATE,
        PermissionName.CLIENT_DELETE,
    ],
    [EntityType.USER]: [
        PermissionName.USER_READ,
        PermissionName.USER_UPDATE,
        PermissionName.USER_DELETE,
    ],
    [EntityType.ROLE]: [
        PermissionName.ROLE_READ,
        PermissionName.ROLE_UPDATE,
        PermissionName.ROLE_DELETE,
    ],
    [EntityType.SCOPE]: [
        PermissionName.SCOPE_READ,
        PermissionName.SCOPE_UPDATE,
        PermissionName.SCOPE_DELETE,
    ],
    [EntityType.PERMISSION]: [
        PermissionName.PERMISSION_READ,
        PermissionName.PERMISSION_UPDATE,
        PermissionName.PERMISSION_DELETE,
    ],
    [EntityType.POLICY]: [
        PermissionName.PERMISSION_READ,
        PermissionName.PERMISSION_UPDATE,
        PermissionName.PERMISSION_DELETE,
    ],
};

/**
 * Build a rapiq `relations.validate` hook gating each include on the
 * TARGET entity type's read permission (issue #3295): the actor must
 * pass the derived pre-gate (`preEvaluateOneOf`, #3290) for the
 * relation's mapped entity type — row data is unknown at decode time,
 * so only a settled-false (the actor can never read that entity type)
 * denies. A denial STRIPS the include silently (and rapiq prunes
 * dotted filter/sort/field keys riding the denied relation path) —
 * the same fail-soft flavor as the allow-lists, so a scoped reader
 * degrades to the un-joined row shape instead of a 403.
 *
 * `mapping` is the schema's own relation → entity-type `schemaMapping`;
 * rapiq invokes the hook per include segment against the schema
 * governing it, so nested paths (`include=user.realm`) are gated hop
 * by hop by each governing schema's own hook. Unmapped relations and
 * ungated targets neutral-pass.
 *
 * Caller classes: a SYSTEM call (no actor in the decode context) is
 * unrestricted — the gate neutral-passes. A REQUEST call always
 * carries an actor (`buildActorContext` supplies one even for an
 * anonymous request), so restriction attaches at the request
 * boundary: an authenticated actor is gated by its grants, an
 * anonymous actor holds none and every gated include strips. A gate
 * evaluation failure fails closed (strip).
 *
 * Residual (upstream): a dotted filter/sort/field key whose relation
 * is NOT explicitly included bypasses this hook — the SQL adapters
 * auto-join such paths without a relations.validate pass
 * (tada5hi/rapiq#815).
 *
 * NOTE: schemas import this file DIRECTLY (never the `core/query`
 * barrel) — the barrel reaches `module.ts`, which imports every
 * schema; importing it from a schema would create a TDZ cycle.
 */
export function createRelationsReadGate(
    mapping: Record<string, `${EntityType}`>,
) : KeyValidator<QueryDecodeContext | undefined> {
    return async (name, context) => {
        const target = mapping[name];
        if (!target) {
            return true;
        }

        const permissions = RELATION_TARGET_READ_GATES[target];
        if (!permissions) {
            return true;
        }

        if (!context || !context.actor) {
            return true;
        }

        try {
            await context.actor.permissionEvaluator.preEvaluateOneOf({ name: permissions });
            return true;
        } catch {
            return false;
        }
    };
}
