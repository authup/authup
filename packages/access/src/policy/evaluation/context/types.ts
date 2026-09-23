/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */
import type { PolicyData } from '../../data.ts';
import type { IPolicyEvaluator } from '../types.ts';

/**
 * Receives the instants at which a clock-dependent verdict could change.
 *
 * A `date` or `time` policy that fell back to the real clock (no `date` / `time`
 * key in the bag) reports the next strictly-future instant its own verdict could
 * flip, from inside the evaluation walk that already runs. A caller that caches
 * an answer derived from such a walk learns when to stop trusting it. Reports may
 * be early (conservative) but never late, and `invert` does not move them.
 */
export type PolicyTransitionSink = {
    report(at: Date): void
};

export type PolicyEvaluationContext = {
    readonly evaluators: Record<string, IPolicyEvaluator>,
    readonly path: (string | number)[],
    readonly exclude: string[],
    readonly include: string[],
    readonly data: PolicyData,
    /**
     * Attach the condition form (`PolicyEvaluationResult.condition`) to pending
     * subtrees via `IPolicyEvaluator.toCondition`. Off by default — evaluation-only
     * callers (evaluate / preEvaluate hot paths) must not pay the lowering cost;
     * query-build callers opt in.
     */
    readonly withConditions: boolean,
    /**
     * Row column the realm reach is LOWERED onto, for a caller whose rows carry the
     * realm under another name (a junction's `roleRealmId` / `clientRealmId` / …).
     * Default `realmId`. It reaches `RealmMatchPolicyEvaluator` scope mode as
     * `attributeName`, which that mode reads only while lowering — settled
     * evaluation takes the resource realm from the `realmMatch` data key and never
     * consults a column name, so this can never change an evaluate() outcome.
     */
    readonly realmAttributeName?: string,
    /**
     * Optional receiver of clock transitions (see {@link PolicyTransitionSink}).
     * Nested evaluations inherit it, since every walk propagates the context by
     * spread.
     */
    readonly transitions?: PolicyTransitionSink
};

export type PolicyEvaluationContextInput = Partial<PolicyEvaluationContext>;
