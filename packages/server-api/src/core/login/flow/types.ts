/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type IdentityProviderFlowIdentity = {
    id: string | number,
    name: string | string[],
    email?: string,
    roles?: string[],
    first_name?: string,
    last_name?: string
};
