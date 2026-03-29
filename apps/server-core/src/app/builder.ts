/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from './module.ts';
import type { IApplication } from './types.ts';
import type { IModule } from 'orkos';
import {
    AuthenticationModule,
    CacheModule,
    ComponentsModule,
    ConfigModule,
    DatabaseModule,
    HTTPModule,
    IdentityModule,
    LdapModule,
    LoggerModule,
    MailModule,
    ModuleName,
    OAuth2Module,
    ProvisionerModule,
    RuntimeModule,
    SwaggerModule,
    VaultModule,
} from './modules/index.ts';

type ModuleSlot = IModule | false | undefined;

type ModuleFactory = () => IModule;

const defaultFactories: Record<string, ModuleFactory> = {
    [ModuleName.CONFIG]: () => new ConfigModule(),
    [ModuleName.LOGGER]: () => new LoggerModule(),
    [ModuleName.CACHE]: () => new CacheModule(),
    [ModuleName.MAIL]: () => new MailModule(),
    [ModuleName.VAULT]: () => new VaultModule(),
    [ModuleName.RUNTIME]: () => new RuntimeModule(),
    [ModuleName.SWAGGER]: () => new SwaggerModule(),
    [ModuleName.DATABASE]: () => new DatabaseModule(),
    [ModuleName.PROVISIONING]: () => new ProvisionerModule(),
    [ModuleName.LDAP]: () => new LdapModule(),
    [ModuleName.AUTHENTICATION]: () => new AuthenticationModule(),
    [ModuleName.IDENTITY]: () => new IdentityModule(),
    [ModuleName.OAUTH2]: () => new OAuth2Module(),
    [ModuleName.COMPONENTS]: () => new ComponentsModule(),
    [ModuleName.HTTP]: () => new HTTPModule(),
};

export class ApplicationBuilder {
    protected slots: Map<string, ModuleSlot>;

    constructor() {
        this.slots = new Map();
    }

    // ----------------------------------------------------

    withConfig(instance?: ConfigModule | false): this {
        return this.set(ModuleName.CONFIG, instance);
    }

    withLogger(instance?: LoggerModule | false): this {
        return this.set(ModuleName.LOGGER, instance);
    }

    withCache(instance?: CacheModule | false): this {
        return this.set(ModuleName.CACHE, instance);
    }

    withMail(instance?: MailModule | false): this {
        return this.set(ModuleName.MAIL, instance);
    }

    withVault(instance?: VaultModule | false): this {
        return this.set(ModuleName.VAULT, instance);
    }

    withRuntime(instance?: RuntimeModule | false): this {
        return this.set(ModuleName.RUNTIME, instance);
    }

    withSwagger(instance?: SwaggerModule | false): this {
        return this.set(ModuleName.SWAGGER, instance);
    }

    withDatabase(instance?: DatabaseModule | false): this {
        return this.set(ModuleName.DATABASE, instance);
    }

    withProvisioning(instance?: ProvisionerModule | false): this {
        return this.set(ModuleName.PROVISIONING, instance);
    }

    withLdap(instance?: LdapModule | false): this {
        return this.set(ModuleName.LDAP, instance);
    }

    withAuthentication(instance?: AuthenticationModule | false): this {
        return this.set(ModuleName.AUTHENTICATION, instance);
    }

    withIdentity(instance?: IdentityModule | false): this {
        return this.set(ModuleName.IDENTITY, instance);
    }

    withOAuth2(instance?: OAuth2Module | false): this {
        return this.set(ModuleName.OAUTH2, instance);
    }

    withComponents(instance?: ComponentsModule | false): this {
        return this.set(ModuleName.COMPONENTS, instance);
    }

    withHTTP(instance?: HTTPModule | false): this {
        return this.set(ModuleName.HTTP, instance);
    }

    // ----------------------------------------------------

    buildModules(): IModule[] {
        const modules: IModule[] = [];

        this.slots.forEach((slot, name) => {
            if (slot === false) {
                return;
            }

            if (slot) {
                modules.push(slot);
                return;
            }

            const factory = defaultFactories[name];
            if (factory) {
                modules.push(factory());
            }
        });

        return modules;
    }

    build(): IApplication {
        return new Application(this.buildModules());
    }

    // ----------------------------------------------------

    protected set(name: string, instance?: IModule | false): this {
        if (instance === false) {
            this.slots.set(name, false);
        } else if (instance) {
            this.slots.set(name, instance);
        } else {
            this.slots.set(name, undefined);
        }

        return this;
    }
}
