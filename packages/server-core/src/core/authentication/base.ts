/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Result } from '@authup/kit';
import type { ObjectLiteral } from 'validup';
import type { IAuthenticator } from './types';

export abstract class BaseAuthenticator<T extends ObjectLiteral = ObjectLiteral> implements IAuthenticator<T> {
    async safeAuthenticate(entity: T, secret: string): Promise<Result<T>> {
        try {
            const data = await this.authenticate(entity, secret);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e };
        }
    }

    abstract authenticate(entity: T, secret: string): Promise<T>;
}
