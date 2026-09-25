/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Component } from '../../../components/index.ts';
import {
    createEventAggregatorComponent,
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
import { COMPONENT_OVERDUE_AFTER } from './constants.ts';
import type { ComponentsHealth, ComponentsModuleOptions } from './types.ts';

export class ComponentsModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected options: ComponentsModuleOptions;

    protected registry: { name: string, component: Component }[];

    protected startedAt: number | undefined;

    constructor(options: ComponentsModuleOptions = {}) {
        this.name = ModuleName.COMPONENTS;
        this.dependencies = [
            ModuleName.CONFIG,
            ModuleName.LOGGER,
            ModuleName.CACHE,
            ModuleName.DATABASE,
        ];
        this.options = options;
        this.registry = [];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const logger = container.resolve(LoggerInjectionKey);

        // worker mode requires it; the default mode follows the config, so an
        // API replica can hand the sweeps to a dedicated worker process.
        if (!config.worker.enabled) {
            if (this.options.required) {
                throw new Error('This process runs in worker mode, but core.worker.enabled is false. Set it to true for this process (WORKER_ENABLED=true), or start the API instead (`authup start` or `authup start core`), which runs the worker in process while the key is true.');
            }

            logger.info('The worker is disabled by configuration (core.worker.enabled: false).');
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

        // Rollups are counts of the rows the audit log writes, so they
        // exist exactly while it does, whatever the raw retention.
        if (config.eventLogEnabled) {
            registry.push({
                name: 'event-aggregator',
                component: createEventAggregatorComponent(
                    dataSource,
                    { retentionDays: config.eventLogAggregateRetentionDays },
                    logger,
                ),
            });
        }

        const components = registry.map((entry) => entry.component);
        this.registry = registry;
        this.startedAt = Date.now();

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

        const components = this.registry.map((entry) => entry.component);
        this.registry = [];
        this.startedAt = undefined;

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

    /**
     * A component is overdue once it has gone COMPONENT_OVERDUE_AFTER without
     * a successful pass, counted from setup until its first one. A sweep
     * that keeps failing is caught and retried inside the component, so this
     * is the only place such a worker stops looking healthy.
     */
    getHealth(now: number = Date.now()): ComponentsHealth {
        const components = this.registry.map((entry) => {
            const lastSuccessAt = entry.component.lastSuccessAt();
            const since = lastSuccessAt ?? this.startedAt ?? now;

            return {
                name: entry.name,
                lastSuccessAt: typeof lastSuccessAt === 'number' ? new Date(lastSuccessAt).toISOString() : null,
                overdue: now - since > COMPONENT_OVERDUE_AFTER,
            };
        });

        return {
            healthy: typeof this.startedAt === 'number' && components.every((component) => !component.overdue),
            components,
        };
    }
}
