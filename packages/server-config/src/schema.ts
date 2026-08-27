/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import { ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA } from './account-console/index.ts';
import { ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA } from './admin-console/index.ts';
import { AUTH_CONSOLE_SECTION_CONFIG_SCHEMA } from './auth-console/index.ts';
import { CORE_CONFIG_SCHEMA } from './core/index.ts';
import type { ConfigEnvironmentVariableName } from './constants.ts';
import { DEPLOYMENT_CONFIG_SCHEMA } from './deployment/index.ts';
import { THEME_CONFIG_SCHEMA } from './theme/index.ts';
import type { AuthupConfig, AuthupConfigDerivedKey } from './types.ts';

/**
 * The whole document as one schema: the union of the six sections, and the
 * complete list of keys an operator may write.
 *
 * A plain merge is enough because every entry spells its own absolute `path`,
 * so nothing is left of the reading prefix a single section would need. That
 * is what lets a caller validate, describe or scan the whole document in one
 * pass: `authup config schema` prints this, and `authup config validate`
 * reports a path no entry here claims.
 *
 * The mapped `ConfigSchema` type is the exhaustiveness guard: a key of
 * {@link AuthupConfig} with no entry fails the build.
 */
export const CONFIG_SCHEMA : ConfigSchema<
    AuthupConfig,
    AuthupConfigDerivedKey,
    ConfigEnvironmentVariableName
> = {
    ...DEPLOYMENT_CONFIG_SCHEMA,
    ...THEME_CONFIG_SCHEMA,
    ...CORE_CONFIG_SCHEMA,
    ...AUTH_CONSOLE_SECTION_CONFIG_SCHEMA,
    ...ADMIN_CONSOLE_SECTION_CONFIG_SCHEMA,
    ...ACCOUNT_CONSOLE_SECTION_CONFIG_SCHEMA,
};
