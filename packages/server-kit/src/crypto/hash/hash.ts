/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hash as hashMethod } from '@node-rs/bcrypt';

export async function hash(str: string, rounds: number = 10) : Promise<string> {
    return hashMethod(str, rounds);
}
