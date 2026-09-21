/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import fs from 'node:fs/promises';
import process from 'node:process';
import { text } from 'node:stream/consumers';

export async function readEntityData(
    value: string,
    stdin: NodeJS.ReadableStream = process.stdin,
) : Promise<Record<string, unknown>> {
    let raw = value;
    if (value === '@-') {
        raw = await text(stdin);
    } else if (value.startsWith('@')) {
        raw = await fs.readFile(value.slice(1), 'utf8');
    }

    let parsed : unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('--data must hold a JSON object: inline, @<path> for a file, or @- for stdin.');
    }

    if (!isObject(parsed)) {
        throw new Error('--data must hold a JSON object.');
    }

    return parsed;
}
