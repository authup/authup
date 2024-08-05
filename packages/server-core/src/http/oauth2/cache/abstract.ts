/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError, hasOwnProperty } from '@authup/kit';
import type { RedisClient } from '@authup/server-kit';
import {
    RedisJsonAdapter, buildRedisKeyPath, isRedisClientUsable, useRedisClient,
} from '@authup/server-kit';

export abstract class OAuth2AbstractCache<
    T extends Record<string, any> & { id: string, expires?: Date | string | number },
> {
    protected prefix: string;

    protected client : RedisClient | undefined;

    protected clientJsonAdapter : RedisJsonAdapter | undefined;

    protected constructor(prefix: string) {
        this.prefix = prefix;
    }

    async set(entity: T) : Promise<void> {
        const driver = await this.useDriver();
        if (!driver) {
            return;
        }

        const date = this.toDate(entity.expires);

        await driver.set(
            this.buildKeyPath(entity.id),
            entity,
            { milliseconds: date.getTime() - Date.now() },
        );
    }

    async drop(id: T['id']) : Promise<void> {
        const driver = await this.useDriver();
        if (!driver) {
            await this.deleteDBEntity(id);
            return;
        }

        await driver.drop(this.buildKeyPath(id));
        await this.deleteDBEntity(id);
    }

    async get(id: T['id']) : Promise<T> {
        let entity : T;

        const driver = await this.useDriver();
        if (!driver) {
            entity = await this.loadDBEntity(id);

            if (await this.isExpired(entity)) {
                throw TokenError.expired();
            }

            return entity;
        }

        entity = await driver.get(this.buildKeyPath(id));

        if (!entity) {
            entity = await this.loadDBEntity(id);
            await this.set(entity);
        }

        if (await this.isExpired(entity)) {
            throw TokenError.expired();
        }

        return entity;
    }

    protected async isExpired(entity: T) : Promise<boolean> {
        if (
            hasOwnProperty(entity, 'expires') &&
            this.toDate(entity.expires).getTime() < Date.now()
        ) {
            const driver = await this.useDriver();
            if (driver) {
                await driver.drop(this.buildKeyPath(entity.id));
            }

            await this.deleteDBEntity(entity.id);

            return true;
        }

        return false;
    }

    protected async useDriver() : Promise<RedisJsonAdapter | undefined> {
        if (this.clientJsonAdapter) {
            return this.clientJsonAdapter;
        }

        if (!isRedisClientUsable()) {
            return undefined;
        }

        this.client = useRedisClient();
        this.clientJsonAdapter = new RedisJsonAdapter(this.client);

        return this.clientJsonAdapter;
    }

    protected toDate(input: string | number | Date) : Date {
        if (input instanceof Date) {
            return input;
        }

        return new Date(input);
    }

    protected buildKeyPath(key: string) {
        return buildRedisKeyPath({
            key,
            prefix: this.prefix,
        });
    }

    abstract loadDBEntity(id: T['id']) : Promise<T>;

    abstract deleteDBEntity(id: T['id']) : Promise<void>;
}
