/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainAPI } from '@authup/core-http-kit';
import type {
    DomainEntity, DomainType,
} from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import type { BuildInput } from 'rapiq';
import { isObject } from 'smob';
import type { Ref, VNodeChild } from 'vue';
import {
    computed, isRef, ref, toRef, watch,
} from 'vue';
import { injectHTTPClient } from '../http-client';
import type { EntitySocket, EntitySocketContext } from '../entity-socket';
import { createEntitySocket } from '../entity-socket';
import { extendObjectProperties } from '../object';
import { hasNormalizedSlot, normalizeSlot } from '../slot';
import { EntityManagerError } from './error';
import type {
    EntityID,
    EntityManager,
    EntityManagerContext,
    EntityManagerRenderFn,
    EntityManagerResolveContext,
} from './type';
import { buildEntityManagerSlotProps } from './utils';

type DomainTypeInfer<T> = T extends DomainEntity<infer U> ? U extends `${DomainType}` ? U : never : never;
export function createEntityManager<
    A extends DomainTypeInfer<DomainEntity<any>>,
    T = DomainEntity<A>,
>(
    ctx: EntityManagerContext<A, T>,
) : EntityManager<T> {
    const client = injectHTTPClient();
    let domainAPI : DomainAPI<T> | undefined;
    if (hasOwnProperty(client, ctx.type)) {
        domainAPI = client[ctx.type] as any;
    }

    const entity : Ref<T | undefined> = ref(undefined);
    const entityId = computed<EntityID<T> | undefined>(
        () => (
            entity.value ? (entity.value as any).id : undefined),
    );

    const realmId = computed<string | undefined>(
        () => {
            let realmId : string | undefined;

            if (ctx.realmId) {
                if (typeof ctx.realmId === 'function') {
                    return ctx.realmId(entity.value);
                }

                realmId = isRef(ctx.realmId) ? ctx.realmId.value : ctx.realmId;
            }

            if (!realmId && entity.value) {
                if (
                    hasOwnProperty(entity.value, 'realm_id') &&
                    typeof entity.value.realm_id === 'string'
                ) {
                    return entity.value.realm_id;
                }
            }

            return realmId;
        },
    );

    const lockId = ref(undefined) as Ref<EntityID<T> | undefined>;

    if (ctx.props && ctx.props.entity) {
        entity.value = ctx.props.entity;
    }

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
            ctx.setup.emit('deleted', (value || entity.value) as T);
        }

        if (ctx.onDeleted) {
            ctx.onDeleted((value || entity.value) as T);
        }
    };

    const updated = (value: Partial<T>) => {
        if (entity.value) {
            extendObjectProperties(entity.value, value);
        }

        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('updated', (entity.value || value) as T);
        }

        if (ctx.onUpdated) {
            ctx.onUpdated(entity.value || value);
        }
    };

    const resolved = (value?: T) => {
        if (ctx.setup && ctx.setup.emit) {
            ctx.setup.emit('resolved', value);
        }

        if (ctx.onResolved) {
            ctx.onResolved(value);
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
        if (!domainAPI || busy.value || !entityId.value) {
            return;
        }

        busy.value = true;
        lockId.value = entityId.value;

        try {
            const response = await domainAPI.update(
                entityId.value,
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
        if (!domainAPI || busy.value || !entityId.value) {
            return;
        }

        busy.value = true;
        lockId.value = entityId.value;

        try {
            const response = await domainAPI.delete(
                entityId.value,
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
            await update(data);
        } else {
            await create(data);
        }
    };

    let socket : EntitySocket | undefined;

    if (
        typeof ctx.socket !== 'boolean' ||
        typeof ctx.socket === 'undefined' ||
        typeof ctx.socket === 'function' ||
        ctx.socket
    ) {
        let socketContext : EntitySocketContext<A, T> = {
            type: ctx.type,
        };

        if (isObject(ctx.socket)) {
            socketContext = {
                ...socketContext,
                ...ctx.socket,
            };
        }

        socketContext.onCreated = created;
        socketContext.onUpdated = updated;
        socketContext.lockId = lockId;
        socketContext.realmId = realmId;
        socketContext.target = true;
        socketContext.targetId = entityId;

        socket = createEntitySocket(socketContext);
    }

    const error = ref<Error | undefined>(undefined);

    const resolveByProps = () : boolean => {
        if (!ctx.props) {
            return false;
        }

        if (ctx.props.entity) {
            entity.value = ctx.props.entity;

            if (socket) {
                socket.mount();
            }

            resolved(entity.value);

            return true;
        }

        return false;
    };

    if (ctx.props) {
        const propEntityRef = toRef(ctx.props, 'entity');
        const propsEntityId = computed(() => (propEntityRef.value ? propEntityRef.value.id : undefined));
        watch(propsEntityId, (val) => {
            entity.value = propEntityRef.value;

            if (val) {
                if (socket) {
                    socket.mount();
                }
            } else if (socket) {
                socket.unmount();
            }
        });
    }

    resolveByProps();

    const resolve = async (rctx: EntityManagerResolveContext<T> = {}) => {
        if (entity.value) {
            return;
        }

        let query : (T extends Record<string, any> ? BuildInput<T> : never) | undefined;
        if (rctx.query) {
            query = rctx.query;
        }

        let { id } = rctx;

        if (ctx.props) {
            if (resolveByProps()) {
                return;
            }

            if (ctx.props.entity) {
                entity.value = ctx.props.entity;

                if (socket) {
                    socket.mount();
                }

                resolved(entity.value);

                return;
            }

            if (ctx.props.queryFilters) {
                query = {
                    filters: ctx.props.queryFilters,
                } as any;

                if (
                    query &&
                    ctx.props.queryFields
                ) {
                    query.fields = ctx.props.queryFields;
                }
            }

            if (ctx.props.entityId) {
                id = ctx.props.entityId;
            }
        }

        if (!domainAPI) {
            resolved();

            return;
        }

        if (id) {
            try {
                entity.value = await domainAPI.getOne(id, query as BuildInput<any>);

                if (socket) {
                    socket.mount();
                }

                resolved(entity.value);

                return;
            } catch (e) {
                if (e instanceof Error) {
                    error.value = e;
                }
            }
        }

        if (query) {
            try {
                const response = await domainAPI.getMany({
                    ...query,
                    pagination: {
                        limit: 1,
                    },
                } as any);

                if (response.data.length === 1) {
                    [entity.value] = response.data;

                    if (socket) {
                        socket.mount();
                    }
                }

                resolved(entity.value);
            } catch (e) {
                if (e instanceof Error) {
                    error.value = e;
                }
            }
        }
    };

    const resolveOrFail = async (resolveContext: EntityManagerResolveContext<T> = {}) => {
        await resolve(resolveContext);

        if (typeof entity.value === 'undefined') {
            if (!error.value) {
                throw EntityManagerError.unresolvable();
            }

            // eslint-disable-next-line no-throw-literal
            throw error.value as Error;
        }
    };

    const manager : EntityManager<T> = {
        resolve,
        resolveOrFail,
        lockId,
        busy,
        data: entity,
        error,

        create,
        createOrUpdate,
        created,

        update,
        updated,

        delete: remove,
        deleted,

        failed,

        render: () => undefined,
        renderError: () => undefined,
    };

    manager.render = (content?: VNodeChild | EntityManagerRenderFn): VNodeChild => {
        if (!ctx.setup || !ctx.setup.slots) {
            return typeof content === 'function' ?
                content() :
                content;
        }

        if (hasNormalizedSlot('default', ctx.setup.slots)) {
            return normalizeSlot(
                'default',
                buildEntityManagerSlotProps(manager),
                ctx.setup.slots,
            );
        }

        return typeof content === 'function' ?
            content() :
            content;
    };

    manager.renderError = (error: unknown) : VNodeChild => {
        if (!ctx.setup || !ctx.setup.slots) {
            return undefined;
        }

        if (
            isObject(error) &&
            hasNormalizedSlot('error', ctx.setup.slots)
        ) {
            return normalizeSlot('error', error, ctx.setup.slots);
        }

        return undefined;
    };

    return manager;
}
