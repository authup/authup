/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributeNamesPolicyValidator,
    AttributesPolicyValidator,
    BuiltInPolicyType,
    DatePolicyValidator,
    TimePolicyValidator,
    omitRecord,
} from '@authup/kit';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';

type PolicyContainerRunOptions<T> = ContainerOptions<T> & {
    attributeNames?: string[]
};

export class PolicyAttributesValidator extends Container<Record<string, any>> {
    protected attributeNames : string[];

    protected attributesOptionsValidator : AttributesPolicyValidator;

    protected attributeNamesOptionsValidator : AttributeNamesPolicyValidator;

    protected dateOptionsValidator : DatePolicyValidator;

    protected timeOptionsValidator : TimePolicyValidator;

    constructor(options: PolicyContainerRunOptions<Record<string, any>>) {
        super(options);

        this.attributeNames = options.attributeNames || [];

        this.attributesOptionsValidator = new AttributesPolicyValidator();
        this.attributeNamesOptionsValidator = new AttributeNamesPolicyValidator();
        this.dateOptionsValidator = new DatePolicyValidator();
        this.timeOptionsValidator = new TimePolicyValidator();
    }

    override async run(
        data: Record<string, any>,
    ) : Promise<Record<string, any>> {
        let attributes : Record<string, any> = {};

        switch (data.type) {
            case BuiltInPolicyType.ATTRIBUTES: {
                attributes = await this.attributesOptionsValidator.run(data);
                break;
            }
            case BuiltInPolicyType.ATTRIBUTE_NAMES: {
                attributes = await this.attributeNamesOptionsValidator.run(data);
                break;
            }
            case BuiltInPolicyType.DATE: {
                attributes = await this.dateOptionsValidator.run(data);
                break;
            }
            case BuiltInPolicyType.TIME: {
                attributes = await this.timeOptionsValidator.run(data);
                break;
            }
            default: {
                if (typeof this.attributeNames !== 'undefined') {
                    attributes = omitRecord(data, this.attributeNames);
                    // todo: maybe limit attributes size
                }
            }
        }

        return attributes;
    }
}
