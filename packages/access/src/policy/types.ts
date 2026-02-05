/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface PolicyBase {
    /**
     * Invert evaluation result of policy (true->false and false->true)
     */
    invert?: boolean,
}

export type PolicyWithType<
    R extends Record<string, any> = Record<string, any>,
    T = string,
> = R & {
    type: T
};

export interface IPolicy {
    type: string,

    invert?: boolean
}
