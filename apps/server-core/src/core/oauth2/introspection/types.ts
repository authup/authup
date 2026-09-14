/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, IdentityType } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenPermission, OpenIDTokenPayload } from '@authup/specs';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IIdentityResolver } from '../../identity/resolver/types.ts';

export type OAuth2IntrospectionSubjectContext = {
    identityResolver: IIdentityResolver,
    identityPermissionProvider: IIdentityPermissionProvider,
    logger?: Logger,
};

export type OAuth2IntrospectionSubjectInput = {
    /**
     * Subject id.
     */
    sub: string,
    /**
     * Subject kind (user, client).
     */
    subKind: `${IdentityType}`,
    /**
     * Whether the credential the projection describes is usable. Permissions
     * are resolved ONLY when it is: an inactive credential reports who it
     * belonged to and nothing about what they may do, and a dead credential
     * must not pay for a permission read.
     */
    active: boolean,
};

export type OAuth2IntrospectionSubject = {
    identity: Identity,
    claims: OpenIDTokenPayload,
    /**
     * Present only for an `active` input.
     */
    permissions?: OAuth2TokenPermission[],
};
