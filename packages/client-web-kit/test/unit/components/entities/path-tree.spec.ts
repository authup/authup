/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import APathTree from '../../../../src/components/entities/path/APathTree.vue';
import { mountKitComponent } from '../../../utils';

function buildPath(path: string) : Path {
    return {
        id: path,
        name: path.split('/').pop() as string,
        path,
    } as Path;
}

/** Rows arrive unsorted on purpose: the pane is what orders them. */
const PATHS = [
    buildPath('sales/berlin'),
    buildPath('sales'),
    buildPath('sales2'),
    buildPath('sales/berlin/east'),
];

/** The rows a visitor can actually see: a collapsed branch renders none. */
function readRows(wrapper: VueWrapper) {
    return wrapper.findAll('[role="treeitem"]').map((item) => ({
        label: item.find('.vc-tree-item-label').text(),
        level: item.attributes('aria-level'),
        selected: item.attributes('aria-selected'),
    }));
}

async function mountTree(props: Record<string, any> = {}) {
    const { wrapper } = mountKitComponent(APathTree, {
        paths: PATHS,
        ...props,
    });

    await flushPromises();

    return wrapper;
}

describe('components/entities/path/APathTree', () => {
    it('should render the roots alphabetically, their subtrees collapsed', async () => {
        const wrapper = await mountTree();

        // `sales` arrives after `sales/berlin` and is still the first row:
        // the pane sorts, so the tree does not depend on the page order the
        // rows happened to be read in.
        expect(readRows(wrapper)).toEqual([
            {
                label: 'sales',
                level: '1',
                selected: 'false',
            },
            {
                label: 'sales2',
                level: '1',
                selected: 'false',
            },
        ]);
    });

    it('should reveal a deep-linked folder by expanding its ancestors', async () => {
        // Nothing was expanded by hand, so a `?path=` link landing on a
        // third-level folder is only reachable because the pane opened the
        // chain down to it for itself.
        const wrapper = await mountTree({ modelValue: 'sales/berlin/east' });

        expect(readRows(wrapper)).toEqual([
            {
                label: 'sales',
                level: '1',
                selected: 'false',
            },
            {
                label: 'berlin',
                level: '2',
                selected: 'false',
            },
            {
                label: 'east',
                level: '3',
                selected: 'true',
            },
            {
                label: 'sales2',
                level: '1',
                selected: 'false',
            },
        ]);
    });

    it('should select a folder by its FULL path, never by its own segment', async () => {
        const wrapper = await mountTree({ modelValue: 'sales/berlin/east' });

        // The row reads `berlin`; `sales/berlin` is what `?path=` carries and
        // what the subtree lookup resolves, so the bare segment would scope
        // the list to nothing.
        await wrapper.findAll('[role="treeitem"]')[1].trigger('click');
        await flushPromises();

        expect(wrapper.emitted('update:modelValue')).toEqual([['sales/berlin']]);
        expect(wrapper.emitted('change')).toEqual([['sales/berlin']]);
    });

    it('should render folders that arrive after the first paint', async () => {
        // The realm's folders are walked page by page after mount, so the
        // pane has to grow with them rather than freeze on the empty list it
        // was created with.
        const wrapper = await mountTree({ paths: [] });
        expect(readRows(wrapper)).toEqual([]);

        await wrapper.setProps({ paths: PATHS });
        await flushPromises();

        expect(readRows(wrapper).map((row) => row.label)).toEqual(['sales', 'sales2']);
    });
});
