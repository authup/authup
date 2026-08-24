/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components/index.ts';
import {
    createEventCleanerComponent,
    createOAuth2CleanerComponent,
} from '../../../components/index.ts';
import { CacheInjectionKey } from '../cache/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { IContainer } from 'eldin';
import type { ComponentsModuleOptions } from './types.ts';

export class ComponentsModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected options: ComponentsModuleOptions;

    protected components: Component[];

    constructor(options: ComponentsModuleOptions = {}) {
        this.name = ModuleName.COMPONENTS;
        this.dependencies = [
            ModuleName.CONFIG,
            ModuleName.LOGGER,
            ModuleName.CACHE,
            ModuleName.DATABASE,
        ];
        this.options = options;
        this.components = [];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const logger = container.resolve(LoggerInjectionKey);

        // the worker role forces them on; every other role follows the
        // config, so an API replica can hand the sweeps to that worker.
        if (!this.options.force && !config.componentsEnabled) {
            logger.info('Background components are disabled by configuration.');
            return;
        }

        const cache = container.resolve(CacheInjectionKey);

        // Name and component travel together so the boot log can never drift
        // from what was actually registered.
        const registry: { name: string, component: Component }[] = [
            {
                name: 'oauth2-cleaner',
                component: createOAuth2CleanerComponent(dataSource, cache, logger),
            },
        ];

        // The sweep only exists when rows are written AND at least one row
        // family carries an expiry — security events (eventLogRetentionDays)
        // and entity-CRUD events (eventLogEntityRetentionDays) are stamped
        // independently, so either non-zero retention needs the cleaner.
        const securitySweep = config.eventLogRetentionDays > 0;
        const entitySweep = config.eventLogEntityEnabled && config.eventLogEntityRetentionDays > 0;
        if (config.eventLogEnabled && (securitySweep || entitySweep)) {
            registry.push({
                name: 'event-cleaner',
                component: createEventCleanerComponent(dataSource, logger),
            });
        }

        const components = registry.map((entry) => entry.component);
        this.components = components;

        // start() is deliberately fire-and-forget, so a rejection must be
        // caught here — an unhandled rejection is fatal on modern node.
        components.forEach((component) => {
            component.start().catch((e) => {
                logger.error('Starting a background component failed.');
                logger.error(e);
            });
        });

        // Info level, and the only line a healthy process writes about this:
        // the sweeps log nothing per tick, the production console transport
        // is info, and a worker whose whole job is these components would
        // otherwise boot silent.
        logger.info(`Background components started: ${registry.map((entry) => entry.name).join(', ')}.`);
    }

    async teardown(container: IContainer): Promise<void> {
        const logger = container.tryResolve(LoggerInjectionKey);

        const { components } = this;
        this.components = [];

        for (const component of components) {
            try {
                await component.stop();
            } catch (e) {
                if (logger.success) {
                    logger.data.warn('Stopping a background component failed.');
                    logger.data.warn(e);
                }
            }
        }
    }

    // ----------------------------------------------------
}
