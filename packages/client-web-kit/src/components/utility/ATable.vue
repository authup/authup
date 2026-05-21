<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/**
 * Authup-side wrapper around `<VCTable>` that:
 *
 * 1. Accepts the legacy `<BTable>` prop shape (`:items` + `:fields`)
 *    so page-level migration from bootstrap-vue-next stays mechanical.
 * 2. Declares per-column slots with a permissive index-signature
 *    (`[key: string]: ...`), which `<VCTable>`'s strict `SlotsType`
 *    doesn't model (Vue typed-slot generics can't express dynamic
 *    `cell-<key>` names today).
 *
 * Runtime is a straight pass-through — `#cell-<columnKey>` slots flow
 * verbatim to `<VCTable>`, which resolves them via Vue's standard slot
 * dispatch. No behavioural divergence from using `<VCTable>` directly.
 *
 * TODO: drop this wrapper when vuecs adds dynamic-slot typing for
 * `cell-<key>` / `header-<key>` to `<VCTable>`'s `SlotsType`. The
 * compromise here is purely a TS limitation; runtime behaviour is the
 * same as calling `<VCTable>` directly with `#cell-<key>` slots.
 */
import type { PropType, SlotsType } from 'vue';
import { defineComponent } from 'vue';
import { VCTable } from '@vuecs/table';
import type { TableColumn } from '@vuecs/table';

type AnyFn = (props: any) => any;

export default defineComponent({
    name: 'ATable',
    inheritAttrs: false,
    props: {
        items: { type: Array as PropType<Record<string, any>[]>, default: () => [] },
        fields: { type: Array as PropType<TableColumn<Record<string, any>>[]>, default: () => [] },
        busy: { type: Boolean, default: false },
        bordered: { type: Boolean, default: false },
        striped: { type: Boolean, default: false },
        hover: { type: Boolean, default: true },
    },
    slots: Object as SlotsType<{ [key: string]: AnyFn }>,
});
</script>

<template>
    <VCTable
        :columns="(fields as never)"
        :data="(items as never)"
        :busy="busy"
        :bordered="bordered"
        :striped="striped"
        :hover="hover"
        v-bind="$attrs"
    >
        <template
            v-for="(_, slotName) in $slots"
            #[slotName]="slotProps"
        >
            <slot
                :name="slotName"
                v-bind="slotProps || {}"
            />
        </template>
    </VCTable>
</template>
