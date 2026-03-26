/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type SnakeCaseInput = { name: string, client_id?: string | null, realm_id?: string | null };
type CamelCaseInput = { name: string, clientId?: string | null, realmId?: string | null };

export function buildPermissionBindingKey(input: SnakeCaseInput | CamelCaseInput) {
    let realmId: string | null | undefined;
    let clientId: string | null | undefined;

    if ('realm_id' in input || 'client_id' in input) {
        const snakeInput = input as SnakeCaseInput;
        realmId = snakeInput.realm_id;
        clientId = snakeInput.client_id;
    } else {
        const camelInput = input as CamelCaseInput;
        realmId = camelInput.realmId;
        clientId = camelInput.clientId;
    }

    return `${realmId || '_'}/${clientId || '_'}/${input.name}`;
}
