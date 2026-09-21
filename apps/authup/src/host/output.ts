/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';

export function writeJSON(value: unknown) : void {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writeOutput(text: string) : void {
    process.stdout.write(`${text}\n`);
}

export function writeNotice(text: string) : void {
    process.stderr.write(`${text}\n`);
}
