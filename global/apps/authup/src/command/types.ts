/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CommandExecutionContext<
    ENV extends Record<string, any> = Record<string, any>,
    ARGS extends Record<string, any> = Record<string, any>,
> = {
    command: string,
    env?: ENV,
    envFromProcess?: boolean,
    args?: ARGS
};
