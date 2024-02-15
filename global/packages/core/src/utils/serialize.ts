/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { destr } from 'destr';

export function serialize(input: unknown) : string {
    if (typeof input === 'boolean') {
        return input ? 'true' : 'false';
    }

    if (typeof input === 'undefined') {
        return 'undefined';
    }

    if (input === null) {
        return 'null';
    }

    if (typeof input === 'number') {
        return `${input}`;
    }

    if (typeof input === 'string') {
        return input;
    }

    return JSON.stringify(input);
}

export function deserialize<T = any>(input: string) : T {
    return destr(input);
}
