/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    IOAuth2FederatedLoginStore,
    OAuth2FederatedLoginPending,
} from '../../../../../src/core/oauth2/federated-login/types.ts';

export class FakePendingLoginStore implements IOAuth2FederatedLoginStore {
    public saved : OAuth2FederatedLoginPending[] = [];

    private entries = new Map<string, OAuth2FederatedLoginPending>();

    async save(data: OAuth2FederatedLoginPending): Promise<string> {
        this.saved.push(data);

        const id = randomUUID();
        this.entries.set(id, data);

        return id;
    }

    async consume(id: string): Promise<OAuth2FederatedLoginPending | null> {
        const entry = this.entries.get(id);
        this.entries.delete(id);

        return entry ?? null;
    }
}
