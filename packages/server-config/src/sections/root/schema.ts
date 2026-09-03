/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import process from 'node:process';
import { EnvironmentName, isObject } from '@authup/kit';
import {
    defineSchema,
    readEnvArray,
    readEnvBoolOrString,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { derivePublicUrl, expandToOrigins, resolveTrustedOrigins  } from '../../helpers/index.ts';
import { DEFAULT_HOST_PATH, EnvironmentVariable } from '../../constants.ts';
import type {
    DatabaseConnectionOptions,
    RedisConnectionOptions,
    RootConfig,
    SMTPConnectionOptions,
} from './types.ts';

/**
 * The connection keys are checked with `isObject` alone: they are handed to a
 * third-party client that owns their real shape, and a stricter check here
 * would reject options authup never has to know about.
 */
const serviceType = z.string()
    .or(z.boolean())
    .or(z.custom<Record<string, any>>((value) => isObject(value)));

/**
 * The deployment-wide keys, at the ROOT of `authup.yml`.
 *
 * `publicUrl`, `internalUrl` and `db` carry no default on purpose: the first
 * is derived from host and port by whoever owns a listener, the second from
 * the first, and the third falls back to typeorm-extension's driver default.
 */
export const ROOT_SCHEMA = defineSchema<RootConfig, 'publicUrl' | 'internalUrl' | 'db', EnvironmentVariable>({
    env: {
        type: z.string(),
        default: () => read('NODE_ENV', EnvironmentName.DEVELOPMENT),
        description: 'Application environment, e.g. production or development.',
        path: 'env',
        env: EnvironmentVariable.NODE_ENV,
        readEnv: readEnvString,
    },
    rootPath: {
        type: z.string(),
        default: () => process.cwd(),
        path: 'rootPath',
        description: 'Root directory every relative path key resolves against.',
    },
    defaultHost: {
        type: z.string(),
        default: '0.0.0.0',
        description: 'Default host address every listener this deployment starts binds: server-core and each console service, unless its own section names one. ' +
            'HOST sets it for all of them at once.',
        path: DEFAULT_HOST_PATH,
        env: EnvironmentVariable.HOST,
        readEnv: readEnvString,
    },
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        // Derived from the core listener keys when the document spells none.
        // Both are DOCUMENT keys, not facts about whichever process is
        // asking, so a console computes the identical issuer with no
        // server-core anywhere. That is what lets a console stand alone.
        resolve: ({ value, get }) => derivePublicUrl(
            value as string | undefined,
            get('core.host') as string,
            get('core.port') as number,
            get('env') as string,
        ),
        env: EnvironmentVariable.PUBLIC_URL,
        readEnv: readEnvString,
    },
    internalUrl: {
        type: z.url(),
        description: 'Base URL a service inside the deployment reaches the API at, e.g. http://authup:3000 on a cluster network. ' +
            'Used for server-side calls only (the auth console renders its pages from the API); publicUrl stays the issuer and the address handed to the browser. Defaults to publicUrl.',
        path: 'internalUrl',
        // Falls back to the public address, which is right whenever the
        // deployment answers at one address from both sides. It resolves
        // rather than defaults because `publicUrl` is itself derived, and a
        // static default cannot read another key.
        resolve: ({ value, get }) => (value as string | undefined) || get('publicUrl') as string,
        env: EnvironmentVariable.INTERNAL_URL,
        readEnv: readEnvString,
    },
    trustedOrigins: {
        type: z.array(z.string().refine((value) => {
            try {
                expandToOrigins(value);
                return true;
            } catch {
                return false;
            }
        }, 'must be a http(s) origin or a bare host[:port]')),
        default: [],
        description: 'Trusted first-party app origins besides publicUrl, used as redirect targets for the per-realm public system clients; entries are http(s) origins or bare hosts (a bare host expands to its http and https origin) and do not drive CORS. ' +
            'SECURITY: the system clients auto-consent with the global scope, so every origin listed here can obtain a full-permission user token in every realm.',
        path: 'trustedOrigins',
        // Canonicalized where the key is declared, so every reader gets bare
        // origins: server-core builds its client redirect allowlist from this
        // and the account console matches its `ref` back link against it, and
        // neither may depend on the other having normalized first.
        resolve: ({ value, get }) => resolveTrustedOrigins(value as string[] | undefined, get('env') as string),
        env: EnvironmentVariable.TRUSTED_ORIGINS,
        readEnv: readEnvArray,
    },
    // The DB_* variables come from typeorm-extension
    // (hasEnvDataSourceOptions / readDataSourceOptionsFromEnv) and stay
    // special-cased in server-core's environment read, outside the registry.
    db: {
        type: z.custom<DatabaseConnectionOptions>((value) => isObject(value)),
        description: 'Database connection (TypeORM data source options). Without one, and outside production, the better-sqlite3 driver default applies.',
        path: 'db',
    },
    redis: {
        type: serviceType as z.ZodType<RedisConnectionOptions>,
        default: false,
        description: 'Redis connection: a connection URL, client options, an existing client, or a boolean to use the default connection or run without Redis.',
        path: 'redis',
        env: EnvironmentVariable.REDIS,
        readEnv: readEnvBoolOrString,
    },
    smtp: {
        type: serviceType as z.ZodType<SMTPConnectionOptions>,
        default: false,
        description: 'SMTP transport for outgoing mail: a connection URL, transport options, or a boolean to use the default transport or run without mail.',
        path: 'smtp',
        env: EnvironmentVariable.SMTP,
        readEnv: readEnvBoolOrString,
    },
});
