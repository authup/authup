/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface Realm {
    id: string;

    name: string;

    display_name: string | null;

    description: string | null;

    built_in: boolean;

    created_at: string;

    updated_at: string;
}
