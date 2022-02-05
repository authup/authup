<!--
  Copyright (c) 2021-2021.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
  -->
<script>
export default {
    props: {
        total: {
            type: Number,
            default: 0,
        },
        limit: {
            type: Number,
            default: 0,
        },
        offset: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            busy: false,
        };
    },
    computed: {
        totalPages() {
            if (this.limit === 0 || this.total === 0) return 1;

            const pages = Math.ceil(this.total / this.limit);
            return pages >= 1 ? pages : 1;
        },
        currentPage() {
            if (this.limit === 0 || this.total === 0) return 1;

            return Math.floor(this.offset / this.limit) + 1;
        },
        pages() {
            const pages = [];

            for (let i = this.currentPage - 2; i < (this.currentPage + 2); i++) {
                if (i <= 0 || i > this.totalPages) continue;

                pages.push(i);
            }

            return pages;
        },
    },
    methods: {
        goTo(page) {
            if (this.busy || page === this.currentPage) return;

            const data = {
                page,
                offset: (page - 1) * this.limit,
                limit: this.limit,
            };

            const result = new Promise(((resolve, reject) => this.$emit('to', data, resolve, reject)));
            result.then(() => {
                this.busy = false;
            }).catch(() => {
                this.busy = false;
            });
        },
    },
};
</script>
<template>
    <ul class="pagination justify-content-center">
        <li
            v-if="currentPage > 1"
            class="page-item"
        >
            <button
                :disabled="busy"
                class="page-link"
                @click.prevent="goTo(currentPage-1)"
            >
                <i class="fa fa-chevron-left" />
            </button>
        </li>
        <li
            v-for="(page, key) in pages"
            :key="key"
            :class="{'active': page === currentPage}"
            class="page-item"
        >
            <button
                :disabled="busy"
                class="page-link"
                @click.prevent="goTo(page)"
            >
                {{ page }}
            </button>
        </li>
        <li
            v-if="currentPage < totalPages"
            class="page-item"
        >
            <button
                :disabled="busy"
                class="page-link"
                @click.prevent="goTo(currentPage+1)"
            >
                <i class="fa fa-chevron-right" />
            </button>
        </li>
    </ul>
</template>
<style>
.pagination > li > .page-link {
    color: #333;
    background-color: #eee;
    border: 1px solid #eee;
    cursor:pointer;
    padding: 5px 8px;
}

.pagination > .active > .page-link,
.pagination > .active > .page-link:focus,
.pagination > .active > .page-link:hover,
.pagination > li > .page-link:focus,
.pagination > li > .page-link:hover {
    background-color: #30373e;
    color: #FFF;
    border: 1px solid #30373e;
}
</style>
