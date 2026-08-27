/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AccountConsoleSectionConfig } from './account-console/index.ts';
import type { AdminConsoleSectionConfig } from './admin-console/index.ts';
import type { AuthConsoleSectionConfig } from './auth-console/index.ts';
import type { CoreConfig } from './core/index.ts';
import type { DeploymentConfig } from './deployment/index.ts';
import type { ThemeConfig } from './theme/index.ts';

/**
 * The WHOLE `authup.yml` document: every key an authup deployment
 * understands, exactly once.
 *
 * A service reads a SELECTION of it, never a declaration of its own, which is
 * what makes it impossible for a service to mis-declare a path, an environment
 * variable or a reader for a key another service also reads.
 */
export type AuthupConfig = DeploymentConfig &
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
