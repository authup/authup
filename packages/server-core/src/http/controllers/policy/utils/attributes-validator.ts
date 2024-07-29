/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { omitRecord } from '@authup/kit';
import {
    BuiltInPolicyType,
    parseAttributeNamesPolicyOptions,
    parseAttributesOptions,
    parseDatePolicyOptions,
    parseTimePolicyOptions,
} from '@authup/permitus';
import { BadRequestError } from '@ebec/http';
import { buildError } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { ZodError } from 'zod';

type PolicyContainerRunOptions<T> = ContainerOptions<T> & {
    attributeNames?: string[]
};

export class PolicyAttributesValidator extends Container<Record<string, any>> {
    protected attributeNames : string[];

    constructor(options: PolicyContainerRunOptions<Record<string, any>>) {
        super(options);

        this.attributeNames = options.attributeNames || [];
    }

    override async run(
        data: Record<string, any>,
    ) : Promise<Record<string, any>> {
        let attributes : Record<string, any> = {};

        try {
            switch (data.type) {
                case BuiltInPolicyType.ATTRIBUTES: {
                    attributes = parseAttributesOptions(data);
                    break;
                }
                case BuiltInPolicyType.ATTRIBUTE_NAMES: {
                    attributes = parseAttributeNamesPolicyOptions(data);
                    break;
                }
                case BuiltInPolicyType.DATE: {
                    attributes = parseDatePolicyOptions(data);
                    break;
                }
                case BuiltInPolicyType.TIME: {
                    attributes = parseTimePolicyOptions(data);
                    break;
                }
                default: {
                    if (typeof this.attributeNames !== 'undefined') {
                        attributes = omitRecord(data, this.attributeNames);
                        // todo: maybe limit attributes size
                    }
                }
            }
        } catch (e: any) {
            if (e instanceof ZodError) {
                throw buildError(e, { path: 'type' });
            }

            if (e instanceof Error) {
                throw new BadRequestError(e.message, {
                    cause: e,
                });
            }

            throw e;
        }

        return attributes;
    }
}
