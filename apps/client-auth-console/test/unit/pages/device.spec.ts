/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import DevicePage from '../../../src/pages/device.vue';

const HYDRATION_PAYLOAD = Symbol.for('HYDRATION_PAYLOAD');

const DeviceVerifyFormStub = defineComponent({
    name: 'ADeviceVerifyForm',
    props: {
        userCode: {
            type: String,
            default: undefined,
        },
        registerLink: {
            type: Object,
            default: undefined,
        },
        passwordForgotLink: {
            type: Object,
            default: undefined,
        },
    },
    emits: ['done', 'failed'],
    template: '<div class="device-verify-form-stub" />',
});

const AuthShellStub = {
    name: 'AAuthShell',
    template: '<div class="auth-shell-stub"><slot /></div>',
};

const TOAST_MANAGER = Symbol.for('VCToastManager');

type ToastEntry = {
    id: string,
    description?: string,
    color?: string
};

function createToastManagerStub() {
    return {
        entries: ref<ToastEntry[]>([]),
        generateId: () => 'vc-toast-1',
    };
}

const FEATURES = {
    registration: true,
    passwordRecovery: true,
    emailVerification: false,
};

function mountDevicePage(data: Record<string, any>) {
    const toastManager = createToastManagerStub();

    const wrapper = mount(DevicePage, {
        global: {
            provide: {
                [HYDRATION_PAYLOAD]: {
                    config: {
                        baseURL: 'https://example.com',
                        basePath: '/console/auth',
                    },
                    data,
                },
                [TOAST_MANAGER]: toastManager,
            },
            stubs: {
                ADeviceVerifyForm: DeviceVerifyFormStub,
                AAuthShell: AuthShellStub,
            },
        },
    });

    return { wrapper, toastManager };
}

function readRedirect(link: { href: string }) : string | null {
    return new URL(link.href, 'https://example.com').searchParams.get('redirect');
}

describe('device page', () => {
    it('hands the user code to the form', () => {
        const { wrapper } = mountDevicePage({ features: FEATURES, userCode: 'BCDFGHJK' });

        expect(wrapper.findComponent(DeviceVerifyFormStub).props('userCode')).toEqual('BCDFGHJK');
    });

    it('passes no code when the payload carries none', () => {
        const { wrapper } = mountDevicePage({ features: FEATURES });

        expect(wrapper.findComponent(DeviceVerifyFormStub).props('userCode')).toBeUndefined();
    });

    it('carries the device page as the redirect on both workflow links', () => {
        const { wrapper } = mountDevicePage({ features: FEATURES, userCode: 'BCDFGHJK' });
        const form = wrapper.findComponent(DeviceVerifyFormStub);

        const registerLink = form.props('registerLink') as { href: string };
        expect(registerLink.href.startsWith('/console/auth/register?')).toBeTruthy();
        expect(readRedirect(registerLink)).toEqual('/device?user_code=BCDFGHJK');

        const passwordForgotLink = form.props('passwordForgotLink') as { href: string };
        expect(passwordForgotLink.href.startsWith('/console/auth/password-forgot?')).toBeTruthy();
        expect(readRedirect(passwordForgotLink)).toEqual('/device?user_code=BCDFGHJK');
    });

    it('redirects back to the bare device page when no code was carried', () => {
        const { wrapper } = mountDevicePage({ features: FEATURES });
        const form = wrapper.findComponent(DeviceVerifyFormStub);

        expect(readRedirect(form.props('registerLink') as { href: string })).toEqual('/device');
    });

    it('withholds a link whose workflow is disabled', () => {
        const { wrapper } = mountDevicePage({
            features: {
                ...FEATURES,
                registration: false,
                passwordRecovery: false,
            },
            userCode: 'BCDFGHJK',
        });
        const form = wrapper.findComponent(DeviceVerifyFormStub);

        expect(form.props('registerLink')).toBeUndefined();
        expect(form.props('passwordForgotLink')).toBeUndefined();
    });

    it('toasts the failed emit', () => {
        const { wrapper, toastManager } = mountDevicePage({ features: FEATURES, userCode: 'BCDFGHJK' });

        wrapper.findComponent(DeviceVerifyFormStub).vm.$emit('failed', 'The code is invalid or has expired.');

        expect(toastManager.entries.value).toHaveLength(1);
        expect(toastManager.entries.value[0].description).toEqual('The code is invalid or has expired.');
        expect(toastManager.entries.value[0].color).toEqual('error');
    });
});
