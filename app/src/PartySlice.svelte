<script lang="ts">
    import type { Party } from './types';
    import { arc as d3arc } from 'd3-shape';
    import { PARTY_FILLS } from './constants';

    export let outerRadius: number = 1000;
    export let innerRadius: number = 800;
    export let party: Party;
    export let toAngle: (a: number) => number;

    let pathD: string;

    $: {
        const arc = d3arc();

        pathD = arc({
            startAngle: party.startAngle,
            endAngle: party.endAngle,
            innerRadius,
            outerRadius
        });
    }

    $: arcLength = toAngle(party.total) * outerRadius;
    $: isSmall = arcLength < 80;
    $: isTooSmall = arcLength < 20;

    $: centerAngle = (party.startAngle + party.endAngle) * 0.5;
    $: labelX = Math.sin(centerAngle) * (innerRadius + outerRadius) * 0.5;

    $: labelY = -Math.cos(centerAngle) * (innerRadius + outerRadius) * 0.5;

    $: labelAngle = isSmall ? centerAngle - Math.PI * 0.5 : centerAngle;
</script>

<g class="party">
    <path class:isSmall d={pathD} style="fill:{PARTY_FILLS[party.name]}" />
    {#if !isTooSmall}
        <text
            transform="translate({[labelX, labelY]}) rotate({(labelAngle /
                Math.PI) *
                180})">{party.name}</text
        >
    {/if}
</g>

<style>
    path {
        fill: #ccc;
    }
    text {
        font-weight: bold;
        fill: white;
        text-shadow: rgb(0, 0, 0) 1px 1px 5px;
        text-anchor: middle;
        /* eslint-disable-next-line */
        dominant-baseline: middle;
    }
</style>
