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

export type PolicyEvaluationIdentity = {
    type: string,
    id: string,
    realmId?: string,
    realmName?: string
};

export type PolicyEvaluationData = {
    /**
     * Identity of the executing party.
     */
    identity?: PolicyEvaluationIdentity,
    /**
     * Attributes
     */
    attributes?: Record<string, any>,
    /**
     * The dateTime to use for time & date policy.
     */
    dateTime?: Date | number | string,
    [key: string]: any
};
