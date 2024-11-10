/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compare as compareMethod } from '@node-rs/bcrypt';

export async function compare(value: string, hashedValue: string) : Promise<boolean> {
    return compareMethod(value, hashedValue);
}
