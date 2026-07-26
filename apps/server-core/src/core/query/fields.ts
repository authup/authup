/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    KeyValidationVerdict,
    KeyValidationVerdictRecord,
    KeyValidatorMany,
} from '@rapiq/core';
import type { ActorContext } from '@authup/server-kit';
import type { QueryDecodeContext } from './types.ts';

/**
 * Per-field read gate: given the acting identity, answer with a
 * {@link KeyValidationVerdict} for one gated column — `true` to project
 * it, `false` to strip it, or an `ICondition` to project it visible
 * only on rows satisfying the condition (rapiq attaches it to the
 * `Field` node; the repository layer enforces it after the fetch via
 * `redactFieldConditions`).
 *
 * A returned condition must be authored FAIL-CLOSED over incomplete
 * rows: `@rapiq/memory` unifies a missing column with `null`, so a
 * negative predicate (`not(...)`, `ne(...)`) over an unselected column
 * evaluates true and ships the value. The SQL adapter force-selects
 * every column a condition references (rapiq#830's operand
 * projection), so this is defense in depth — but prefer positive legs
 * (`eq(x, true)`) plus an outer presence guard (`ne('realmId', null)`)
 * over negated trees.
 */
export type FieldReadGate = (actor: ActorContext) => Promise<KeyValidationVerdict> | KeyValidationVerdict;

/**
 * Build a rapiq `fields.validateMany` hook gating individual columns on
 * a per-actor verdict (issue #3322): invoked once per (governing
 * schema, relation path) with every client-requested field, so a gate
 * can compile the actor's permission tree once per query instead of
 * once per field. The batched form matters because the gate applies
 * uniformly at the query ROOT and under any relation path — the
 * position where `ClientPermissionService` & co. serve
 * `include=client&fields[client]=secret` never runs the client
 * service's own read path.
 *
 * Ungated fields accept. Schema defaults never reach the hook, so an
 * unqualified list request costs no evaluation. Caller classes mirror
 * the relations read gate: a SYSTEM decode (no actor in the context)
 * is unrestricted; every REQUEST decode carries an actor (anonymous
 * ones hold no grants). A gate failure fails closed (strip).
 *
 * NOTE: schemas import this file DIRECTLY (never the `core/query`
 * barrel) — the barrel reaches `module.ts`, which imports every
 * schema; importing it from a schema would create a TDZ cycle.
 */
export function createFieldsReadGate(
    gates: Record<string, FieldReadGate>,
) : KeyValidatorMany<QueryDecodeContext | undefined> {
    return async (names, context) => {
        const record : KeyValidationVerdictRecord = {};

        for (const name of names) {
            const gate = gates[name];
            if (!gate || !context || !context.actor) {
                record[name] = true;
                continue;
            }

            try {
                record[name] = await gate(context.actor);
            } catch {
                record[name] = false;
            }
        }

        return record;
    };
}
