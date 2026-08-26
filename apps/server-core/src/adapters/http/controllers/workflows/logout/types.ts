/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IOAuth2EndSessionService } from '../../../../../core/index.ts';

export type LogoutControllerOptions = {
    authConsoleUrl: string,
};

export type LogoutControllerContext = {
    options: LogoutControllerOptions,
    endSessionService: IOAuth2EndSessionService,
};
