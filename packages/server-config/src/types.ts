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
import type { CONFIG_SECTION_KEY } from './constants.ts';

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
 * The keys are FLAT and section-qualified, while the file they describe is
 * nested: a section declares `host`, the document says `adminConsoleHost` and
 * the entry's path says `server.adminConsole.host`. Flat is what keeps
 * precedence a single spread (environment over file over default), and the
 * qualifier is derived from the section rather than declared, so no section
 * carries a name that belongs to the merge.
 */
export type AuthupConfig = ToObjectLiteral<
    RootConfig &
    {
        [CONFIG_SECTION_KEY.THEME]: ThemeConfig,
        [CONFIG_SECTION_KEY.CORE]: CoreConfig,
        [CONFIG_SECTION_KEY.AUTH_CONSOLE]: AuthConsoleConfig,
        [CONFIG_SECTION_KEY.ADMIN_CONSOLE]: AdminConsoleConfig,
        [CONFIG_SECTION_KEY.ACCOUNT_CONSOLE]: AccountConsoleConfig,
    }
>;

/**
 * The keys with no static default: `publicUrl` is derived from a listener's
 * host and port, `db` falls back to typeorm-extension's driver default.
 */
export type AuthupConfigDerivedKey = 'publicUrl' | 'db';
