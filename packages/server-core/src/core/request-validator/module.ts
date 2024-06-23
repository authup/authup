/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import type { ValidationError } from 'express-validator';
import {
    body,
    check,
    cookie, header,
    oneOf,
    param,
    query,
} from 'express-validator';
import type { FieldInstance } from 'express-validator/lib/base';
import type { ReadonlyContext } from 'express-validator/lib/context';
import type { Request } from 'routup';
import { buildErrorMessageForAttributes } from '../../utils';
import { RequestValidatorFieldSource } from './constants';
import type {
    RequestValidationChain,
    RequestValidationGroup,
    RequestValidatorAddOptions,
    RequestValidatorExecuteOptions,
} from './types';

interface FieldInstanceBag {
    instance: FieldInstance;
    context: ReadonlyContext;
}

export class RequestValidator<
    T extends Record<string, any> = Record<string, any>,
> {
    protected items: Record<string, (RequestValidationChain | RequestValidationGroup)[]>;

    constructor() {
        this.items = {};
    }

    create(field: keyof T) {
        return this.createFor(field);
    }

    createFor(field: keyof T, src?: `${RequestValidatorFieldSource}`) {
        if (src === RequestValidatorFieldSource.BODY) {
            return body(field as string);
        }

        if (src === RequestValidatorFieldSource.COOKIES) {
            return cookie(field as string);
        }

        if (src === RequestValidatorFieldSource.HEADERS) {
            return header(field as string);
        }

        if (src === RequestValidatorFieldSource.PARAMS) {
            return param(field as string);
        }

        if (src === RequestValidatorFieldSource.QUERY) {
            return query(field as string);
        }

        return check(field as string);
    }

    addTo(
        group: string,
        field: keyof T,
        options?: RequestValidatorAddOptions
    ): RequestValidationChain;

    addTo(group: string, chain: RequestValidationChain): RequestValidationChain;

    addTo(
        group: string,
        input: any | RequestValidationChain,
        options: RequestValidatorAddOptions = {},
    ): RequestValidationChain {
        return this.add(input, {
            group,
            ...options,
        });
    }

    addOneOf(
        chains: RequestValidationChain[],
        options: RequestValidatorAddOptions = {},
    ) : RequestValidationGroup {
        const chain = oneOf(chains, {
            errorType: 'flat',
        });

        const group = options.group || '*';
        if (!this.items[group]) {
            this.items[group] = [];
        }

        this.items[group].push(chain);

        return chain;
    }

    add(
        field: keyof T,
        options?: RequestValidatorAddOptions
    ): RequestValidationChain;

    add(
        chain: RequestValidationChain,
        options?: RequestValidatorAddOptions
    ): RequestValidationChain;

    add(
        input: any | RequestValidationChain,
        options: RequestValidatorAddOptions = {},
    ): RequestValidationChain {
        const group = options.group || '*';
        if (!this.items[group]) {
            this.items[group] = [];
        }

        if (typeof input === 'string') {
            const item = this.createFor(input, options.src);
            this.items[group].push(item);

            return item;
        }

        this.items[group].push(input);

        return input;
    }

    async execute(
        req: Request,
        options: RequestValidatorExecuteOptions<T> = {},
    ): Promise<T> {
        const data: Record<string, any> = {};
        const errors: ValidationError[] = [];

        const items = this.items['*'] || [];
        if (
            options.group &&
            options.group !== '*'
        ) {
            items.push(...this.items[options.group] || []);
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const outcome = await item.run(req);
            const bags = this.extractField(outcome.context);

            for (let i = 0; i < bags.length; i++) {
                if (this.hasErrors(bags[i])) {
                    continue;
                }

                data[bags[i].instance.path] = bags[i].instance.value;
            }
        }

        if (errors.length > 0) {
            throw this.createError(errors);
        }

        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            const value = data[keys[i]];
            if (typeof value !== 'undefined') {
                continue;
            }

            if (
                options.defaults &&
                hasOwnProperty(options.defaults, keys[i])
            ) {
                data[keys[i]] = options.defaults[keys[i]];
                continue;
            }

            delete data[keys[i]];
        }

        return data as T;
    }

    protected extractField(context: ReadonlyContext): FieldInstanceBag[] {
        const instances = context.getData({ requiredOnly: false });
        return instances.map((instance): FieldInstanceBag => ({
            instance,
            context,
        }));
    }

    protected hasErrors(bag: FieldInstanceBag) {
        return bag.context.errors.some(
            (error) => error.type === 'field' &&
                error.location === bag.instance.location &&
                error.path === bag.instance.path,
        );
    }

    protected createError(errors: ValidationError[]): Error {
        const parameterNames = new Set<string>();
        for (let i = 0; i < errors.length; i++) {
            const item = errors[i];

            switch (item.type) {
                case 'field': {
                    parameterNames.add(item.path);
                    break;
                }
                case 'alternative': {
                    parameterNames.add(item.nestedErrors.map(
                        ((el) => el.path),
                    )
                        .join('|'));
                    break;
                }
            }
        }

        throw new BadRequestError({
            message: buildErrorMessageForAttributes(Array.from(parameterNames)),
            data: {
                errors,
            },
        });
    }
}
