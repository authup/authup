/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup, isSafeRedirectURLScheme, patternHasGlobstarInAuthority } from '@authup/kit';
import type { Client } from './entity';
import { isClientNameValid } from './helpers';
import { ClientAuthMethod, ClientTokenBindingMethod } from './constants';

/**
 * Schema for a comma separated list of redirect patterns.
 *
 * Each element must be a URL with a scheme a redirect may carry
 * (`isSafeRedirectURLScheme`: no `javascript:` and friends, since a
 * non-http(s) target is navigated client-side), none may place a `**` in
 * its authority, and none may carry userinfo: the matcher canonicalizes a pattern too, dropping
 * its userinfo, so `https://u:p@app/**` would silently accept the bare origin
 * while reading as if it required credentials. Refusing it makes the
 * registration say what it matches.
 * `**` matches the rest of the value outright, so `https://**.example.com/**`
 * reads as "any subdomain of example.com" but accepts every origin, which
 * would make the allowlist meaningless. A single `*` stays supported: the
 * matcher canonicalizes the candidate first, so a host wildcard cannot reach
 * past the authority.
 */
function buildRedirectPatternSchema(name: string) {
    return z
        .string()
        .check((ctx) => {
            const validator = z.url();
            const urls = ctx.value.split(',');
            for (const url of urls) {
                try {
                    validator.parse(url);
                } catch (e) {
                    ctx.issues.push({
                        input: url,
                        code: 'custom',
                        message: e instanceof Error ? e.message : `The ${name} is not valid.`,
                    });

                    continue;
                }

                if (patternHasGlobstarInAuthority(url)) {
                    ctx.issues.push({
                        input: url,
                        code: 'custom',
                        message: `The ${name} must not use ** in the host, it would match every origin. Use a single * for a host wildcard.`,
                    });
                }

                const parsed = new URL(url);
                if (parsed.username || parsed.password) {
                    ctx.issues.push({
                        input: url,
                        code: 'custom',
                        message: `The ${name} must not carry userinfo.`,
                    });
                }

                if (!isSafeRedirectURLScheme(url)) {
                    ctx.issues.push({
                        input: url,
                        code: 'custom',
                        message: `The ${name} scheme is not allowed.`,
                    });
                }
            }
        })
        .nullable();
}

/**
 * Schema for the back-channel logout endpoint. The server POSTs to it, so it
 * is ONE absolute http(s) URL: no wildcard, no userinfo, and no comma in the
 * host or path. A redirect-style pattern list pasted here parses as a single
 * URL whose path carries the comma and the second entry, and the server would
 * POST to that verbatim. A comma in the query string stays allowed, since
 * that is a legitimate part of one URL. `z.url()` alone accepts every
 * parseable scheme, `javascript:` included, so the scheme is allow-listed
 * here rather than denied.
 */
const backchannelLogoutUriSchema = z
    .url()
    .check((ctx) => {
        let parsed: URL;
        try {
            parsed = new URL(ctx.value);
        } catch {
            return;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The backchannelLogoutUri must be an http(s) URL.',
            });
        }

        if (parsed.username || parsed.password) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The backchannelLogoutUri must not carry userinfo.',
            });
        }

        if (ctx.value.includes('*')) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The backchannelLogoutUri must be a single endpoint, not a pattern.',
            });
        }

        if (parsed.host.includes(',') || parsed.pathname.includes(',')) {
            ctx.issues.push({
                input: ctx.value,
                code: 'custom',
                message: 'The backchannelLogoutUri must be a single endpoint, not a comma separated list.',
            });
        }
    })
    .nullable();

export class ClientValidator extends Container<Client> {
    protected override initialize() {
        super.initialize();

        // ----------------------------------------------

        this.mount(
            'active',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'authMethod',
            { optional: true },
            createValidator(z.enum(ClientAuthMethod)),
        );

        this.mount(
            'tokenBindingMethod',
            { optional: true },
            createValidator(z.enum(ClientTokenBindingMethod)),
        );

        // ----------------------------------------------

        const nameValidator = createValidator(
            z
                .string()
                .trim()
                .toLowerCase()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isClientNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The client name is not valid.',
                        });
                    }
                }),
        );

        this.mount(
            'name',
            { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] },
            nameValidator,
        );
        this.mount(
            'name',
            {
                group: ValidatorGroup.UPDATE,
                optional: true,
            },
            nameValidator,
        );

        this.mount(
            'displayName',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(z.string().min(3).max(4096).nullable()),
        );

        // ----------------------------------------------

        this.mount(
            'secret',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'secretEncrypted',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'secretHashed',
            { optional: true },
            createValidator(z.boolean()),
        );

        // ----------------------------------------------

        this.mount(
            'redirectUri',
            { optional: true },
            createValidator(buildRedirectPatternSchema('redirectUri')),
        );

        this.mount(
            'postLogoutRedirectUri',
            { optional: true },
            createValidator(buildRedirectPatternSchema('postLogoutRedirectUri')),
        );

        this.mount(
            'backchannelLogoutUri',
            { optional: true },
            createValidator(backchannelLogoutUriSchema),
        );

        this.mount(
            'baseUrl',
            { optional: true },
            createValidator(
                z.url().nullable(),
            ),
        );

        this.mount(
            'grantTypes',
            { optional: true },
            createValidator(z.string().min(3).max(512).nullable()),
        );

        this.mount(
            'accessPolicyId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        // ----------------------------------------------

        // A client keeps the realm it was created in. UPDATE deliberately has
        // no mount, so a submitted realmId is stripped instead of moving the
        // row: the junction tables (client_role.client_realm_id,
        // client_permission.client_realm_id, client_scope.client_realm_id)
        // denormalize the realm, and a move would strand all of them in the
        // old realm.
        this.mount(
            'realmId',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid()),
        );

        // deliberately NOT mounted for CREATE/UPDATE — no API caller may
        // self-assign builtIn; only provisioned entities carry it
        this.mount(
            'builtIn',
            {
                group: ValidatorGroup.PROVISIONING,
                optional: true,
            },
            createValidator(z.boolean()),
        );
    }
}
