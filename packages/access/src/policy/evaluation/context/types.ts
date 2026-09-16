/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */
import type { PolicyData } from '../../data.ts';
import type { IPolicyEvaluator } from '../types.ts';

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
     * The client the evaluated credential was issued to (#3597), handed to the
     * grant provider so a user's grants owned by another client are withheld.
     * Unlike `realmAttributeName` it CAN move an evaluate() outcome. Absent
     * means a credential issued to no client, which narrows nothing.
     */
    readonly credentialClientId?: string | null
};

export type PolicyEvaluationContextInput = Partial<PolicyEvaluationContext>;
