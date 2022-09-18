/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { defineNuxtPlugin } from '#app';

declare module '#app' {
    interface NuxtApp {
        $ilingo: Ilingo;
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $ilingo: Ilingo;
    }
}

export default defineNuxtPlugin((ctx) => {
    const ilingo = new Ilingo();

    ilingo.setLocale('de');
    ilingo.setCache({
        de: {
            app: {
                delete: {
                    hint: 'Sind Sie sicher, dass das Objekt gelöscht werden soll?',
                    button: 'Löschen',
                    okTitle: 'Ok',
                    cancelTitle: 'Abbrechen',
                },
            },
            form: {
                update: {
                    button: 'Aktualisieren',
                },
                create: {
                    button: 'Erstellen',
                },
            },
            validator: {
                alt: 'Die Bedingung des Operators {{validator}} ist nicht erfüllt.',
            },
            validation: {
                url: 'Die URL ist nicht gültig.',
                email: 'Die Eingabe muss eine gültige E-Mail sein.',
                maxLength: 'Die Länge der Eingabe muss kleiner als {{max}} sein.',
                maxValue: 'Der Eingabewert muss kleiner gleich {{max}} sein.',
                minLength: 'Die Länge der Eingabe muss größer als {{min}} sein.',
                minValue: 'Der Eingabewert muss größer gleich {{min}} sein.',
                required: 'Ein Eingabewert wird benötigt.',
                sameAs: 'Der Eingabewert entspricht nicht dem Wert der Eingabe von {{eq}}',
                alphaNumHyphenUnderscore: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-z-_]+',
                alphaWithUpperNumHyphenUnderscore: 'Der Eingabewert darf nur aus folgenden Zeichen bestehen: [0-9a-zA-Z-_]+',
            },
        },
        en: {
            app: {
                delete: {
                    hint: 'Are you sure, that you want to delete this entity?',
                    button: 'Drop',
                    okTitle: 'Ok',
                    cancelTitle: 'Cancel',
                },
            },
            form: {
                update: {
                    button: 'Update',
                },
                create: {
                    button: 'Create',
                },
            },
            validator: {
                alt: 'The {{validator}} operator condition is not fulfilled.',
            },
            validation: {
                url: 'The URL is not valid.',
                email: 'The input must be a valid email address.',
                maxLength: 'The length of the input must be less than {{max}}.',
                maxValue: 'The input value can be at maximum be {{max}}',
                minLength: 'The length of the input must be greater than {{min}}.',
                minValue: 'The input value must be at least {{min}}',
                required: 'An input value is required.',
                sameAs: 'The input value is not equal to the value of {{eq}}',
                alphaNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-z-_]+',
                alphaWithUpperNumHyphenUnderscore: 'The input value is only allowed to consist of the following characters: [0-9a-zA-Z-_]+',
            },
        },
    });

    ctx.provide('ilingo', ilingo);
});
