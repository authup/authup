/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The node a policy tree travels as when the server withholds it, because the
 * caller's realm reach does not cover the row it was read from.
 *
 * It is deliberately a type no consumer can project: `projectAuthorizationPolicy`
 * refuses it, which is already the state a definition referencing it denies
 * through and a grant naming it is dropped through, so withholding a body needs
 * no rule of its own on the consumer side. That is a contract between the two
 * halves rather than a server detail, which is why it is declared HERE, next to
 * the projection that has to keep refusing it, and pinned by this package's own
 * test.
 */
export const AUTHORIZATION_POLICY_WITHHELD_TYPE = 'withheld';
