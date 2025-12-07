/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ObjectLiteral } from 'validup';

export interface ICredentialsAuthenticator<
    OUTPUT extends ObjectLiteral = ObjectLiteral,
> {
    authenticate(key: string, value: string, realmId?: string) : Promise<OUTPUT>;

    safeAuthenticate(key: string, value: string, realmId?: string) : Promise<Result<OUTPUT>>;
}
