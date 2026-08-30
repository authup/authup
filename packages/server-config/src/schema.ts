/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigSchema } from '@authup/server-config-kit';
import {
    ACCOUNT_CONSOLE_CONFIG_SCHEMA,
} from './sections/account-console/index.ts';
import {
    ADMIN_CONSOLE_CONFIG_SCHEMA,
} from './sections/admin-console/index.ts';
import {
    AUTH_CONSOLE_CONFIG_SCHEMA,
} from './sections/auth-console/index.ts';
import { CORE_CONFIG_SCHEMA } from './sections/core/index.ts';
import type { EnvironmentVariable } from './constants.ts';
import { CONFIG_SECTION_KEY } from './constants.ts';
import { ROOT_CONFIG_SCHEMA } from './sections/root/index.ts';
import { THEME_CONFIG_SCHEMA } from './sections/theme/index.ts';
import type { AuthupConfig, AuthupConfigDerivedKey } from './types.ts';

/**
 * The whole document as one schema: the union of the six sections, and the
 * complete list of keys an operator may write.
 *
 * A plain merge is enough because every entry carries its own absolute
 * `path` (its section filled it in) and every key its section's qualifier,
 * so nothing collides and no reading prefix is left over. That
 * is what lets a caller validate, describe or scan the whole document in one
 * pass: `authup config schema` prints this, and `authup config validate`
 * reports a path no entry here claims.
 *
 * The mapped `ConfigSchema` type is the exhaustiveness guard: a key of
 * {@link AuthupConfig} with no entry fails the build.
 */
export const CONFIG_SCHEMA = {
    ...ROOT_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.THEME]: THEME_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.CORE]: CORE_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.AUTH_CONSOLE]: AUTH_CONSOLE_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.ADMIN_CONSOLE]: ADMIN_CONSOLE_CONFIG_SCHEMA,
    [CONFIG_SECTION_KEY.ACCOUNT_CONSOLE]: ACCOUNT_CONSOLE_CONFIG_SCHEMA,
} satisfies ConfigSchema<
    AuthupConfig,
    AuthupConfigDerivedKey,
    EnvironmentVariable
>;
