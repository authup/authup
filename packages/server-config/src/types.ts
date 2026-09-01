/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AccountConsoleConfig } from './sections/account-console/index.ts';
import type { AdminConsoleConfig } from './sections/admin-console/index.ts';
import type { AuthConsoleConfig } from './sections/auth-console/index.ts';
import type { CoreConfig } from './sections/core/index.ts';
import type { RootConfig } from './sections/root/index.ts';
import type { ThemeConfig } from './sections/theme/index.ts';
import type { ObjectLiteral } from '@authup/kit';
import type { SECTION_KEY } from './constants.ts';

export type ToObjectLiteral<T extends ObjectLiteral> = {
    [K in keyof T as `${K & string}`]: T[K];
};

/**
 * The WHOLE `authup.yml` document: every key an authup deployment
 * understands, exactly once.
 *
 * A service reads a SELECTION of it, never a declaration of its own, which is
 * what makes it impossible for a service to mis-declare a path, an environment
 * variable or a reader for a key another service also reads.
 *
 * The type NESTS one key per qualified section, mirroring the file it
 * describes: a section declares `host` and the entry's path says
 * `server.adminConsole.host`, so the three consoles keep one vocabulary
 * without colliding on the shared names. The predecessor flattened them
 * behind a derived qualifier (`adminConsoleHost`) to keep precedence a
 * single spread; precedence is `mergeSchemaData` now, which layers the
 * passes section-aware, so the qualifier bought nothing and the document and
 * the type read alike.
 */
export type AuthupConfig = ToObjectLiteral<
    RootConfig &
    {
        [SECTION_KEY.THEME]: ThemeConfig,
        [SECTION_KEY.CORE]: CoreConfig,
        [SECTION_KEY.AUTH_CONSOLE]: AuthConsoleConfig,
        [SECTION_KEY.ADMIN_CONSOLE]: AdminConsoleConfig,
        [SECTION_KEY.ACCOUNT_CONSOLE]: AccountConsoleConfig,
    }
>;

/**
 * The keys with no static default: `publicUrl` is derived from a listener's
 * host and port, `db` falls back to typeorm-extension's driver default.
 */
export type AuthupConfigDerivedKey = 'publicUrl' | 'db';
