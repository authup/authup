/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { useNuxtApp } from '#app';

export const useIlingo = () : Ilingo => {
    const nuxtApp = useNuxtApp();

    return nuxtApp.$ilingo;
};

export const translateValidationMessage = (
    validator: string,
    parameters: Record<string, any>,
) => useIlingo().getSync(`validation.${validator}`, parameters, 'en');
