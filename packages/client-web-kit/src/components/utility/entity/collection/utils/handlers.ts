/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { Ref } from 'vue';

type EntityFn<T> = (entity: T) => void | Promise<void>;

type Options<T> = {
    created?: EntityFn<T>,
    updated?: EntityFn<T>,
    deleted?: EntityFn<T>,
};

type StackItem<T> = {
    data: T,
    operation: 'created' | 'deleted' | 'updated'
};

export class ListHandlers<T extends ObjectLiteral> {
    protected data: Ref<T[]>;

    protected options : Options<T>;

    protected stack : StackItem<T>[];

    protected stackProcessing : boolean;

    constructor(
        data: Ref<T[]>,
        options: Options<T> = {},
    ) {
        this.data = data;
        this.options = options;
        this.stack = [];

        this.stackProcessing = false;
    }

    protected process() {
        if (this.stackProcessing) {
            return;
        }

        this.stackProcessing = true;

        const item = this.stack.shift();
        if (!item) {
            this.stackProcessing = false;
            return;
        }

        const index = this.data.value.findIndex(
            (el: T) => (el as Record<string, any>).id === (item.data as Record<string, any>).id,
        );

        switch (item.operation) {
            case 'created': {
                if (index === -1) {
                    this.data.value.push(item.data);

                    if (this.options.created) {
                        this.options.created(item.data);
                    }
                }
                break;
            }
            case 'updated': {
                if (index !== -1) {
                    const keys = Object.keys(item.data) as (keyof T)[];
                    for (const key of keys) {
                        this.data.value[index][key] = item.data[key];
                    }

                    if (this.options.updated) {
                        this.options.updated(this.data.value[index]);
                    }
                }
                break;
            }
            case 'deleted': {
                if (index !== -1) {
                    const output = this.data.value[index];

                    this.data.value.splice(index, 1);

                    if (this.options.deleted) {
                        this.options.deleted(output);
                    }
                }
                break;
            }
        }

        this.stackProcessing = false;

        this.process();
    }

    created(item: T) {
        this.stack.push({
            data: item,
            operation: 'created',
        });

        this.process();
    }

    updated(item: T) {
        this.stack.push({
            data: item,
            operation: 'updated',
        });

        this.process();
    }

    deleted(item: T) {
        this.stack.push({
            data: item,
            operation: 'deleted',
        });

        this.process();
    }
}
