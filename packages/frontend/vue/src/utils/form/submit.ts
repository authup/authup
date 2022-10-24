/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ref, SetupContext } from 'vue';

type Context<T extends Record<string, any>> = {
    ctx: SetupContext<('created' | 'deleted' | 'updated' | 'failed')[]>,
    props: {
        entity: Partial<T> | undefined
    },
    form: Partial<T>,
    formIsValid: () => boolean,
    update: (id: string, data: Partial<T>) => Promise<T>,
    create: (data: Partial<T>) => Promise<T>
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

                ctx.ctx.emit('updated', response);
            } else {
                response = await ctx.create({ ...ctx.form });

                ctx.ctx.emit('created', response);
            }
        } catch (e) {
            if (e instanceof Error) {
                ctx.ctx.emit('failed', e);
            }
        }
    };
}
