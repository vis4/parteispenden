<script lang="ts">
    import RangeSlider from 'svelte-range-slider-pips';
    import { onMount } from 'svelte';
    import { tsvParse } from 'd3-dsv';
    import groupBy from 'underscore/modules/groupBy.js';
    import uniq from 'underscore/modules/uniq.js';
    import DonationCircle from './DonationCircle.svelte';
    import type { Donation, Party, Donor } from './types';

    let data: Donation[] = [];
    let donors: Donor[];
    let parties: Party[];

    $: filteredData = data.filter(donation => {
        if (
            dateRange.length &&
            (donation.date1.getFullYear() < dateRange[0] ||
                donation.date1.getFullYear() > dateRange[1])
        ) {
            return false;
        }
        if (
            amountRange.length &&
            (donation.donation < amountRange[0] * 1000 ||
                donation.donation > amountRange[1] * 1000)
        ) {
            return false;
        }
        return true;
    });

    $: {
        parties = Object.entries(
            groupBy(filteredData, (d: Donation) => d.party)
        )
            .map(
                ([name, donations]: [string, Donation[]]): Party => ({
                    name,
                    donations,
                    total: donations.reduce(
                        (prev: number, cur: Donation): number =>
                            prev + cur.donation,
                        0
                    )
                })
            )
            .sort((a: Party, b: Party): number => b.total - a.total);
        donors = Object.entries(
            groupBy(filteredData, (d: Donation) => d.donor_key)
        ).map(
            ([key, donations]: [string, Donation[]]): Donor => ({
                key,
                names: uniq(
                    donations.map((d: Donation): string => d.donor_name)
                ),
                addresses: uniq(
                    donations.map((d: Donation): string =>
                        `${d.addr1}\n${d.addr2}`.trim()
                    )
                ),
                donations,
                total: donations.reduce(
                    (prev: number, cur: Donation) => prev + cur.donation,
                    0
                )
            })
        );
    }

    $: {
    }

    let dateRange: number[] = [2002, 2021];
    let amountRange: number[];
    let maxDonation: number;

    onMount(async (): Promise<void> => {
        data = await loadData();

        maxDonation = data.reduce(
            (prev: number, cur: Donation): number =>
                Math.max(prev, cur.donation),
            0
        );
        amountRange = [50, Math.ceil(maxDonation / 1000)];
    });

    async function loadData(): Promise<Donation[]> {
        const res = await fetch('/donations.csv');
        return Array.from(
            tsvParse(await res.text(), (r: Donation) => ({
                ...r,
                party: r.party.trim(),
                donation: +r.donation,
                ts: new Date(r.date1).getTime(),
                date1: new Date(r.date1),
                date2: new Date(r.date2)
            }))
        );
    }

    let outerWidth: number;
</script>

<svelte:window bind:outerWidth />

<main>
    <section>
        <h1>Parteispenden in Deutschland</h1>
        <p>Diese Grafik zeigt Spenden an politische Parteien ab 50.000€.</p>
        <p>
            Jede Spende wird durch eine Linie repräsentiert, die von den
            Spendern im unteren Halbkreis zu den Parteien im oberen Halbkreis
            verläuft. Die Linien­stärke ist abhängig von der Höhe der Spende,
            die Farbe repräsentiert die Empfängerpartei.
        </p>
    </section>
    <DonationCircle
        data={filteredData}
        {parties}
        {donors}
        width={Math.min(outerWidth - 80, 1200)}
    />
    <section>
        Time:
        <RangeSlider
            range
            all="label"
            pips
            pipstep={5}
            pushy
            float
            bind:values={dateRange}
            step={1}
            min={2002}
            max={2021}
        />
        Donor:
        <RangeSlider
            range
            suffix="k"
            all="label"
            pushy
            float
            bind:values={amountRange}
            step={10}
            min={50}
            max={Math.ceil(maxDonation / 1000)}
        />
    </section>
</main>

<style>
    main {
        text-align: center;
        margin: 0 auto;
    }

    section {
        max-width: 800px;
        margin: 0 auto;
    }

    h1 {
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>
