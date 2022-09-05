/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ExpressValidationResultMetaKey<T extends Record<string, any>> = ({
    [K in keyof T]?: T[K] extends Record<string, any> ?
        T[K] extends Date ? never : K :
        never
})[keyof T];

export type ExpressValidationResult<
    T extends Record<string, any>,
    M extends Record<string, any> = Record<string, any>,
    > = {
        data: Partial<T>,
        relation: {
            [K in ExpressValidationResultMetaKey<T>]?: T[K]
        },
        meta: M
    };

export type ExpressValidationExtendKeys<T extends Record<string, any>> = {
    id: keyof T,
    entity: ExpressValidationResultMetaKey<T>
};
