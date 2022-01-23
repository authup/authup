/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compare as compareMethod } from 'bcrypt';

export async function compare(data: string, encrypted: string) : Promise<boolean> {
    return compareMethod(data, encrypted);
}
