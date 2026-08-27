/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AccountConsoleSectionConfig } from './sections/account-console/index.ts';
import type { AdminConsoleSectionConfig } from './sections/admin-console/index.ts';
import type { AuthConsoleSectionConfig } from './sections/auth-console/index.ts';
import type { CoreConfig } from './sections/core/index.ts';
import type { RootConfig } from './sections/root/index.ts';
import type { ThemeConfig } from './sections/theme/index.ts';

/**
 * The WHOLE `authup.yml` document: every key an authup deployment
 * understands, exactly once.
 *
 * A service reads a SELECTION of it, never a declaration of its own, which is
 * what makes it impossible for a service to mis-declare a path, an environment
 * variable or a reader for a key another service also reads.
 */
export type AuthupConfig = RootConfig &
    ThemeConfig &
    CoreConfig &
    AuthConsoleSectionConfig &
    AdminConsoleSectionConfig &
    AccountConsoleSectionConfig;

/**
 * The keys with no static default: `publicUrl` is derived from a listener's
 * host and port, `db` falls back to typeorm-extension's driver default.
 */
export type AuthupConfigDerivedKey = 'publicUrl' | 'db';
