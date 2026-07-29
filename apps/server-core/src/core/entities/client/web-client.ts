/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CLIENT_WEB_NAME,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    ScopeName,
} from '@authup/core-kit';
import type { Client, Realm } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IClientScopeRepository } from '../client-scope/types.ts';
import type { IScopeRepository } from '../scope/types.ts';
import type { IClientRepository, IWebClientProvisioner } from './types.ts';

export type WebClientProvisionerContext = {
    clientRepository: IClientRepository;
    scopeRepository: IScopeRepository;
    clientScopeRepository: IClientScopeRepository;
    appOrigins: string[];
    logger?: Logger;
};

/**
 * The scopes a realm's public `web` client is granted.
 *
 * `global` lets the issued token drive the management API (parity with the
 * legacy password-grant admin login); `openid` yields the id-token.
 */
export const WEB_CLIENT_SCOPE_NAMES: string[] = [
    ScopeName.GLOBAL,
    ScopeName.OPEN_ID,
];

/**
 * Build the attribute set for a realm's public `web` client.
 *
 * Public (PKCE) client used by authup's own client-web and any downstream
 * UI embedding client-web-kit. `builtIn` makes it auto-consent in the
 * /authorize flow and protects it from the API reserved-name guard.
 *
 * `grantTypes` is an enforced allowlist (`assertClientGrantAllowed` at the
 * /token grants and the /authorize code-request verifier; null = allow-all),
 * so it must list every flow the client uses. `redirectUri` and
 * `postLogoutRedirectUri` are each one `<origin>/**` wildcard per trusted
 * origin (matched by isSimpleMatch).
 *
 * The `scope` column is descriptive only. Scope authorization resolves
 * through the `auth_client_scopes` junction, which
 * `WebClientProvisioner.ensureForRealm` fills from
 * {@see WEB_CLIENT_SCOPE_NAMES}.
 */
export function buildWebClientAttributes(
    realm: Realm | { id: string },
    appOrigins: string[],
): Partial<Client> {
    const originPatterns = appOrigins.map((origin) => `${origin}/**`).join(',');

    return {
        name: CLIENT_WEB_NAME,
        realmId: realm.id,
        authMethod: ClientAuthMethod.NONE,
        tokenBindingMethod: ClientTokenBindingMethod.NONE,
        builtIn: true,
        active: true,
        grantTypes: 'authorization_code refresh_token',
        scope: WEB_CLIENT_SCOPE_NAMES.join(' '),
        redirectUri: originPatterns,
        postLogoutRedirectUri: originPatterns,
    };
}

export class WebClientProvisioner implements IWebClientProvisioner {
    protected clientRepository: IClientRepository;

    protected scopeRepository: IScopeRepository;

    protected clientScopeRepository: IClientScopeRepository;

    protected appOrigins: string[];

    protected logger?: Logger;

    constructor(ctx: WebClientProvisionerContext) {
        this.clientRepository = ctx.clientRepository;
        this.scopeRepository = ctx.scopeRepository;
        this.clientScopeRepository = ctx.clientScopeRepository;
        this.appOrigins = ctx.appOrigins;
        this.logger = ctx.logger;
    }

    async ensureForRealm(realm: Realm | { id: string }): Promise<void> {
        const client = await this.ensureClient(realm);

        // Always run, even when the attributes were already up to date: an
        // instance provisioned before the junction rows existed carries a
        // steady-state client with no scopes at all.
        await this.ensureScopes(client);
    }

    /**
     * Upsert the client row itself.
     *
     * `web` is a reserved client name (`CLIENT_RESERVED_NAMES`), so the row
     * belongs to the system whatever state it is in. A non-built-in one
     * predates the reservation and is taken over rather than left to shadow
     * the realm's login client.
     */
    protected async ensureClient(realm: Realm | { id: string }): Promise<Client> {
        const attributes = buildWebClientAttributes(realm, this.appOrigins);

        const existing = await this.clientRepository.findOneBy({
            name: CLIENT_WEB_NAME,
            realmId: realm.id,
        });

        if (existing) {
            // MERGE: refresh attributes (e.g. redirectUri) when config
            // changes. Dirty-check first — the attributes are deterministic
            // from config, so a steady-state boot would otherwise issue one
            // redundant UPDATE (bumping updatedAt) per realm.
            const isDirty = (Object.keys(attributes) as (keyof Client)[])
                .some((key) => existing[key] !== attributes[key]);
            if (!isDirty) {
                return existing;
            }

            let target = existing;

            if (!existing.builtIn) {
                if (this.logger) {
                    this.logger.warn(
                        `Taking over the non-built-in client named '${CLIENT_WEB_NAME}' in realm ${realm.id}: the name is reserved for the built-in web client.`,
                    );
                }

                // The takeover makes the client public, so a secret it carried
                // as a confidential client can never authenticate it again.
                // Drop it instead of leaving the material at rest.
                //
                // The row has to be re-read WITH the secret for that: `secret`
                // is a `select: false` column, so the loaded entity carries no
                // value for it and typeorm's changed-column diff would not
                // emit the null. Re-reading is confined to this branch, and
                // the secret stays out of `buildWebClientAttributes` for the
                // same reason (an undefined-vs-null compare would read as
                // dirty on every boot).
                target = await this.clientRepository.findOneWithSecret({ id: existing.id }) || existing;
                target.secret = null;
                target.secretHashed = false;
                target.secretEncrypted = false;
            }

            const merged = this.clientRepository.merge(target, attributes);

            return this.clientRepository.save(merged);
        }

        const entity = this.clientRepository.create(attributes);
        return this.clientRepository.save(entity);
    }

    /**
     * Bind the built-in global scopes through `auth_client_scopes`. That
     * junction is the only source the /authorize code-request verifier reads
     * scopes from.
     *
     * Additive like the attribute MERGE above: an extra scope an admin bound
     * by hand is left in place.
     */
    protected async ensureScopes(client: Client): Promise<void> {
        for (const name of WEB_CLIENT_SCOPE_NAMES) {
            const scope = await this.scopeRepository.findOneBy({
                name,
                realmId: null,
            });

            if (!scope) {
                if (this.logger) {
                    this.logger.warn(
                        `Skipping scope '${name}' for the web client of realm ${client.realmId}: the scope is not provisioned.`,
                    );
                }
                continue;
            }

            const existing = await this.clientScopeRepository.findOneBy({
                clientId: client.id,
                scopeId: scope.id,
            });

            if (existing) {
                continue;
            }

            await this.clientScopeRepository.save(this.clientScopeRepository.create({
                clientId: client.id,
                clientRealmId: client.realmId,
                scopeId: scope.id,
                scopeRealmId: scope.realmId,
            }));
        }
    }
}
