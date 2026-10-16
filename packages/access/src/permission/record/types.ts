/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData, PolicyInput } from '../../policy';
import type { PermissionEvaluationOptions } from '../evaluator';

/**
 * The realm of the record a check is evaluated against: a realm id, `null`
 * for a global row, or a list of either when every listed realm must be
 * reached.
 */
export type RecordRealm = string | null | (string | null)[];

/** One record a single-record check is evaluated against. */
export type RecordTarget = {
    /**
     * The RECORD's realm (`null` = global row), or the target realm on
     * create. This is what each grant's `realm_scope` is matched against.
     * It is distinct from `PermissionEvaluationContext.realmId`, which is the
     * realm the PERMISSION is bound to. Required: `undefined` throws, so a
     * caller cannot drop the realm by omission and neutral-pass every grant's
     * `realm_scope`.
     */
    realm: RecordRealm;
    /**
     * The policy data the record is evaluated with: the row under
     * `attributes` (for attribute policies on the grant; never synthesized,
     * so without it an attribute policy stays pending), an identity, a custom
     * key. Never mutated; must not carry `realmMatch`, which is set from
     * `realm`.
     */
    data?: PolicyData | PolicyInput;
};

export type RecordEvaluationContext = RecordTarget & {
    name: string | string[];
    options?: PermissionEvaluationOptions;
};

export type RecordUpdateEvaluationContext = {
    name: string | string[];
    options?: PermissionEvaluationOptions;
    /** The stored row: the actor must reach it to change it at all. */
    current: RecordTarget;
    /** The updated row: it must stay in reach afterwards. */
    next: RecordTarget;
};
