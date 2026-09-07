/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type StatusResponseFeatures = {
    registration: boolean,
    passwordRecovery: boolean,
    emailVerification: boolean,
    accountConsole: boolean,
    adminConsole: boolean,
};

/**
 * Where the deployment's machine-readable surfaces are. `docs` and
 * `openapi` are `null` while the swagger middleware is off.
 */
export type StatusResponseEndpoints = {
    openidConfiguration: string,
    realms: string,
    docs: string | null,
    openapi: string | null,
};

/**
 * Where the consoles are published. A disabled console is `null`; the
 * auth console is always present, since the hosted login pages are the
 * issuance surface.
 */
export type StatusResponseConsoles = {
    admin: string | null,
    account: string | null,
    auth: string,
};

export type StatusResponse = {
    version: string,
    date: string,
    publicUrl: string,
    features: StatusResponseFeatures,
    endpoints: StatusResponseEndpoints,
    consoles: StatusResponseConsoles,
};

export interface IStatusAPI {
    get() : Promise<StatusResponse>;
}
