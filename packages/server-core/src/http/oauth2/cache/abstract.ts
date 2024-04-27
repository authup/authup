/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError, hasOwnProperty } from '@authup/core-kit';
import type { RedisKeyPathID } from '@authup/server-kit';
import { RedisCache, isRedisClientUsable, useRedisClient } from '@authup/server-kit';

export abstract class OAuth2AbstractCache<
    T extends Record<string, any> & { id: string, expires?: Date | string | number },
> {
    protected prefix: string;

    protected driver : RedisCache<T['id'], T> | undefined;

    protected constructor(prefix: string) {
        this.prefix = prefix;
    }

    async set(entity: T) : Promise<void> {
        const driver = await this.useDriver();
        if (!driver) {
            return;
        }

        const date = this.toDate(entity.expires);

        const seconds = Math.ceil((date.getTime() - Date.now()) / 1000);
        await driver.set(
            { id: entity.id } as RedisKeyPathID<T['id'], T>,
            entity,
            { seconds },
        );
    }

    async drop(id: T['id']) : Promise<void> {
        const driver = await this.useDriver();
        if (!driver) {
            await this.deleteDBEntity(id);
            return;
        }

        await driver.drop({ id } as RedisKeyPathID<T['id'], T>);
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

        entity = await driver.get({
            id,
        } as RedisKeyPathID<T['id'], T>);

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
                await driver.drop(entity.id as RedisKeyPathID<T['id'], T>);
            }

            await this.deleteDBEntity(entity.id);

            return true;
        }

        return false;
    }

    protected async useDriver() : Promise<RedisCache<T['id'], T> | undefined> {
        if (this.driver) {
            return this.driver;
        }

        if (!isRedisClientUsable()) {
            return undefined;
        }

        this.driver = new RedisCache<T['id'], T>({
            redis: useRedisClient(),
        }, { prefix: this.prefix });

        return this.driver;
    }

    protected toDate(input: string | number | Date) : Date {
        if (input instanceof Date) {
            return input;
        }

        return new Date(input);
    }

    abstract loadDBEntity(id: T['id']) : Promise<T>;

    abstract deleteDBEntity(id: T['id']) : Promise<void>;
}
