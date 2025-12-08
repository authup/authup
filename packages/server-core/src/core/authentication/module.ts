/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { BaseCredentialsAuthenticator } from './base';

export class CredentialsAuthenticator<T extends ObjectLiteral = ObjectLiteral> extends BaseCredentialsAuthenticator<T> {
    protected strategies: BaseCredentialsAuthenticator<T>[];

    constructor(strategies: BaseCredentialsAuthenticator<T>[]) {
        super();

        this.strategies = strategies;
    }

    async authenticate(key: string, value: string, realmId?: string): Promise<T> {
        let error : Error | undefined;

        for (let i = 0; i < this.strategies.length; i++) {
            const strategy = this.strategies[i];

            const output = await strategy.safeAuthenticate(key, value, realmId);
            if (output.success === true) {
                return output.data;
            }

            error = output.error;
        }

        if (error) {
            throw error;
        }

        throw new Error('No authentication strategy worked.');
    }
}
