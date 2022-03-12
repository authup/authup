/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildPermissionMetaFields(input: string | null) : string[] | undefined {
    if (!input) {
        return undefined;
    }

    const data = JSON.parse(input);
    if (!isFieldsArray(data) || data.length === 0) {
        return undefined;
    }

    return data;
}

function isFieldsArray(input: unknown) : input is string[] {
    if (!Array.isArray(input)) {
        return false;
    }

    const items = input.map((item) => typeof input === 'string');

    return items.length === input.length;
}
