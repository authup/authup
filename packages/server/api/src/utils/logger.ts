/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { createLogger, format, transports } from 'winston';

export function setupLogger(directory: string) {
    return createLogger({
        format: format.combine(
            format.timestamp(),
            format.json(),
        ),
        transports: [
            new transports.Console({
                level: 'debug',
            }),
            new transports.File({
                filename: path.join(directory, 'error.log'),
                level: 'warn',
            }),
        ],
    });
}
