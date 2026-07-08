/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_WEB_NAME, ScopeName  } from '@authup/core-kit';
import type { Client, Realm } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IClientRepository, IWebClientProvisioner } from './types.ts';

export type WebClientProvisionerContext = {
    clientRepository: IClientRepository;
    appOrigins: string[];
    logger?: Logger;
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
 * token regardless — but it documents the intended flow. `redirect_uri` and
 * `post_logout_redirect_uri` are each one `<origin>/**` wildcard per trusted
 * origin (matched by isSimpleMatch).
 */
export function buildWebClientAttributes(
    realm: Realm | { id: string },
    appOrigins: string[],
): Partial<Client> {
    const originPatterns = appOrigins.map((origin) => `${origin}/**`).join(',');

    return {
        name: CLIENT_WEB_NAME,
        realm_id: realm.id,
        is_confidential: false,
        built_in: true,
        active: true,
        grant_types: 'authorization_code refresh_token',
        scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        redirect_uri: originPatterns,
        post_logout_redirect_uri: originPatterns,
    };
}

export class WebClientProvisioner implements IWebClientProvisioner {
    protected clientRepository: IClientRepository;

    protected appOrigins: string[];

    protected logger?: Logger;

    constructor(ctx: WebClientProvisionerContext) {
        this.clientRepository = ctx.clientRepository;
        this.appOrigins = ctx.appOrigins;
        this.logger = ctx.logger;
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
                if (this.logger) {
                    this.logger.warn(
                        `Skipping web client provisioning for realm ${realm.id}: a non-built-in client named '${CLIENT_WEB_NAME}' already exists.`,
                    );
                }
                return;
            }

            // MERGE: refresh attributes (e.g. redirect_uri) when config
            // changes. Dirty-check first — the attributes are deterministic
            // from config, so a steady-state boot would otherwise issue one
            // redundant UPDATE (bumping updated_at) per realm.
            const isDirty = (Object.keys(attributes) as (keyof Client)[])
                .some((key) => existing[key] !== attributes[key]);
            if (!isDirty) {
                return;
            }

            const merged = this.clientRepository.merge(existing, attributes);
            await this.clientRepository.save(merged);
            return;
        }

        const entity = this.clientRepository.create(attributes);
        await this.clientRepository.save(entity);
    }
}
