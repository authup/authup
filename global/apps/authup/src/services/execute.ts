import { Container, EnvKey, deserializeKey } from '@authup/config';
import type { Key } from '@authup/config';
import chalk from 'chalk';
import consola from 'consola';
import process from 'node:process';
import type { ShellCommandExecContext } from '../utils';
import { execShellCommand } from '../utils';
import { isServiceValid } from './check';
import { buildWebAppExecutionContext } from './client-web';
import { buildServerCoreExecutionContext } from './server-core';

type ServicesCommandExecutionContext = {
    config?: string,
    command: string,
    services: string[],
    servicesAllowed?: string[]
};

type ServiceCommandExecutionContext = {
    command: string,
    service: string | Key,
    container: Container,
};

async function executeServiceCommand(
    context: ServiceCommandExecutionContext,
) {
    let service : Key;
    if (typeof context.service === 'string') {
        service = deserializeKey(context.service);
    } else {
        service = context.service;
    }

    const env : Record<string, any> = {};
    const config = context.container.get(`${service.group}/${service.name}`);
    if (config) {
        const paths = config.paths.join(',');
        if (paths.length > 0) {
            env[EnvKey.CONFIG_FILE] = paths;
        }
    }

    let shellExecContext : ShellCommandExecContext | undefined;
    try {
        if (
            service.group === 'server' &&
            service.name === 'core'
        ) {
            shellExecContext = buildServerCoreExecutionContext({
                command: context.command,
                env,
            });
        }

        if (
            service.group === 'client' &&
            service.name === 'web'
        ) {
            shellExecContext = buildWebAppExecutionContext({
                container: context.container,
                command: context.command,
                env,
            });
        }
    } catch (e) {
        consola.error(`${service.group}/${service.name}: The service command ${context.command} not supported.`);
        process.exit(1);
    }

    if (!shellExecContext) {
        consola.error(`${service.group}/${service.name}: The service is not supported.`);
        process.exit(1);
    }

    await execShellCommand({
        ...shellExecContext,
        logDataStream(line) {
            consola.info(`${service.group}/${service.name}: ${line}`);
        },
        logErrorStream(line) {
            consola.warn(`${service.group}/${service.name}: ${line}`);
        },
    });
}

export async function executeServicesCommand(
    context: ServicesCommandExecutionContext,
) {
    const container = new Container({
        prefix: 'authup',
        keys: context.servicesAllowed || context.services,
    });

    if (context.config) {
        await container.loadFromFilePath(context.config);
    } else {
        await container.load();
    }

    const promises : Promise<void>[] = [];
    for (let i = 0; i < context.services.length; i++) {
        const service = deserializeKey(context.services[i]);
        if (!isServiceValid(service)) {
            consola.error(`${chalk.red(`${service.group}/${service.name}`)}: The service does not exist.`);
            process.exit(1);
        }

        if (
            context.servicesAllowed &&
            context.servicesAllowed.indexOf(`${service.group}/${service.name}`) === -1
        ) {
            consola.error(`${chalk.red(`${service.group}/${service.name}`)}: The service does not support the ${context.command} command.`);
            process.exit(1);
        }

        promises.push(executeServiceCommand({
            command: context.command,
            service,
            container,
        }));
    }

    await Promise.all(promises);
}
