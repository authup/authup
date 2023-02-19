/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SetupContext } from 'vue';
import { Ref } from 'vue';

type Context<T extends Record<string, any>> = {
    ctx: SetupContext<('created' | 'deleted' | 'updated' | 'failed')[]>,
    props: {
        entity: Partial<T> | undefined
    },
    form: Partial<T>,
    formIsValid: () => boolean,
    update: (id: string, data: Partial<T>) => Promise<T>,
    create: (data: Partial<T>) => Promise<T>,

    onCreate?: (entity: T) => void,
    onUpdate?: (entity: T) => void,
    onFail?: (error: Error) => void
};

export function createSubmitHandler<T extends Record<string, any>>(ctx: Context<T>) {
    return async () => {
        if (!ctx.formIsValid()) {
            return;
        }

        try {
            let response;

            if (
                ctx.props.entity &&
                ctx.props.entity.id
            ) {
                response = await ctx.update(ctx.props.entity.id, { ...ctx.form });

                if (ctx.onUpdate) {
                    ctx.onUpdate(response);
                }

                ctx.ctx.emit('updated', response);
            } else {
                response = await ctx.create({ ...ctx.form });

                if (ctx.onCreate) {
                    ctx.onCreate(response);
                }

                ctx.ctx.emit('created', response);
            }
        } catch (e) {
            if (e instanceof Error) {
                if (ctx.onFail) {
                    ctx.onFail(e);
                }

                ctx.ctx.emit('failed', e);
            }
        }
    };
}
