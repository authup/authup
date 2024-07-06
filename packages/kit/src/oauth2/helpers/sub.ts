/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function getOAuth2SubByEntity<T extends {
    robot_id: string | null,
    user_id: string | null,
    client_id: string | null
}>(entity: T) : string {
    const id = entity.robot_id || entity.user_id || entity.client_id;
    if (typeof id !== 'string') {
        throw new SyntaxError('Subject could not be extracted from token entity.');
    }

    return id;
}
