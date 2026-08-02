/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    CLIENT_WEB_NAME,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    ScopeName,
} from '@authup/core-kit';
import type { Client, Realm } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IClientScopeRepository } from '../client-scope/types.ts';
import type { IScopeRepository } from '../scope/types.ts';
import type { IClientRepository, ISystemClientProvisioner, SystemClientDefinition } from './types.ts';

export type SystemClientProvisionerContext = {
    clientRepository: IClientRepository;
    scopeRepository: IScopeRepository;
    clientScopeRepository: IClientScopeRepository;
    appOrigins: string[];
    logger?: Logger;
};

/**
 * The scopes every system client is granted.
 *
 * `global` lets the issued token drive the management API (parity with the
 * legacy password-grant admin login); `openid` yields the id-token.
 */
export const SYSTEM_CLIENT_SCOPE_NAMES: string[] = [
    ScopeName.GLOBAL,
    ScopeName.OPEN_ID,
];

/**
 * The public (PKCE) clients provisioned for every realm (plan 079):
 *
 * - `web` — downstream UIs embedding client-web-kit,
 * - `admin-console` — authup's own admin console (apps/client-admin-console),
 * - `account-console` — the account self-service surface (plan 080; the
 *   row is provisioned ahead of the surface — `web`'s `<origin>/**`
 *   patterns already cover every path it can redirect to, so an inert row
 *   adds no redirect surface).
 *
 * `displayName` is seeded at CREATE only and never re-asserted by the
 * MERGE, so an admin may relabel a client without the next boot undoing it.
 */
export const SYSTEM_CLIENT_DEFINITIONS: SystemClientDefinition[] = [
    {
        name: CLIENT_WEB_NAME,
        displayName: 'Web',
        scopeNames: SYSTEM_CLIENT_SCOPE_NAMES,
    },
    {
        name: CLIENT_ADMIN_CONSOLE_NAME,
        displayName: 'Admin Console',
        scopeNames: SYSTEM_CLIENT_SCOPE_NAMES,
    },
    {
        name: CLIENT_ACCOUNT_CONSOLE_NAME,
        displayName: 'Account Console',
        scopeNames: SYSTEM_CLIENT_SCOPE_NAMES,
    },
];

/**
 * Build the MERGE-owned attribute set for a realm's system client.
 *
 * `builtIn` makes the client auto-consent in the /authorize flow and
 * protects it from the API reserved-name guard.
 *
 * `grantTypes` is an enforced allowlist (`assertClientGrantAllowed` at the
 * /token grants and the /authorize code-request verifier; null = allow-all),
 * so it must list every flow the client uses. `redirectUri` and
 * `postLogoutRedirectUri` are each one `<origin>/**` wildcard per trusted
 * origin (matched by isSimpleMatch) — deliberately the shared app-origin
 * set for every definition: `redirectUri` is re-asserted on each boot, so a
 * separately-hosted surface (plan 078 "relocatable by choice") registers
 * its origin via TRUSTED_ORIGINS rather than editing the client row.
 *
 * The `scope` column is descriptive only. Scope authorization resolves
 * through the `auth_client_scopes` junction, which
 * `SystemClientProvisioner.ensureForRealm` fills from the definition's
 * `scopeNames`.
 *
 * `accessPolicyId` and `displayName` are deliberately NOT part of this set:
 * the MERGE must neither wipe an admin-bound access policy nor undo a
 * relabel.
 */
export function buildSystemClientAttributes(
    definition: SystemClientDefinition,
    realm: Realm | { id: string },
    appOrigins: string[],
): Partial<Client> {
    const originPatterns = appOrigins.map((origin) => `${origin}/**`).join(',');

    return {
        name: definition.name,
        realmId: realm.id,
        authMethod: ClientAuthMethod.NONE,
        tokenBindingMethod: ClientTokenBindingMethod.NONE,
        builtIn: true,
        active: true,
        grantTypes: 'authorization_code refresh_token',
        scope: definition.scopeNames.join(' '),
        redirectUri: originPatterns,
        postLogoutRedirectUri: originPatterns,
    };
}

export class SystemClientProvisioner implements ISystemClientProvisioner {
    protected clientRepository: IClientRepository;

    protected scopeRepository: IScopeRepository;

    protected clientScopeRepository: IClientScopeRepository;

    protected appOrigins: string[];

    protected logger?: Logger;

    constructor(ctx: SystemClientProvisionerContext) {
        this.clientRepository = ctx.clientRepository;
        this.scopeRepository = ctx.scopeRepository;
        this.clientScopeRepository = ctx.clientScopeRepository;
        this.appOrigins = ctx.appOrigins;
        this.logger = ctx.logger;
    }

    async ensureForRealm(realm: Realm | { id: string }): Promise<void> {
        for (const definition of SYSTEM_CLIENT_DEFINITIONS) {
            const client = await this.ensureClient(definition, realm);

            // Always run, even when the attributes were already up to date:
            // an instance provisioned before the junction rows existed
            // carries a steady-state client with no scopes at all.
            await this.ensureScopes(definition, client);
        }
    }

    /**
     * Upsert the client row itself.
     *
     * Every system client name is reserved (`CLIENT_RESERVED_NAMES`), so the
     * row belongs to the system whatever state it is in. A non-built-in one
     * predates the reservation and is taken over rather than left to shadow
     * the realm's system client.
     */
    protected async ensureClient(
        definition: SystemClientDefinition,
        realm: Realm | { id: string },
    ): Promise<Client> {
        const attributes = buildSystemClientAttributes(definition, realm, this.appOrigins);

        const existing = await this.clientRepository.findOneBy({
            name: definition.name,
            realmId: realm.id,
        });

        if (existing) {
            // MERGE: refresh attributes (e.g. redirectUri) when config
            // changes. Dirty-check first — the attributes are deterministic
            // from config, so a steady-state boot would otherwise issue one
            // redundant UPDATE (bumping updatedAt) per client and realm.
            const isDirty = (Object.keys(attributes) as (keyof Client)[])
                .some((key) => existing[key] !== attributes[key]);
            if (!isDirty) {
                return existing;
            }

            let target = existing;

            if (!existing.builtIn) {
                if (this.logger) {
                    this.logger.warn(
                        `Taking over the non-built-in client named '${definition.name}' in realm ${realm.id}: the name is reserved for a built-in system client.`,
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
                // the secret stays out of `buildSystemClientAttributes` for
                // the same reason (an undefined-vs-null compare would read as
                // dirty on every boot).
                target = await this.clientRepository.findOneWithSecret({ id: existing.id }) || existing;
                target.secret = null;
                target.secretHashed = false;
                target.secretEncrypted = false;
            }

            const merged = this.clientRepository.merge(target, attributes);

            return this.clientRepository.save(merged);
        }

        const entity = this.clientRepository.create({
            ...attributes,
            displayName: definition.displayName,
        });
        return this.clientRepository.save(entity);
    }

    /**
     * Bind the definition's scopes through `auth_client_scopes`. That
     * junction is the only source the /authorize code-request verifier reads
     * scopes from.
     *
     * Additive like the attribute MERGE above: an extra scope an admin bound
     * by hand is left in place.
     */
    protected async ensureScopes(definition: SystemClientDefinition, client: Client): Promise<void> {
        for (const name of definition.scopeNames) {
            const scope = await this.scopeRepository.findOneBy({
                name,
                realmId: null,
            });

            if (!scope) {
                if (this.logger) {
                    this.logger.warn(
                        `Skipping scope '${name}' for the ${definition.name} client of realm ${client.realmId}: the scope is not provisioned.`,
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
