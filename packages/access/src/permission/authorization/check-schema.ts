/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineIssueItem } from '@ebec/core';
import { createValidator } from '@validup/zod';
import { Container, ValidupError } from 'validup';
import { authorizationCheckResultSchema, authorizationIdentitySchema } from './schema';
import type { AuthorizationCheckEvaluatorInput, AuthorizationCheckResult } from './types';

/**
 * The whole input `createAuthorizationCheckEvaluator` takes: the answer
 * `POST /authorization/check` served and the identity it belongs to. Same
 * validup-over-zod shape as the catalog's input, so a consumer can override
 * one member's rules instead of restating the answer.
 */
export class AuthorizationCheckEvaluatorInputValidator extends Container<AuthorizationCheckEvaluatorInput> {
    override initialize() {
        super.initialize();

        this.mount('result', createValidator(authorizationCheckResultSchema));
        this.mount('identity', createValidator(authorizationIdentitySchema.optional()));
    }
}

const checkValidator = new AuthorizationCheckEvaluatorInputValidator();

export type AuthorizationCheckEvaluatorInputParsed = {
    result: AuthorizationCheckResult,
    identity: AuthorizationCheckEvaluatorInput['identity'],
};

/**
 * Validate the check evaluator's input, plus the one rule a per-key validator
 * cannot express: a permission namespace appears at most once. Two entries for
 * one name would make the answer depend on which the consumer looked up first,
 * and the server emits one entry per name by construction.
 */
export async function parseAuthorizationCheckEvaluatorInput(
    input: AuthorizationCheckEvaluatorInput,
) : Promise<AuthorizationCheckEvaluatorInputParsed> {
    // Detach for the reason the catalog's input is detached: a later mutation
    // of a cached HTTP response cannot widen verdicts after validation.
    const {
        result,
        identity,
    } = await checkValidator.run(
        structuredClone(input) as Record<string, any>,
    ) as {
        result: AuthorizationCheckResult,
        identity?: AuthorizationCheckEvaluatorInput['identity'],
    };

    const seen = new Set<string>();
    for (const [i, permission] of result.entries()) {
        if (seen.has(permission.name)) {
            throw new ValidupError([defineIssueItem({
                message: `The permission ${permission.name} is answered more than once.`,
                path: ['result', i, 'name'],
            })]);
        }

        seen.add(permission.name);
    }

    return { result, identity };
}
