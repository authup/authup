/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';

export function parseProcessOutputData(input: unknown) : string[] {
    if (typeof input !== 'string') {
        return [];
    }

    const lines = input
        .split(/\r?\n/)
        .filter((element) => element);

    const items : string[] = [];

    for (let i = 0; i < lines.length; i++) {
        try {
            const parsed = JSON.parse(lines[i]);

            if (
                isObject(parsed) &&
                hasOwnProperty(parsed, 'message') &&
                typeof parsed.message === 'string'
            ) {
                items.push(parsed.message);
                continue;
            }
        } catch (e) {
            // no json :/
        }

        items.push(lines[i]);
    }

    return items;
}
