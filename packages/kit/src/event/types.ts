/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type EventPayload = {
    event: string,
    type: string
};

export type EventFullName<
    ENTITY extends string = string,
    EVENT extends string = string,
> = `${ENTITY}${Capitalize<EVENT>}`;
