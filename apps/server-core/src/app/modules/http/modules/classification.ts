/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { ClassType } from '@routup/decorators';
import {
    AccountController,
    ActivateController,
    AdminController,
    AuthenticatorChallengeController,
    AuthorizeController,
    ClientController,
    ClientPermissionController,
    ClientRoleController,
    ClientScopeController,
    ConsentController,
    EventController,
    IdentityProviderAccountController,
    IdentityProviderController,
    IdentityProviderRoleMappingController,
    JwkController,
    KeyController,
    LogoutController,
    OpenIDController,
    PasswordForgotController,
    PasswordResetController,
    PermissionController,
    PermissionPolicyController,
    PolicyController,
    RealmController,
    RegisterController,
    RoleAttributeController,
    RoleController,
    RolePermissionController,
    ScopeController,
    SessionController,
    SessionTokenController,
    StatusController,
    TokenController,
    TrustAnchorController,
    UserAttributeController,
    UserAuthenticatorController,
    UserController,
    UserInfoController,
    UserPermissionController,
    UserRoleController,
} from '../../../../adapters/http/controllers/index.ts';
import { ControllerKind } from '../constants.ts';

/**
 * The controllers every role with a listener mounts: the identity provider's
 * own surface (plan 099). The list is an AUDIT, not a naming rule. An entity
 * controller is on it when the hosted auth pages, their hydrated client or
 * the console sign-in call one of its routes on the replica serving them,
 * through the loopback client or from the browser, since a console replica
 * must answer any such request correctly. The unit is the controller: a
 * dual-use one (`RealmController` carries the per-realm discovery documents
 * next to realm CRUD) stays whole.
 *
 * - `RealmController`: `/realms/:id/.well-known/openid-configuration` and
 *   `/realms/:id/jwks`, plus the anonymous realm list the login form's realm
 *   picker and the consoles' realm choosers read.
 * - `IdentityProviderController`: the anonymous provider list on the login
 *   page, and `authorize-out` / `authorize-in` / `login-complete` /
 *   `link-request` / `link-confirm`, the federated login and account-link
 *   round-trips.
 * - `ClientController`: the kit's `AAuthorize` reads `GET /clients/:id` when
 *   a host passes `clientId` instead of the SSR-trimmed `client` (the hosted
 *   page passes `client`, so the call is a fallback path; a hosted-page code
 *   path all the same).
 * - `ClientScopeController`: `AuthorizeScopes` reads `GET /client-scopes`
 *   when `scopesAvailable` is not passed (same fallback shape).
 * - `ConsentController`: the consent covering probe `GET /consents` the
 *   authorize ladder runs before auto-consenting.
 * - `SessionController`: `GET /sessions/@me/introspect` and
 *   `DELETE /sessions/@me`, what the served consoles sign in and out with.
 * - `UserAuthenticatorController`: inline MFA enrollment on the authorize
 *   ladder (`POST /users/@me/authenticators`, `/confirm`, the recovery-code
 *   lookup) and the enroll picker's device list.
 * - `UserInfoController`: the OIDC `userinfo_endpoint`, advertised by
 *   discovery.
 * - `StatusController`: `GET /`, the image HEALTHCHECK.
 */
export const IDP_SURFACE_CONTROLLERS : ClassType[] = [
    AuthorizeController,
    TokenController,
    JwkController,
    OpenIDController,
    ActivateController,
    PasswordForgotController,
    PasswordResetController,
    RegisterController,
    LogoutController,
    AuthenticatorChallengeController,
    UserInfoController,
    AccountController,
    AdminController,
    StatusController,

    ClientController,
    ClientScopeController,
    ConsentController,
    IdentityProviderController,
    RealmController,
    SessionController,
    UserAuthenticatorController,
];

/**
 * The management API: entity CRUD nothing on the identity provider's own
 * surface calls back on its replica. The admin console's pages and API
 * integrations reach these through the proxy's root rule, so a console
 * replica leaves them unmounted (`HTTPModuleOptions.managementApi`).
 *
 * `UserController` is here despite `/users/@me`: the kit store derives the
 * user from the token introspection and the account console's profile form
 * loads `/userinfo`, so no hosted page reads it. `IdentityProviderAccountController`
 * and `SessionTokenController` serve the account console's connected-accounts
 * and session-inventory pages, which are API calls of a served SPA, not
 * self-calls of the IdP surface.
 */
export const MANAGEMENT_API_CONTROLLERS : ClassType[] = [
    ClientPermissionController,
    ClientRoleController,
    EventController,
    IdentityProviderAccountController,
    IdentityProviderRoleMappingController,
    KeyController,
    PermissionController,
    PermissionPolicyController,
    PolicyController,
    RoleController,
    RoleAttributeController,
    RolePermissionController,
    ScopeController,
    SessionTokenController,
    TrustAnchorController,
    UserController,
    UserAttributeController,
    UserPermissionController,
    UserRoleController,
];

/**
 * Which list a controller INSTANCE belongs to. Throws for one on neither:
 * the boot fails on the first request-serving role, so a controller added
 * to the mount list without a classification never ships silently mounted
 * on the console replicas.
 */
export function classifyController(controller: object) : ControllerKind {
    const type = controller.constructor as ClassType;

    if (IDP_SURFACE_CONTROLLERS.includes(type)) {
        return ControllerKind.IDP_SURFACE;
    }

    if (MANAGEMENT_API_CONTROLLERS.includes(type)) {
        return ControllerKind.MANAGEMENT_API;
    }

    throw new AuthupError(
        `The controller ${type.name} is neither on IDP_SURFACE_CONTROLLERS nor on MANAGEMENT_API_CONTROLLERS. ` +
        'Classify it (app/modules/http/modules/classification.ts) so the console role knows whether to mount it.',
    );
}
