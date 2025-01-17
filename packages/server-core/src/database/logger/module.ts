/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { LogLevel, LogMessage } from 'typeorm';
import { AdvancedConsoleLogger } from 'typeorm';

/**
 * @see https://github.com/typeorm/typeorm/blob/master/src/logger/AdvancedConsoleLogger.ts
 */

export class DatabaseLogger extends AdvancedConsoleLogger {
    protected logger : Logger;

    constructor(logger : Logger) {
        super();

        this.logger = logger;
    }

    protected writeLog(
        level: LogLevel,
        logMessage: LogMessage | LogMessage[],
    ) {
        const messages = this.prepareLogMessages(logMessage);

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            switch (message.type ?? level) {
                case 'log':
                case 'schema-build':
                case 'migration':
                    this.logger.debug(`[DB]: ${message.message}`);
                    break;

                case 'info':
                case 'query':
                    this.logger.info(`[DB]: ${message.message}`);
                    break;

                case 'warn':
                case 'query-slow':
                    if (message.prefix) {
                        this.logger.warn(`[DB]: ${message.prefix} ${message.message}`);
                    } else {
                        this.logger.warn(`[DB]: ${message.message}`);
                    }
                    break;

                case 'error':
                case 'query-error':
                    if (message.prefix) {
                        this.logger.error(`[DB]: ${message.prefix} ${message.message}`);
                    } else {
                        this.logger.error(`[DB]: ${message.message}`);
                    }
                    break;
            }
        }
    }
}
