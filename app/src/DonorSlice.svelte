<script lang="ts">
    import type { Donor } from './types';

    export let innerRadius: number = 800;
    export let outerRadius: number = 1000;
    export let donor: Donor;
    export let toAngle: (a: number) => number;

    $: arcLength = toAngle(donor._total) * outerRadius;
    $: isSmall = arcLength < 10;
    $: isTooSmall = arcLength < 15;

    $: centerAngle = (donor.startAngle + donor.endAngle) * 0.5;
    $: labelX = Math.sin(centerAngle) * innerRadius;

    $: labelY = -Math.cos(centerAngle) * innerRadius;
    $: rotateLabel = centerAngle > Math.PI * 1;
    $: labelAngle = centerAngle - Math.PI * 0.5 + (rotateLabel ? Math.PI : 0);

    function toDegree(rad: number): number {
        return (rad / Math.PI) * 180;
    }
</script>

<g class="donor">
    {#if !isTooSmall}
        <text
            class:rotate={rotateLabel}
            transform="translate({[labelX, labelY]}) rotate({toDegree(
                labelAngle
            )})">{donor.key}</text
        >
    {:else}
        <line
            y2={donor.key.length * 5}
            transform="rotate({toDegree(centerAngle + Math.PI)}) translate({[
                0,
                innerRadius
            ]})"
        />
    {/if}
</g>

<style>
    text {
        text-anchor: start;
        font-size: 13px;
        /* eslint-disable-next-line */
        dominant-baseline: middle;
    }
    text.rotate {
        text-anchor: end;
    }
    line {
        stroke: #ccc;
        stroke-width: 3px;
    }
</style>
