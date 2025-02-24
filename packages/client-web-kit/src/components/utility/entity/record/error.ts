/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export class EntityRecordError extends Error {
    static unresolvable() {
        return new this('Entity could not be resolved.');
    }
}
