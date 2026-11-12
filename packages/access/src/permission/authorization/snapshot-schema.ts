/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineIssueItem } from '@ebec/core';
import { createValidator } from '@validup/zod';
import { Container, ValidupError } from 'validup';
import { authorizationIdentitySchema } from './schema';
import { AuthorizationSnapshotValidator } from './snapshot-validator';
import type {
    AuthorizationSnapshot,
    AuthorizationSnapshotEvaluatorInput,
    AuthorizationSnapshotEvaluatorInputParsed,
} from './types';

/**
 * The whole input `createAuthorizationSnapshotEvaluator` takes: a snapshot,
 * read as untrusted stored data, and the identity its grants belong to.
 */
export class AuthorizationSnapshotEvaluatorInputValidator extends Container<AuthorizationSnapshotEvaluatorInput> {
    override initialize() {
        super.initialize();

        this.mount('snapshot', new AuthorizationSnapshotValidator());
        this.mount('identity', createValidator(authorizationIdentitySchema.optional()));
    }
}

const snapshotValidator = new AuthorizationSnapshotEvaluatorInputValidator();

/**
 * Validate the snapshot evaluator's input, plus the two rules per-key
 * validators cannot express.
 *
 * A definition carries no `realmScope`: the definition layer applies no
 * reach, so honouring the member would be impossible and ignoring it would
 * read a restriction as none.
 *
 * And grants travel with the identity holding them, as in the catalog's
 * input: a non-empty grant list without an identity belongs to nobody. An
 * empty or absent one is the anonymous caller's.
 */
export async function parseAuthorizationSnapshotEvaluatorInput(
    input: AuthorizationSnapshotEvaluatorInput,
) : Promise<AuthorizationSnapshotEvaluatorInputParsed> {
    // Detach for the reason the catalog's input is detached: a later mutation
    // of the stored data cannot widen grants after validation.
    const {
        snapshot,
        identity,
    } = await snapshotValidator.run(
        structuredClone(input) as Record<string, unknown>,
    ) as {
        snapshot: AuthorizationSnapshot,
        identity?: AuthorizationSnapshotEvaluatorInput['identity'],
    };

    for (const [i, definition] of snapshot.definitions.entries()) {
        if (typeof definition.realmScope === 'undefined') {
            continue;
        }

        throw new ValidupError([defineIssueItem({
            message: 'A definition applies no realm reach.',
            path: ['snapshot', 'definitions', i, 'realmScope'],
        })]);
    }

    if (!identity && snapshot.grants && snapshot.grants.length > 0) {
        throw new ValidupError([defineIssueItem({
            message: 'Grants require the identity they belong to.',
            path: ['identity'],
        })]);
    }

    return { snapshot, identity };
}
