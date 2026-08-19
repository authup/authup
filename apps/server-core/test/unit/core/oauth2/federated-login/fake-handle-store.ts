/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    IOAuth2FederatedLoginHandleStore,
    OAuth2FederatedLoginHandle,
} from '../../../../../src/core/oauth2/federated-login/types.ts';

export class FakeHandleStore implements IOAuth2FederatedLoginHandleStore {
    public saved : OAuth2FederatedLoginHandle[] = [];

    private entries = new Map<string, OAuth2FederatedLoginHandle>();

    async save(data: OAuth2FederatedLoginHandle): Promise<string> {
        this.saved.push(data);

        const handle = randomUUID();
        this.entries.set(handle, data);

        return handle;
    }

    async consume(handle: string): Promise<OAuth2FederatedLoginHandle | null> {
        const entry = this.entries.get(handle);
        this.entries.delete(handle);

        return entry ?? null;
    }
}
