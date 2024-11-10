/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/kit';
import { removeLineBreaks } from './line-breaks';

export function parseProcessOutputData(input: unknown) : string[] {
    if (typeof input !== 'string') {
        return [];
    }

    const lines = input
        .split(/\r?\n/)
        .filter((element) => element);

    const items : string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = removeLineBreaks(lines[i]).trim();
        if (line.length === 0) {
            continue;
        }

        try {
            const parsed = JSON.parse(line);

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

        items.push(line);
    }

    return items;
}
