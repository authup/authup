/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ObjectLiteral } from 'validup';
import type { ICredentialsAuthenticator } from './types';

export abstract class BaseCredentialsAuthenticator<
    OUTPUT extends ObjectLiteral = ObjectLiteral,
> implements ICredentialsAuthenticator<OUTPUT> {
    async safeAuthenticate(key: string, value: string, realmId?: string): Promise<Result<OUTPUT>> {
        try {
            const data = await this.authenticate(key, value, realmId);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e as Error };
        }
    }

    abstract authenticate(key: string, value: string, realmId?: string): Promise<OUTPUT>;
}
