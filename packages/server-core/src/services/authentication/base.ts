/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ObjectLiteral } from 'validup';
import type { IAuthenticationService } from './types';

export abstract class BaseAuthenticationService<T extends ObjectLiteral = ObjectLiteral> implements IAuthenticationService<T> {
    async safeAuthenticate(name: string | T, secret: string, realmId?: string): Promise<Result<T>> {
        try {
            const data = await this.authenticate(name, secret, realmId);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e };
        }
    }

    abstract authenticate(name: string | T, secret: string, realmId?: string): Promise<T>;

    abstract resolve(name: string, realmId?: string): Promise<T | null>;
}
