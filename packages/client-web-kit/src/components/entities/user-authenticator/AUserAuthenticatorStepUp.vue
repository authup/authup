<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { useTranslations } from '../../../core';
import AMfaChallengeForm from '../../workflows/mfa/AMfaChallengeForm.vue';
import type { AuthenticatorStepUp } from './types';

/**
 * Renders the challenge a pending {@link AuthenticatorStepUp} owes, with a
 * way out that cancels it.
 */
export default defineComponent({
    components: {
        AMfaChallengeForm,
        VCButton,
    },
    props: {
        stepUp: {
            type: Object as PropType<AuthenticatorStepUp>,
            required: true,
        },
    },
    setup() {
        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        return { translations };
    },
});
</script>
<template>
    <div v-if="stepUp.status.value">
        <AMfaChallengeForm
            :kinds="stepUp.status.value.kinds"
            :challenge="stepUp.status.value.challenge ?? null"
            @done="stepUp.complete()"
        />
        <div class="flex justify-center mt-3">
            <VCButton
                color="neutral"
                :label="translations.abort"
                @click="stepUp.cancel()"
            />
        </div>
    </div>
</template>
