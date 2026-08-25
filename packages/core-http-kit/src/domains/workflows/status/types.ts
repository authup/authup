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

export type StatusResponse = {
    version: string,
    date: string,
    features: StatusResponseFeatures,
};

export interface IStatusAPI {
    get() : Promise<StatusResponse>;
}
