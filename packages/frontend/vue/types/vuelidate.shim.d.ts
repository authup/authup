/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

declare module 'vuelidate' {
    // we need to augment the actual Vue types
    import vue from 'vue';

    // must bolt on the validations property to the input of ComponentOptions
    // and also onto the "output" of @Component in the form of VueClass<Vue>
    module 'vue/types/options' {
        interface ComponentOptions<V extends vue> {
            validations?: { [x: string]: any }
        }

        interface VueClass<V extends vue> {
            validations?: { [x: string]: any }
        }
    }

    // handles making this.$v work within a component context, but it isn't typed
    // at all right now. still need to look in depth at @mrellipse's version
    module 'vue/types/vue' {
        interface Vue {
            $v?: { [x: string]: any }
        }
    }

    // definitions of what vuelidate exports help keep typescript from yelling
    export const validationMixin: {
        data: () => { [x: string]: any }
        beforeCreate: () => void
        beforeDestroy: () => void
    };

    export function withParams(
        paramsOrClosure: any,
        maybeValidator: any,
    ): (...args: any[]) => any;

    // these are untested, the Vue.use approach to make it a global mixin
    export function Vuelidate(Vue: vue): void;
    export default function (Vue: vue): void;
}
