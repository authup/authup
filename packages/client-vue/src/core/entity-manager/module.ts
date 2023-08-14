/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainAPI, DomainEntity, DomainType } from '@authup/core';
import { hasOwnProperty } from '@authup/core';
import { isObject } from 'smob';
import type { Ref, VNodeChild } from 'vue';
import { ref, toRef } from 'vue';
import { injectAPIClient } from '../api-client';
import { extendObjectProperties } from '../object';
import { hasNormalizedSlot, normalizeSlot } from '../slot';
import { EntityManagerError } from './error';
import type { EntityManager, EntityManagerContext, EntityManagerRecord } from './type';
import { buildEntityManagerSlotProps } from './utils';

function create<T extends EntityManagerRecord>(
    type: `${DomainType}`,
    ctx: EntityManagerContext<T>,
) : EntityManager<T> {
    const client = injectAPIClient();
    let domainAPI : DomainAPI<T> | undefined;
    if (hasOwnProperty(client, type)) {
        domainAPI = client[type] as DomainAPI<T>;
    }

    const lockId = ref<T['id'] | undefined>(undefined);
    const entity : Ref<T | undefined> = ref(undefined);

    if (ctx.props && ctx.props.entity) {
        entity.value = ctx.props.entity;
    }

    let error : Error | undefined;

    const resolve = async () => {
        if (!ctx.props) {
            return;
        }

        if (typeof ctx.props.entity !== 'undefined') {
            entity.value = ctx.props.entity;

            return;
        }

        if (!domainAPI) {
            return;
        }

        if (ctx.props.entityId) {
            try {
                entity.value = await domainAPI.getOne(ctx.props.entityId, ctx.props.query || {});

                return;
            } catch (e) {
                if (e instanceof Error) {
                    error = e;
                }
            }
        }

        if (typeof ctx.props.where !== 'undefined') {
            try {
                const response = await domainAPI.getMany({
                    ...(ctx.props.query || {}),
                    filters: ctx.props.where,
                    pagination: {
                        limit: 1,
                    },
                });
                if (response.data.length === 1) {
                    [entity.value] = response.data;
                }
            } catch (e) {
                if (e instanceof Error) {
                    error = e;
                }
            }
        }
    };

    const resolveOrFail = async () => {
        await resolve();

        if (typeof entity.value === 'undefined') {
            if (!error) {
                error = EntityManagerError.unresolvable();
            }

            throw error;
        }
    };

    const created = (value: T) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('created', value);
        }

        if (ctx.onCreated) {
            ctx.onCreated(value);
        }
    };

    const deleted = (value: T) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('deleted', value || entity.value);
        }

        if (ctx.onDeleted) {
            ctx.onDeleted(value || entity.value);
        }
    };

    const updated = (value: Partial<T>) => {
        if (entity.value) {
            extendObjectProperties(entity.value, value);
        }

        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('updated', entity.value || value);
        }

        if (ctx.onUpdated) {
            ctx.onUpdated(entity.value || value);
        }
    };

    const failed = (error: Error) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('failed', error);
        }

        if (ctx.onFailed) {
            ctx.onFailed(error);
        }
    };

    const busy = ref(false);

    const update = async (data: Partial<T>) => {
        if (!domainAPI || busy.value || !entity.value) {
            return;
        }

        busy.value = true;
        lockId.value = entity.value.id;

        try {
            const response = await domainAPI.update(
                entity.value.id,
                data,
            );

            entity.value = response;

            updated(response);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            busy.value = false;
            lockId.value = undefined;
        }
    };

    const remove = async () : Promise<void> => {
        if (!domainAPI || busy.value || !entity.value) {
            return;
        }

        busy.value = true;
        lockId.value = entity.value.id;

        try {
            const response = await domainAPI.delete(
                entity.value.id,
            );

            entity.value = undefined;

            deleted(response);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            busy.value = false;
            lockId.value = undefined;
        }
    };

    const create = async (data: Partial<T>) : Promise<void> => {
        if (!domainAPI || busy.value) {
            return;
        }

        busy.value = true;

        lockId.value = undefined;

        try {
            const response = await domainAPI.create(data);

            entity.value = response;

            created(response);
        } catch (e) {
            if (e instanceof Error) {
                failed(e);
            }
        } finally {
            busy.value = false;
            lockId.value = undefined;
        }
    };

    const createOrUpdate = async (data: Partial<T>) : Promise<void> => {
        if (entity.value) {
            await manager.update(data);
        } else {
            await manager.create(data);
        }
    };

    const manager : EntityManager<T> = {
        resolve,
        resolveOrFail,
        lockId,
        busy,
        entity,

        create,
        createOrUpdate,
        created,

        update,
        updated,

        delete: remove,
        deleted,

        failed,

        render: () => undefined,
    };

    manager.render = (error?: unknown): VNodeChild => {
        if (!ctx.setup || !ctx.setup.slots) {
            return undefined;
        }

        if (error) {
            if (
                isObject(error) &&
                hasNormalizedSlot('error', ctx.setup.slots)
            ) {
                return normalizeSlot('error', error, ctx.setup.slots);
            }

            return undefined;
        }

        if (hasNormalizedSlot('default', ctx.setup.slots)) {
            return normalizeSlot(
                'default',
                buildEntityManagerSlotProps(manager),
                ctx.setup.slots,
            );
        }

        return undefined;
    };

    return manager;
}

export function createEntityManager<T extends `${DomainType}`>(
    type: T,
    ctx: EntityManagerContext<DomainEntity<T>>,
) : EntityManager<DomainEntity<T>> {
    return create(type, ctx);
}
