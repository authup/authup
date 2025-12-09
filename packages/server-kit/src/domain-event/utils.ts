/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { isObject } from '@authup/kit';
import type { DomainEventChannelName } from './type';

export function transformDomainEventData<T extends ObjectLiteral>(input: T) : T {
    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i] as keyof T;

        const value = input[key] as T[keyof T];
        if (!isObject(value)) {
            continue;
        }

        if ((value as Record<string, any>) instanceof Date) {
            input[key] = value.toISOString() as T[keyof T];
        }
    }

    return input;
}

export function buildDomainEventChannelName(
    input: DomainEventChannelName,
    id?: string | number,
) : string {
    if (typeof input === 'string') {
        return input;
    }

    return input(id);
}
