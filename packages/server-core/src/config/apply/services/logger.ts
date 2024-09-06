/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LoggerCreateContext } from '@authup/server-kit';
import { createLogger, setLoggerFactory } from '@authup/server-kit';

export function applyConfigLogger(ctx: LoggerCreateContext): void {
    setLoggerFactory(() => createLogger(ctx));
}
