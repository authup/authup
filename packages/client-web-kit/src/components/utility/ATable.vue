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
 *
 * 2. Bridges the legacy `#cell-<columnKey>` slot pattern (`<BTable>`,
 *    `<b-table>`, `@vuecs/list-controls` 2.x `buildTable`) onto
 *    `<VCTable>`'s manual body API.
 *
 *    Why this is non-trivial: when `<VCTable>` auto-renders cells
 *    from `:columns`, it calls `<VCTableCell>` WITHOUT forwarding the
 *    parent's slots, so a `#cell-options` slot defined on the parent
 *    is silently dropped (the cell falls back to `String(row[key])`).
 *    The replacement pattern in vuecs 1.x is per-column `formatter`
 *    functions — but authup has ~10 page-level call sites written
 *    against `<template #cell-<key>>` and rewriting them to formatters
 *    would mean either inline `h(...)` in the columns config (verbose,
 *    no template ergonomics) or per-page render-function refactors.
 *
 *    To keep the call sites idiomatic, this wrapper renders
 *    `<VCTableHeader>` / `<VCTableBody>` explicitly and dispatches
 *    `slots[\`cell-${field.key}\`]` per cell. Slot props match the
 *    bvnext shape: `{ row, item, value, index }` — `item` is an alias
 *    for `row` since both naming conventions exist in the codebase.
 *
 *    Header labels also use the `#header-<columnKey>` slot pattern
 *    (no current authup consumer, but matches the slot name
 *    `<VCTable>`'s `TableColumn` JSDoc documents).
 *
 * 3. The wrapper also drops `<VCTable>`'s default header styling
 *    contribution from this path — `tableHeadCell` theme classes still
 *    apply, so the theme-bootstrap `uppercase` etc. is honored
 *    or overridden via the consumer app's `vuecs` plugin overrides
 *    (see `apps/client-web/plugins/vuecs.ts`).
 */
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
    VCTable,
    VCTableBody,
    VCTableCell,
    VCTableHeadCell,
    VCTableHeader,
    VCTableRow,
} from '@vuecs/table';
import type { TableColumn } from '@vuecs/table';

// Permissive `any` shapes here are intentional — the wrapper exists
// precisely to accept the legacy `<BTable>` row/field shapes (mixed
// per-entity record types). `TableColumn` is invariant in its `Row`
// type parameter (the `accessor: (row: Row) => unknown` arm makes it
// contravariant in TS strict mode), so `TableColumn<User>` does NOT
// assign to `TableColumn<Record<string, any>>`. We accept
// `TableColumn<any>[]` to keep page-level typings ergonomic while
// preserving header/cell-class autocomplete at the call site. See the
// file-level JSDoc above for the broader rationale.
/* eslint-disable @typescript-eslint/no-explicit-any */
export default defineComponent({
    name: 'ATable',
    components: {
        VCTable,
        VCTableHeader,
        VCTableBody,
        VCTableRow,
        VCTableHeadCell,
        VCTableCell,
    },
    inheritAttrs: false,
    props: {
        items: { type: Array as PropType<Record<string, any>[]>, default: () => [] },
        fields: { type: Array as PropType<TableColumn<any>[]>, default: () => [] },
        busy: { type: Boolean, default: false },
        bordered: { type: Boolean, default: false },
        striped: { type: Boolean, default: false },
        hover: { type: Boolean, default: true },
    },
});
/* eslint-enable @typescript-eslint/no-explicit-any */
</script>

<template>
    <VCTable
        :data="(items as never)"
        :busy="busy"
        :bordered="bordered"
        :striped="striped"
        :hover="hover"
        v-bind="$attrs"
    >
        <VCTableHeader>
            <VCTableRow>
                <VCTableHeadCell
                    v-for="field in fields"
                    :key="field.key"
                    :column-key="field.key"
                    :class="[field.class, field.headerClass]"
                >
                    <slot
                        :name="`header-${field.key}`"
                        :field="field"
                    >
                        {{ field.label ?? field.key }}
                    </slot>
                </VCTableHeadCell>
            </VCTableRow>
        </VCTableHeader>
        <VCTableBody>
            <template #row="{ row, index }: { row: Record<string, any>, index: number }">
                <VCTableRow
                    :row="row"
                    :index="index"
                >
                    <VCTableCell
                        v-for="field in fields"
                        :key="field.key"
                        :column-key="field.key"
                        :class="[field.class, field.cellClass]"
                    >
                        <slot
                            :name="`cell-${field.key}`"
                            :row="row"
                            :item="row"
                            :value="row[field.key]"
                            :index="index"
                        >
                            {{ row[field.key] }}
                        </slot>
                    </VCTableCell>
                </VCTableRow>
            </template>
        </VCTableBody>
    </VCTable>
</template>
