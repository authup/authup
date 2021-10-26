/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {compare, hash} from "bcrypt";

export async function hashPassword(password: string, saltOrRounds: number | string = 10) : Promise<string> {
    return hash(password,saltOrRounds);
}

export async function verifyPassword(password: string, hash: string) : Promise<boolean> {
    return compare(password, hash);
}

