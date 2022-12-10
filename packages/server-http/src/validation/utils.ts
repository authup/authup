/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MatchedDataOptions, matchedData } from 'express-validator';
import { deleteUndefinedObjectProperties } from '@authup/common';
import { Request } from 'routup';
import { EntityTarget } from 'typeorm';
import { BadRequestError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { ExpressValidationExtendKeys, ExpressValidationResult } from './type';

export function buildHTTPValidationErrorMessage<
    T extends Record<string, any> = Record<string, any>,
    >(name: keyof T | (keyof T)[]) {
    const names = Array.isArray(name) ? name : [name];

    if (names.length > 1) {
        return `The parameters ${names.join(', ')} is invalid.`;
    }
    return `The parameter ${String(names[0])} is invalid.`;
}

export function matchedValidationData(
    req: Request,
    options?: Partial<MatchedDataOptions>,
): Record<string, any> {
    return deleteUndefinedObjectProperties(matchedData(req, options));
}

export function initExpressValidationResult<
    R extends Record<string, any>,
    M extends Record<string, any> = Record<string, any>,
>() : ExpressValidationResult<R, M> {
    return {
        data: {},
        relation: {},
        meta: {} as M,
    };
}

export async function extendExpressValidationResultWithRelation<
    R extends Record<string, any>,
    >(
    result: ExpressValidationResult<R>,
    target: EntityTarget<any>,
    keys: Partial<ExpressValidationExtendKeys<R>>,
) : Promise<ExpressValidationResult<R>> {
    if (result.data[keys.id]) {
        const dataSource = await useDataSource();

        const repository = dataSource.getRepository(target);
        const entity = await repository.findOneBy({ id: result.data[keys.id] });
        if (!entity) {
            throw new BadRequestError(buildHTTPValidationErrorMessage(keys.id));
        }

        result.relation[keys.entity as keyof ExpressValidationResult<R>['relation']] = entity;
    }

    return result;
}
