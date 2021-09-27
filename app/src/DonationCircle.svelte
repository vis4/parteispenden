<script lang="ts">
    import type { Donation, Party, Donor } from './types';
    import { PARTY_STROKES } from './constants';

    import PartySlice from './PartySlice.svelte';
    import DonorSlice from './DonorSlice.svelte';
    import { onMount } from 'svelte';

    export let data: Donation[] = [];
    export let parties: Party[] = [];
    export let donors: Donor[] = [];
    // compute date range
    $: minDate = data.length ? data[0].ts : 0;
    $: maxDate = data.length ? data[data.length - 1].ts : 1;

    const TOTAL_PARTY_ANGLE: number = Math.PI * 0.6;
    const PARTY_ANGLE_OFFSET: number = TOTAL_PARTY_ANGLE * -0.5;

    const TOTAL_DONOR_ANGLE: number = Math.PI * 1.35;
    const DONOR_ANGLE_OFFSET: number = Math.PI + TOTAL_DONOR_ANGLE * -0.5;

    function partyAngle(amount: number) {
        return (TOTAL_PARTY_ANGLE * amount) / totalDonationSum;
    }

    export let scaleDonors: boolean = true;

    function donorAngle(amount: number) {
        return (
            (TOTAL_DONOR_ANGLE * amount) /
            (scaleDonors ? totalDonationSum : totalDonationCount)
        );
    }

    $: totalDonationSum = data.reduce(
        (prev: number, cur: Donation): number => prev + cur.donation,
        0
    );
    $: totalDonationCount = data.length;
    $: {
        let offset: number = 0;
        parties.forEach((party: Party) => {
            party.startAngle = partyAngle(offset) + PARTY_ANGLE_OFFSET;
            party.endAngle =
                partyAngle(offset + party.total) + PARTY_ANGLE_OFFSET;
            offset += party.total;
        });
        offset = 0;
        sortedDonors.forEach((donor: Donor) => {
            donor._total = scaleDonors ? donor.total : donor.donations.length;
            donor.startAngle = donorAngle(offset) + DONOR_ANGLE_OFFSET;
            donor.endAngle =
                donorAngle(offset + donor._total) + DONOR_ANGLE_OFFSET;
            offset += donor._total;
        });
    }

    $: sortedDonors = donors
        .slice(0)
        .sort(
            scaleDonors
                ? (a: Donor, b: Donor): number => a.total - b.total
                : (a: Donor, b: Donor): number =>
                      a.donations.length - b.donations.length
        );

    export let width: number = 1000;
    $: radius = width * 0.5;
    $: innerRadius = radius * 0.8;

    let canvasScale = 1;
    let canvas;
    let _prevRadius;
    let _prevDonationCount;
    let redraw = false;
    $: {
        if (_prevRadius !== radius) {
            _prevRadius = radius;
            redraw = true;
        }
        if (_prevDonationCount !== data.length) {
            _prevDonationCount = data.length;
            redraw = true;
        }
    }

    function frame() {
        if (redraw && canvas) {
            redraw = false;
            draw(data, radius, innerRadius);
        }
        requestAnimationFrame(frame);
    }

    onMount(() => {
        canvasScale = window.devicePixelRatio;
        frame();
    });

    function draw(data: Donation[], radius: number, innerRadius: number): void {
        console.log('draw', width, canvasScale);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, width);
        ctx.save();
        ctx.translate(radius, radius);
        ctx.scale(canvasScale, canvasScale);

        const partyMap: Map<string, Party> = new Map(
            parties.map(party => {
                party.count = 0;
                return [party.name, party];
            })
        );
        const donorMap: Map<string, Donor> = new Map(
            donors.map(donor => {
                donor.count = 0;
                return [donor.key, donor];
            })
        );

        for (const donation of data) {
            ctx.beginPath();
            ctx.strokeStyle = PARTY_STROKES[donation.party] || '#ccc';
            ctx.lineWidth = Math.pow(donation.donation / 250000, 0.5);
            const party: Party = partyMap.get(donation.party);
            const donor: Donor = donorMap.get(donation.donor_key);
            const pf = party.count / party.donations.length;
            const df =
                donor.donations.length === 1
                    ? 0.5
                    : donor.count / donor.donations.length;
            const ppad = 0.01;
            const pa =
                Math.PI * -0.5 +
                (party.startAngle + ppad) +
                (1 - pf) * (party.endAngle - party.startAngle - ppad * 2);
            const dpad = 0.03;
            const da =
                Math.PI * -0.5 +
                (donor.startAngle + dpad) +
                df * (donor.endAngle - donor.startAngle - dpad * 2);
            const px = Math.cos(pa) * innerRadius;
            const py = Math.sin(pa) * innerRadius;
            const dx = Math.cos(da) * (innerRadius - 5);
            const dy = Math.sin(da) * (innerRadius - 5);
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(0, 0, dx, dy);
            ctx.stroke();
            donor.count++;
            party.count++;
        }
        ctx.restore();
    }
</script>

<div class="outer" style="width:{width}px;height:{width}px">
    <svg {width} height={width}>
        <g transform="translate({[width * 0.5, width * 0.5]})">
            <g class="parties">
                {#each parties as party}
                    <PartySlice
                        toAngle={partyAngle}
                        {party}
                        outerRadius={radius}
                        {innerRadius}
                    />
                {/each}
            </g>
            <g class="donors">
                {#each sortedDonors as donor}
                    <DonorSlice
                        toAngle={donorAngle}
                        {donor}
                        outerRadius={radius}
                        {innerRadius}
                    />
                {/each}
            </g>
        </g>
    </svg>
    <canvas
        bind:this={canvas}
        width={width * canvasScale}
        height={width * canvasScale}
        style="width:{width}px;height:{width}px"
    />
</div>

<style>
    svg {
        overflow: visible;
    }
    .outer {
        position: relative;
        margin: 0 auto;
    }
    canvas,
    svg {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }
</style>
