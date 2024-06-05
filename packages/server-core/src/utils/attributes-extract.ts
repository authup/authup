/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';

type Output<T extends string> = {
    [K in T]?: any
};

export function extractAttributes<A extends string>(input: Record<string, any>, attributes: A[]) : Output<A> {
    const output : Output<A> = {};

    for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        if (!hasOwnProperty(input, attribute)) {
            continue;
        }

        output[attributes[i] as string] = input[attribute];
    }

    return output;
}
