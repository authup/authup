/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface PolicyBase {
    /**
     * The policy type.
     */
    type: string,

    /**
     * Invert evaluation result of policy (true->false and false->true)
     */
    invert?: boolean,
}

export type AnyPolicy = {
    type: string,
    [key: string]: any
};

export type PolicyEvaluationContext = {
    resource?: Record<string, any>,
    dateTime?: Date | number | string,
    [key: string]: any
};

export interface PolicyEvaluator<
    P extends Record<string, any> = Record<string, any>,
    C extends Record<string, any> = Record<string, any>,
> {
    try(policy: AnyPolicy, context: PolicyEvaluationContext): boolean;

    execute(policy: P, context: C): boolean;
}
