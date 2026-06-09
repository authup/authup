/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_WEB_NAME, ScopeName  } from '@authup/core-kit';
import type { Client, Realm } from '@authup/core-kit';
import { isLoggerUsable, useLogger } from '@authup/server-kit';
import type { IClientRepository, IWebClientProvisioner } from './types.ts';

export type WebClientProvisionerContext = {
    clientRepository: IClientRepository;
    appOrigins: string[];
};

/**
 * Build the attribute set for a realm's public `web` client.
 *
 * Public (PKCE) client used by authup's own client-web and any downstream
 * UI embedding client-web-kit. `built_in` makes it auto-consent in the
 * /authorize flow and protects it from the API reserved-name guard. The
 * `global` scope lets the issued token drive the management API (parity
 * with the legacy password-grant admin login); `openid` for the id-token.
 *
 * `grant_types` is metadata only — the auth-code grant issues a refresh
 * token regardless — but it documents the intended flow. `redirect_uri` is
 * one `<origin>/**` wildcard per trusted origin (matched by isSimpleMatch).
 */
export function buildWebClientAttributes(
    realm: Realm | { id: string },
    appOrigins: string[],
): Partial<Client> {
    return {
        name: CLIENT_WEB_NAME,
        realm_id: realm.id,
        is_confidential: false,
        built_in: true,
        active: true,
        grant_types: 'authorization_code refresh_token',
        scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        redirect_uri: appOrigins.map((origin) => `${origin}/**`).join(','),
    };
}

export class WebClientProvisioner implements IWebClientProvisioner {
    protected clientRepository: IClientRepository;

    protected appOrigins: string[];

    constructor(ctx: WebClientProvisionerContext) {
        this.clientRepository = ctx.clientRepository;
        this.appOrigins = ctx.appOrigins;
    }

    async ensureForRealm(realm: Realm | { id: string }): Promise<void> {
        const attributes = buildWebClientAttributes(realm, this.appOrigins);

        const existing = await this.clientRepository.findOneBy({
            name: CLIENT_WEB_NAME,
            realm_id: realm.id,
        });

        if (existing) {
            // Never overwrite a non-built_in client that happens to be named
            // `web` — that would be a user-owned client. Skip and warn.
            if (!existing.built_in) {
                if (isLoggerUsable()) {
                    useLogger().warn(
                        `Skipping web client provisioning for realm ${realm.id}: a non-built-in client named '${CLIENT_WEB_NAME}' already exists.`,
                    );
                }
                return;
            }

            // MERGE: refresh attributes (e.g. redirect_uri) when config changes.
            const merged = this.clientRepository.merge(existing, attributes);
            await this.clientRepository.save(merged);
            return;
        }

        const entity = this.clientRepository.create(attributes);
        await this.clientRepository.save(entity);
    }
}
