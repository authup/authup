/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyDefaultValidators } from '@authup/access';
import type { PolicyValidators } from '@authup/access';
import type { Policy } from '@authup/core-kit';
import { ValidationError } from '@authup/errors';
import { hasOwnProperty } from '@authup/kit';
import { Container } from 'validup';

/**
 * The keys of a policy body that are the policy's own columns (or its
 * children), never options of its type.
 */
const POLICY_KEYS = new Set<string>([
    'id',
    'builtIn',
    'type',
    'name',
    'displayName',
    'description',
    'invert',
    'children',
    'parentId',
    'parent',
    'realmId',
    'realm',
    'createdAt',
    'updatedAt',
] satisfies (keyof Policy)[]);

/**
 * Keep the options a policy's type declares and nothing else (issue #3669):
 * every other key of the body would be stored as an extra attribute row.
 * The options are read by the validator the registry holds for the type
 * (the built-ins by default; #3676 feeds custom types into it).
 */
export class PolicyAttributesValidator extends Container<Record<string, any>> {
    protected validators: PolicyValidators;

    constructor(validators: PolicyValidators = PolicyDefaultValidators) {
        super();

        this.validators = validators;
    }

    override async run(
        data: Record<string, any>,
    ) : Promise<Record<string, any>> {
        if (
            typeof data.type !== 'string' ||
            !hasOwnProperty(this.validators, data.type)
        ) {
            const options = Object.keys(data).filter((key) => !POLICY_KEYS.has(key));
            if (options.length > 0) {
                throw new ValidationError(
                    `No validator is registered for policy type \`${String(data.type)}\`, so it accepts no options (${options.join(', ')}).`,
                );
            }

            return {};
        }

        // a composite's children are policies of their own, not options: the
        // service validates each one with its own type's validator
        const output = await this.validators[data.type].run(
            data,
            data.type === BuiltInPolicyType.COMPOSITE ? { pathsToExclude: ['children'] } : {},
        );

        // an omitted option comes back as undefined and would be stored as 'undefined'
        return Object.fromEntries(
            Object.entries(output).filter(([, value]) => typeof value !== 'undefined'),
        );
    }
}
