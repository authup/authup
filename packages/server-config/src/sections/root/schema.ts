/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import process from 'node:process';
import { EnvironmentName, isObject } from '@authup/kit';
import type { ConfigSchema } from '@authup/server-config-kit';
import {
    readEnvArray,
    readEnvBoolOrString,
    readEnvString,
} from '@authup/server-config-kit';
import { z } from 'zod';
import { DEFAULT_HOST_CONFIG_PATH, EnvironmentVariable } from '../../constants.ts';
import { expandToOrigins } from '../../helpers/index.ts';
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
 * `publicUrl` and `db` carry no default on purpose: the first is derived from
 * host and port by whoever owns a listener, the second falls back to
 * typeorm-extension's driver default.
 */
export const ROOT_CONFIG_SCHEMA = {
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
            'The environment equivalent is HOST, which server.core.host declares and every console falls back to.',
        path: DEFAULT_HOST_CONFIG_PATH,
    },
    publicUrl: {
        type: z.url(),
        description: 'Externally reachable base URL of the API. Derived from host and port when unset.',
        path: 'publicUrl',
        env: EnvironmentVariable.PUBLIC_URL,
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
        env: EnvironmentVariable.TRUSTED_ORIGINS,
        readEnv: readEnvArray,
    },
    // The DB_* variables come from typeorm-extension
    // (hasEnvDataSourceOptions / readDataSourceOptionsFromEnv) and stay
    // special-cased in server-core's environment read, outside the registry.
    db: {
        type: z.custom<DatabaseConnectionOptions>((value) => isObject(value)),
        description: 'Database connection (TypeORM data source options). Without one the better-sqlite3 driver default of typeorm-extension applies.',
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
    } satisfies ConfigSchema<RootConfig, 'publicUrl' | 'db', EnvironmentVariable>,
};
