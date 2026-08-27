/*
 * Copyright (c) 2023-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import path from 'node:path';
import { AuthupError } from '@authup/errors';
import { EnvironmentName, base64ToArrayBuffer } from '@authup/kit';
import { buildSchemaDefaults } from '@authup/server-config-kit';
import {
    ACCOUNT_CONSOLE_SEGMENT,
    ADMIN_CONSOLE_SEGMENT,
    AUTH_CONSOLE_SEGMENT,
} from '../../../adapters/http/constants.ts';
import { toPublicHost } from '../../../utils/host.ts';
import { expandToOrigins } from '@authup/server-config';
import { parseConfig } from './parse.ts';
import { canonicalizeTrustProxy, canonicalizeTrustProxyListEntry } from './trust-proxy.ts';
import type { Config, ConfigInput } from './types.ts';
import { CONFIG_SCHEMA } from './constants.ts';

export async function normalizeConfig(input: ConfigInput = {}): Promise<Config> {
    const parsed = await parseConfig(input);

    const port = parsed.port ?? 3001;
    let host = parsed.host || '0.0.0.0';

    let publicUrl : string;
    if (parsed.publicUrl) {
        publicUrl = parsed.publicUrl;
    } else {
        const regex = /^([^:]+)(?::(\d+))?$/;
        const match = host.match(regex);
        if (match) {
            [, host] = match;
            publicUrl = `http://${toPublicHost(host)}:${match[2] || port}`;
        } else {
            publicUrl = `http://${toPublicHost(host)}:${port}`;
        }
    }

    const env = parsed.env || read('NODE_ENV', EnvironmentName.DEVELOPMENT);

    // publicUrl is the issuer: it signs into every token, every discovery
    // document, every mail deep link and every cookie scope. Derived from
    // host and port it reads http://<host>:<port>, which is right on a
    // laptop and wrong behind any proxy, and nothing downstream can tell
    // the two apart afterwards.
    if (env === EnvironmentName.PRODUCTION && !parsed.publicUrl) {
        // eslint-disable-next-line no-console
        console.warn(
            `[authup] publicUrl is not configured and was derived as ${publicUrl}. ` +
            'Set it to the URL the identity provider is reachable at.',
        );
    }

    // Canonicalize to bare origins (scheme://host[:port]) — a scheme-less
    // entry (e.g. `hub.local`) expands to both its http and https origin.
    // Downstream consumers (redirect allowlist, getAppOrigins) can rely on
    // every entry being a full origin. Building a fresh array also keeps a
    // repeated normalizeConfig() on the same input from accumulating the
    // dev origin into a security-sensitive allowlist.
    const trustedOrigins: string[] = [];
    for (const value of parsed.trustedOrigins ?? []) {
        for (const origin of expandToOrigins(value)) {
            if (!trustedOrigins.includes(origin)) {
                trustedOrigins.push(origin);
            }
        }
    }

    // In non-production (development & test) client-admin-console runs on :3000 while
    // the API (publicUrl) runs on :3001. Seed :3000 into the trusted origins
    // so the redirect allowlist (<origin>/**) and CORS accept logins from the
    // dev UI out of the box; otherwise the realm-selection login is dead on
    // first run.
    if (env !== EnvironmentName.PRODUCTION) {
        const devOrigin = 'http://localhost:3000';
        if (!trustedOrigins.includes(devOrigin)) {
            trustedOrigins.push(devOrigin);
        }
    }

    const config : Config = {
        ...buildSchemaDefaults(CONFIG_SCHEMA),
        publicUrl,
        ...parsed,

        // After the spread so the canonicalized + dev-seeded list wins over
        // the raw parsed list (parsed.trustedOrigins is merged in above).
        trustedOrigins,
    } as Config;

    // After the spread, so a relative value supplied by any config surface
    // is resolved. Every consumer then receives an absolute path and none
    // of them has to care what the process cwd was.
    config.writableDirectoryPath = path.resolve(
        config.rootPath,
        config.writableDirectoryPath || 'writable',
    );

    // The single-origin default: each console service is served under
    // publicUrl at the segment its bundle is built for, which is where the
    // proxy routes /console/** in a split deployment too. An operator only
    // sets these when a console lives under a path of its own.
    //
    // The derivation is spelled here rather than as the key's default,
    // because a default cannot read another key. Each console service
    // derives the same value from the same key when it resolves its own
    // configuration.
    const publicUrlTrimmed = config.publicUrl.replace(/\/+$/, '');

    if (!config.authConsoleUrl) {
        config.authConsoleUrl = `${publicUrlTrimmed}/${AUTH_CONSOLE_SEGMENT}`;
    }

    if (!config.accountConsoleUrl) {
        config.accountConsoleUrl = `${publicUrlTrimmed}/${ACCOUNT_CONSOLE_SEGMENT}`;
    }

    if (!config.adminConsoleUrl) {
        config.adminConsoleUrl = `${publicUrlTrimmed}/${ADMIN_CONSOLE_SEGMENT}`;
    }

    // Canonicalize the string form on EVERY config surface (env, .conf,
    // file, programmatic) — proxy-addr accepts single-integer "long value"
    // IPv4 notation, so an un-canonicalized `trustProxy: "1"` would silently
    // compile to an allowlist of `0.0.0.1` instead of one trusted hop.
    if (typeof config.trustProxy === 'string') {
        config.trustProxy = canonicalizeTrustProxy(config.trustProxy);
    } else if (Array.isArray(config.trustProxy)) {
        config.trustProxy = config.trustProxy.map(canonicalizeTrustProxyListEntry);
    }

    // fail loud at boot: a console on another ORIGIN is a deliberate
    // non-goal, and it half-works rather than failing on its own. The static
    // consoles authenticate with a `SameSite=Strict` credential this server
    // issues and re-checks with `Sec-Fetch-Site: same-origin`, so a foreign
    // origin can never sign in; the auth console holds the browser session
    // every prompt=none decision reads, so moving it off the issuer's origin
    // breaks silent authentication. Another PATH is fully supported and is
    // what this key is for. Different domains are the named stage-G
    // follow-up, and turning this into a warning is not the way to get them:
    // WebAuthn origins, the federated-login cookie and credentialed CORS all
    // have to move together.
    for (const key of ['authConsoleUrl', 'accountConsoleUrl', 'adminConsoleUrl'] as const) {
        if (new URL(config[key]).origin !== new URL(config.publicUrl).origin) {
            throw new AuthupError(
                `${key} is ${config[key]}, which is not the origin of publicUrl (${config.publicUrl}). ` +
                'A console may be served under a path of its own, but not under a domain of its own.',
            );
        }
    }

    // fail loud at boot: the throttle counts loginFailed rows in
    // auth_events — with the audit log disabled it would silently no-op.
    if (config.loginAttemptThrottleEnabled && !config.eventLogEnabled) {
        throw new AuthupError('loginAttemptThrottleEnabled requires eventLogEnabled.');
    }

    if (config.mfaRequired && !config.mfaEnabled) {
        throw new AuthupError('mfaRequired requires mfaEnabled.');
    }

    if (config.mtlsPublicUrl && config.certificateSource === 'disabled') {
        throw new AuthupError('mtlsPublicUrl requires certificateSource to be enabled.');
    }

    // fail loud at boot rather than at first key-store access: wrapped key
    // material must never be minted under a malformed KEK. Validate the
    // DECODED length here (not just base64 shape) so a whitespace / invalid /
    // wrong-length key fails at config time, not asynchronously inside the
    // cipher at first wrap/unwrap.
    if (config.secretsEncryptionKey) {
        let byteLength = -1;
        try {
            byteLength = base64ToArrayBuffer(config.secretsEncryptionKey.trim()).byteLength;
        } catch {
            // fall through — treated as invalid below
        }
        if (byteLength !== 32) {
            throw new AuthupError('secretsEncryptionKey must decode to exactly 32 bytes (base64).');
        }
    }

    return config;
}
