/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';

export type MigrationGenerateCommandContext = {
    /**
     * Directory path where migrations should be placed.
     */
    directoryPath?: string,
    /**
     * Name of the migration class.
     */
    name?: string,
    /**
     * DataSource used for reference of existing schema.
     */
    dataSource: DataSource,

    /**
     * Timestamp in milliseconds.
     */
    timestamp?: number
};
