/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config as AccountConsoleConfig } from '@authup/server-account-console';
import type { Config as AdminConsoleConfig } from '@authup/server-admin-console';
import type { Config as AuthConsoleConfig } from '@authup/server-auth-console';
import type { Application } from 'orkos';

export type ConsoleConfigs = {
    auth: AuthConsoleConfig,
    admin: AdminConsoleConfig,
    account: AccountConsoleConfig,
};

export type ConsoleApplication = {
    path: string,
    application: Application,
};
