/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ObjectLiteral } from 'validup';

export interface IAuthenticationService<T extends ObjectLiteral = ObjectLiteral> {
    authenticate(name: string | T, secret: string, realmId?: string) : Promise<T>;

    safeAuthenticate(name: string | T, secret: string, realmId?: string) : Promise<Result<T>>;

    resolve(name: string, realmId?: string): Promise<T | null>;
}
