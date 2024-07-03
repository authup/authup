/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    omitRecord,
    parseAttributeNamesOptions,
    parseAttributesOptions,
    parseDatePolicyOptions,
    parseTimePolicyOptions,
} from '@authup/kit';
import { useRequestBody } from '@routup/basic/body';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { ZodError } from 'zod';
import { RequestDatabaseValidator, type RequestValidatorExecuteOptions } from '../../../../core';
import {
    PolicyEntity,
} from '../../../../domains';
import { buildErrorMessageForZodError } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

type PolicyValidationResult = PolicyEntity & {
    parent_id?: string
};

export class PolicyRequestValidator extends RequestDatabaseValidator<PolicyValidationResult> {
    constructor() {
        super(PolicyEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .isString()
            .isLength({ min: 3, max: 128 });

        this.add('invert')
            .isBoolean()
            .optional({ values: 'undefined' });

        this.add('type')
            .exists()
            .isString()
            .isLength({ min: 3, max: 128 });

        this.add('parent_id')
            .exists()
            .isUUID()
            .optional({ nullable: true });

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true });
    }

    async executeWithAttributes(
        req: Request,
        options: RequestValidatorExecuteOptions<PolicyValidationResult> = {},
    ) : Promise<[PolicyValidationResult, Record<string, any>]> {
        const data = await this.execute(req, options);

        let attributes : Record<string, any> = {};

        try {
            const body = useRequestBody(req);

            switch (data.type) {
                case BuiltInPolicyType.ATTRIBUTES: {
                    attributes = parseAttributesOptions(body);
                    break;
                }
                case BuiltInPolicyType.ATTRIBUTE_NAMES: {
                    attributes = parseAttributeNamesOptions(body);
                    break;
                }
                case BuiltInPolicyType.DATE: {
                    attributes = parseDatePolicyOptions(body);
                    break;
                }
                case BuiltInPolicyType.TIME: {
                    attributes = parseTimePolicyOptions(body);
                    break;
                }
                default: {
                    const internal = await this.getFields();
                    attributes = omitRecord(body, internal);
                    // todo: maybe limit attributes size
                }
            }
        } catch (e: any) {
            if (e instanceof ZodError) {
                throw new BadRequestError(buildErrorMessageForZodError(e));
            }

            if (e instanceof Error) {
                throw new BadRequestError(e.message, {
                    cause: e,
                });
            }

            throw e;
        }

        return [data, attributes];
    }
}
