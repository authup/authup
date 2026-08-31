/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineSchema } from '@authup/server-config-kit';
import {
    ACCOUNT_CONSOLE_SCHEMA,
} from './sections/account-console/index.ts';
import {
    ADMIN_CONSOLE_SCHEMA,
} from './sections/admin-console/index.ts';
import {
    AUTH_CONSOLE_SCHEMA,
} from './sections/auth-console/index.ts';
import { CORE_SCHEMA } from './sections/core/index.ts';
import type { EnvironmentVariable } from './constants.ts';
import { SECTION_KEY } from './constants.ts';
import { ROOT_SCHEMA } from './sections/root/index.ts';
import { THEME_SCHEMA } from './sections/theme/index.ts';
import type { AuthupConfig, AuthupConfigDerivedKey } from './types.ts';

/**
 * The whole document as one schema: the six sections, and the complete list
 * of keys an operator may write.
 *
 * The registry is SHAPED like the configuration object, so the four
 * qualified sections NEST under the key the document nests them at while the
 * root section spreads flat. That is what lets a section declare its keys in
 * one vocabulary (`url`, `port`, `host`) without three consoles colliding on
 * the same names, and it is why composing the passes over this registry is
 * `mergeSchemaData` rather than a spread.
 *
 * The DOCUMENT is described by path, not by that shape: every entry carries
 * an absolute `path` its section filled in, so the passes working in
 * document space (the file read, the unknown-path scan, the JSON Schema)
 * flatten the sections back out. That is what lets a caller validate,
 * describe or scan the whole document in one pass: `authup config schema`
 * prints this, and `authup config validate` reports a path no entry here
 * claims.
 *
 * The mapped `Schema` type is the exhaustiveness guard: a key of
 * {@link AuthupConfig} with no entry fails the build.
 */
export const SCHEMA = defineSchema<
    AuthupConfig,
    AuthupConfigDerivedKey,
    EnvironmentVariable
>({
    ...ROOT_SCHEMA,
    [SECTION_KEY.THEME]: THEME_SCHEMA,
    [SECTION_KEY.CORE]: CORE_SCHEMA,
    [SECTION_KEY.AUTH_CONSOLE]: AUTH_CONSOLE_SCHEMA,
    [SECTION_KEY.ADMIN_CONSOLE]: ADMIN_CONSOLE_SCHEMA,
    [SECTION_KEY.ACCOUNT_CONSOLE]: ACCOUNT_CONSOLE_SCHEMA,
});
