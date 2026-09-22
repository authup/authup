<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { createColorMode } from '@authup/client-web-kit';
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'vue-chartjs';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    onMounted,
    ref,
    watch,
} from 'vue';
import { readThemeToken } from './theme';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export type EventVolumeSeries = {
    label: string,
    values: number[],
    /**
     * The css custom property the series is painted with, resolved at
     * render time so the chart follows the theme and its dark flip.
     */
    token: string,
};

type ChartTheme = {
    ink: string,
    grid: string,
    surface: string,
    series: string[],
};

// A stacked column chart over the window's buckets: thin columns, a rounded
// data end, a surface-coloured seam between the segments, a legend for the
// two series and the shared tooltip. Colours are the theme's own tokens,
// re-read when the colour mode flips, because a canvas cannot read css.
export default defineComponent({
    components: { Bar },
    props: {
        labels: {
            type: Array as PropType<string[]>,
            required: true,
        },
        titles: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        series: {
            type: Array as PropType<EventVolumeSeries[]>,
            required: true,
        },
    },
    setup(props) {
        const resolveTheme = (): ChartTheme => ({
            ink: readThemeToken('--vc-color-fg-muted', '#5b646c'),
            grid: readThemeToken('--vc-color-border', '#dedede'),
            surface: readThemeToken('--vc-color-bg-elevated', '#ffffff'),
            series: props.series.map((entry) => readThemeToken(entry.token, '#6d7fcc')),
        });

        const theme = ref<ChartTheme>(resolveTheme());
        const { isDark } = createColorMode();

        onMounted(() => {
            theme.value = resolveTheme();
        });
        watch(isDark, () => {
            theme.value = resolveTheme();
        }, { flush: 'post' });
        watch(() => props.series.map((entry) => entry.token).join(','), () => {
            theme.value = resolveTheme();
        });

        const data = computed<ChartData<'bar'>>(() => ({
            labels: props.labels,
            datasets: props.series.map((entry, index) => ({
                label: entry.label,
                data: entry.values,
                backgroundColor: theme.value.series[index],
                hoverBackgroundColor: theme.value.series[index],
                borderColor: theme.value.surface,
                borderWidth: 1,
                borderSkipped: 'bottom',
                borderRadius: index === props.series.length - 1 ? 4 : 0,
                maxBarThickness: 24,
            })),
        }));

        const options = computed<ChartOptions<'bar'>>(() => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: theme.value.ink,
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                    },
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const [item] = items;
                            if (!item) {
                                return '';
                            }

                            return props.titles[item.dataIndex] ?? String(item.label);
                        },
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    border: { color: theme.value.grid },
                    ticks: {
                        color: theme.value.ink,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12,
                    },
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: theme.value.grid },
                    ticks: {
                        color: theme.value.ink,
                        precision: 0,
                        maxTicksLimit: 5,
                    },
                },
            },
        }));

        return {
            data,
            options,
        };
    },
});
</script>
<template>
    <div class="relative h-64">
        <Bar
            :data="data"
            :options="options"
        />
    </div>
</template>
