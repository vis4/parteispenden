
(function() {

    var or,
        ow = 1000,
        config = {
            container: 'circle',
            colors: {
                'CDU': '#313131', 'SPD': '#E2001A', 'GRÜNE': '#1FA12D', 'FDP': '#F1EB01', 'CSU' : '#0088CE',
                'MLPD': '#b92919', 'BSU': '#FFA700', 'LINKE': '#AB0C9F', 'NPD': '#775C44', 'AGFG': '#D3723D',
                'DVU': '#6B6B6B'
            }, strokes: {
                'CDU': '#616161', 'SPD': '#E2001A', 'GRÜNE': '#1FA12D', 'FDP': '#A39E01', 'CSU' : '#0088CE',
                'MLPD': '#b92919', 'BSU': '#C68100', 'LINKE': '#AB0C9F', 'NPD': '#775C44', 'AGFG': '#B45A29',
                'DVU': '#888888'
            }
        },
        monthNames = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
        monthNamesAbbr = ["Jan","Feb","März","April","Mai","Juni","Juli","Aug","Sep","Okt","Nov","Dez"],
        lines = [],
        party_arcs = {},
        party_labels = {},
        donor_labels = {},
        data,
        selected_donors = [],
        hovered_donor = null,
        donor_search = '',
        selected_parties = [],
        hovered_party = null,
        donation_range = [],
        time_range = [],
        hover_month;

    function str2ts(s) {
        return Math.round(Date.UTC(s)*0.001);
    }

    function makeData(csv) {
        data = {
            donations: [],
            donors: {},
            num_donors: 0,
            donorTotal: {},
            donorCount: {},
            donorFulltext: {},
            parties: {},
            num_parties: 0,
            total: 0,
            minDate: Number.MAX_VALUE,
            maxDate: 0,
            maxAmount: 0
        };
        $.each(csv.split('\n'), function(i, row) {
            if (!i) return;
            if (row === "") return;
            row = row.split('\t');
            var donation = {
                party: row[0],
                amount: Number(row[2]),
                name: row[3],
                key: row[1],
                addr1: row[4],
                addr2: row[5],
                date_s: row[6],
                date1: new Date(row[6]),
                date2: new Date(row[7]),
                ts: Math.round((new Date(row[6])).getTime() * 0.001)
            };
            if (!data.donors[donation.key]) {
                data.donors[donation.key] = donation.name;
                data.num_donors++;
            }
            data.donorFulltext[donation.key] += donation.name + ' \n' + donation.addr1 + ' \n' + donation.addr2 + ' \n';
            if (!data.parties[donation.party]) {
                data.parties[donation.party] = { total: 0, count: 0 };
                data.num_parties++;
            }
            data.donations.push(donation);
            data.minDate = Math.min(data.minDate, donation.ts);
            data.maxDate = Math.max(data.maxDate, donation.ts);
            data.total += donation.amount;
            data.maxAmount = Math.max(data.maxAmount, donation.amount);
            data.parties[donation.party].total += donation.amount;
            if (!data.donorTotal[donation.key]) data.donorTotal[donation.key] = 0;
            if (!data.donorCount[donation.key]) data.donorCount[donation.key] = 0;
            data.donorTotal[donation.key] += donation.amount;
            data.donorCount[donation.key] += 1;
            data.parties[donation.party].count++;
        });
        return data;
    }

    function drawDonationCircle() {

        or = Math.min(innerHeight * 0.5, ($('#wrapper').width()-(innerWidth < 1220 ? 270 : 550)) * 0.5);
        config.cx = or * 1.1;
        config.cy = or;
        config.r = or * 0.8;
        config.or = or * 0.95;
        $('#'+config.container).html('');
        lines = [];
        donor_labels = {};
        party_labels = {};
        party_arcs = {};

        var paper = Raphael(config.container, or * 2.2, or*2.2);

        // draw donor names
        var darr = [], parr = [], dang = {}, pang = {};
        for (var donor_name in data.donors) darr.push(donor_name);
        for (var pname in data.parties) parr.push({ name: pname, total: data.parties[pname].total, count: data.parties[pname].count });

        var sortBy = $('#sort').val();
        if (sortBy == 'name') darr.sort();
        else if (sortBy == 'total') darr.sort(function(a,b) { return data.donorTotal[a] - data.donorTotal[b]; });
        else if (sortBy == 'count') darr.sort(function(a,b) { return data.donorCount[a] - data.donorCount[b]; });
        else if (sortBy == 'average') darr.sort(function(a,b) { return data.donorTotal[a] / data.donorCount[a] - data.donorTotal[b] / data.donorCount[b]; });
        $.each(darr, function(i) {
            var mir = i > darr.length * 0.5,
                a = ((mir ? darr.length % 2 === 0 ? i - 1 : i-0.5 : i) / darr.length) * 220- 20,
                tx = config.cx + (config.r+3) * (mir ? -1 : 1),
                ty = config.cy+(mir ? -5 : 10),
                lbl = darr[mir ? darr.length - ( i - Math.floor(darr.length * 0.5) ) : i],
                t = paper.text(tx, ty, lbl)
                    .attr({
                        'font-family': 'Helvetica Neue, Arial',
                        'font-size': 10,
                        'font-weight': '400',
                        'text-anchor': mir ? "end" : "start",
                        'cursor': 'pointer'
                    });

            t.rotate(mir ? 108-a : a, config.cx, config.cy);

            donor_labels[lbl] = t;
            dang[darr[i]] = (i / darr.length) * 220 - 20;
        });
        var a0 = -155, ta = 130, sa = 0, ma = 3;

        parr.sort(function(a,b) { return a.total < b.total ? +1 : (a.total == b.total ? 0 : -1); });
        for (i=0;i<parr.length;i++) {
            sa += Math.max(ma, ta * (parr[i].total / data.total));
        }

        $.each(parr, function(i, party) {
            var a = (ta/sa) * Math.max(ma, ta*(parr[i].total / data.total));
            var big = a > 12;
            // draw arc
            var x0 = config.cx+Math.cos(Raphael.rad(a0))*config.r, y0 = config.cy+Math.sin(Raphael.rad(a0))*config.r,
                x1 = config.cx+Math.cos(Raphael.rad(a0+a))*config.r, y1 = config.cy+Math.sin(Raphael.rad(a0+a))*config.r,
                x2 = config.cx+Math.cos(Raphael.rad(a0+a))*config.or, y2 = config.cy+Math.sin(Raphael.rad(a0+a))*config.or,
                x3 = config.cx+Math.cos(Raphael.rad(a0))*config.or, y3 = config.cy+Math.sin(Raphael.rad(a0))*config.or;

            var arc = paper.path("M"+x0+" "+y0+" A"+config.r+","+config.r+" 0 0,1 "+x1+","+y1+" L"+x2+" "+y2+" A"+config.or+","+config.or+" 0 0,0 "+x3+" "+y3+" Z");
            arc.attr({ fill: config.colors[parr[i].name], stroke: false, cursor: 'pointer' });
            arc.node.party = party.name;
            party_arcs[party.name] = arc;

            a0 += a;
            var tx = config.cx + (big ? 0 : config.r+(config.or - config.r) * 0.5),
                ty = config.cy + (big ? -config.r - (config.or - config.r) * 0.5 : 0),
                t = paper.text(tx, ty, party.name)
                    .attr({
                        font: 'bold '+(big ? 15 : 11)+'px Helvetica Neue, Arial',
                        fill: '#fff',
                        cursor: 'pointer'
                    });
            t.rotate(big ? a0+90-a * 0.5 : a0 - a * 0.5, config.cx, config.cy, false);
            $(t.node).css('text-shadow', '#000000 1px 1px 5px');
            party_labels[party.name] = t;
            pang[parr[i].name] = [a0, a0+a];
        });

        lines = [];

        $.each(data.donations, function(i, don) {

            var r = config.r-3,
                f = ((don.ts - data.minDate) / (data.maxDate - data.minDate)),
                da = pang[don.party][0] - (1 - f) * (pang[don.party][1]-pang[don.party][0]),
                pa = dang[don.key]*1+1.8 + (1-f)*1,
                px = config.cx + Math.cos(Raphael.rad(da)) * config.r,
                py = config.cy + Math.sin(Raphael.rad(da)) * config.r,
                pxc = config.cx + Math.cos(Raphael.rad(da)) * config.r * 0.5,
                pyc = config.cy + Math.sin(Raphael.rad(da)) * config.r * 0.5,
                dx = config.cx + Math.cos(Raphael.rad(pa)) * r,
                dy = config.cy + Math.sin(Raphael.rad(pa)) * r,
                dxc = config.cx + Math.cos(Raphael.rad(pa)) * r * 0.5,
                dyc = config.cy + Math.sin(Raphael.rad(pa)) * r * 0.5;

            var p = paper.path('M'+dx+' '+dy+' C'+dxc+','+dyc+' '+pxc+','+pyc+' '+px+','+py)
                .attr({
                    stroke: config.strokes[don.party],
                    opacity: 0.8,
                    'stroke-width': don.amount / 500000 + 0.4
                });
            p.node.data = don;
            lines.push(p);
        });

        $('#notepad svg').hover(function() {
            for (var i=0; i<lines.length; i++) {
                lines[i].attr({ opacity: 0.8 });
            }
        });

    }

    Raphael.el.fadeTo = function(opacity, duration) {
        if (Raphael.svg) {
            $(this.node).stop().transition({
                opacity: opacity
            }, duration);
        } else {
            this.attr({ opacity: opacity });
        }
    };

    Raphael.el.opacity = function(opacity) {
        if (Raphael.svg) {
            $(this.node).stop().css({
                opacity: opacity
            });
        } else {
            this.attr({ opacity: opacity });
        }
    };

    function initUI(noSlider) {

        if (!noSlider) initTimeSlider();
        if (!noSlider) initAmountSlider();
        initDonorLabels();
        initPartyArcs();
        initResetButton();
        initSearch();

        function initAmountSlider() {
            var slider = $('#amount-range'),
                lower = $('#amount-range-lower'),
                upper = $('#amount-range-upper');

            slider.noUiSlider({
                start: [50000, data.maxAmount],
                range: [50000, data.maxAmount],
                step: 5000,
                connect: true,
                handles: 2,
                margin: 10,
                slide: function () {
                    donation_range = slider.val();
                    lower.html(fmt_amount(donation_range[0]));
                    upper.html(fmt_amount(donation_range[1]));
                    updateFilter();
                },
                set: function() {
                    lower.html(fmt_amount(slider.val()[0]));
                    upper.html(fmt_amount(slider.val()[1]));
                }
            });
            lower.html(fmt_amount(50000));
            upper.html(fmt_amount(data.maxAmount));

            donation_range = [50000, data.maxAmount];
        }

        function initTimeSlider() {
            var slider = $('#time-range'),
                lower = $('#time-range-lower'),
                upper = $('#time-range-upper');

            slider.noUiSlider({
                start: [data.minDate, data.maxDate],
                range: [data.minDate, data.maxDate],
                step: 3600,
                connect: true,
                handles: 2,
                margin: 10,
                slide: function () {
                    time_range = slider.val();
                    lower.html(fmt_date(time_range[0]));
                    upper.html(fmt_date(time_range[1]));
                    updateFilter();
                },
                set: function() {
                    lower.html(fmt_date(slider.val()[0]));
                    upper.html(fmt_date(slider.val()[1]));
                }
            });
            lower.html(fmt_date(data.minDate));
            upper.html(fmt_date(data.maxDate));

            time_range = [data.minDate, data.maxDate];
        }

        function initDonorLabels() {
            $.each(donor_labels, function(key, t) {
                $(t.node).mouseenter(function (ev) {
                    hovered_donor = key;
                    updateFilter();
                }).mouseout(function(evt) {
                    hovered_donor = null;
                    updateFilter();
                }).click(function() {
                    var i = selected_donors.indexOf(key);
                    if (i < 0) {
                        selected_donors.push(key);
                        donor_labels[key].attr({ 'font-weight': 'bold' });
                    } else {
                        selected_donors.splice(i, 1);
                        donor_labels[key].attr({ 'font-weight': 'normal' });
                    }
                    updateFilter();
                });
            });
        }

        function initPartyArcs() {
            $.each(party_arcs, function(party, arc) {
                $(arc.node).mouseenter(enter).mouseout(leave).click(click);
                $(party_labels[party].node).mouseenter(enter).mouseout(leave).click(click);
                function enter(ev) {
                    hovered_party = party;
                    updateFilter();
                }
                function leave(evt) {
                    hovered_party = null;
                    updateFilter();
                }
                function click() {
                    var i = selected_parties.indexOf(party);
                    if (i < 0) {
                        selected_parties.push(party);
                    } else {
                        selected_parties.splice(i, 1);
                    }
                    updateFilter();
                }
            });
        }
        function initResetButton() {
            $('#reset').click(function() {
                donation_range = [50000, data.maxAmount];
                $('#amount-range').val(donation_range, true);
                time_range = [data.minDate, data.maxDate];
                $('#time-range').val(time_range, true);
                $('#search').val('');
                donor_search = '';
                if (selected_donors.length) {
                    $.each(selected_donors, function(i, key) {
                        donor_labels[key].attr({ 'font-weight': 'normal' });
                    });
                }
                selected_donors = [];
                selected_parties = [];
                updateFilter();
            });
        }
        function initSearch() {
            var s = $('#search');
            s.keyup(function() {
                donor_search = s.val();
                updateFilter();
            });
        }
        $('#sort').change(function() {
            drawDonationCircle();
            initPartyArcs();
            initDonorLabels();
            updateFilter();
        });
    }

    function updateFilter() {
        var visible_donors = [],
            visible_parties = [];

        $.each(lines, function(i, line) {
            var d = line.node.data,
                a = d.amount >= donation_range[0] && d.amount <= donation_range[1],
                b = d.ts >= time_range[0] && d.ts <= time_range[1],
                c = !hover_month || d.date_s.substr(0,7) == hover_month,
                visible = a && b && c && party_visible(d.party) && donor_visible(d.key);
            line.opacity(visible ? 1 : 0.02);
        });

        $.each(donor_labels, function(key, t) {
            var visible = donor_visible(key);
            t.opacity(visible ? 1 : 0.2);
            if (visible) visible_donors.push(key);
        });
        $.each(party_arcs, function(key, arc) {
            var visible = party_visible(key);
            arc.opacity(visible ? 1 : 0.1);
            party_labels[key].opacity(visible ? 1 : 0.1);
            if (visible) visible_parties.push(key);
        });
        function party_visible(party) {
            return hovered_party ?
                hovered_party == party || selected_parties.indexOf(party) >= 0 :
                !selected_parties.length || selected_parties.indexOf(party) >= 0;
        }
        function donor_visible(key) {
            return hovered_donor == key || selected_donors.indexOf(key) >= 0 || check_search(key) ||
                (!donor_search && !selected_donors.length && !hovered_donor);
            function check_search(key) {
                return donor_search && (key.toLowerCase().indexOf(donor_search) >= 0 || data.donorFulltext[key].toLowerCase().indexOf(donor_search) >= 0);
            }
        }
        //if (!selected_parties.length && !hovered_party) visible_parties = [];
        //if (!selected_donors.length && !hovered_donor && !donor_search) visible_donors = [];

        if (true) {
            var title = visible_parties.length == data.num_parties && visible_donors.length == data.num_donors ? 'Spendenkalender' :
                (visible_donors.length && visible_donors.length < data.num_donors ? ( visible_donors.length < 10 ? visible_donors.join(', ') : '...') : '')+
                (visible_parties.length && visible_parties.length < data.num_parties && visible_donors.length && visible_donors.length < data.num_donors ? ' ➛ ' : '') +
                (visible_parties.length && visible_parties.length < data.num_parties ? visible_parties.join(', ') : '');
            $('.focus-parties').html(title);
            var top = $('.top-donations').html(''),
                filt_donations = data.donations.filter(function(d) {
                    return (!visible_parties.length || visible_parties.indexOf(d.party) >= 0) &&
                        (!visible_donors.length || visible_donors.indexOf(d.key) >= 0) &&
                        (d.ts >= time_range[0] && d.ts <= time_range[1]) &&
                        (d.amount >= donation_range[0] && d.amount <= donation_range[1]);
                });
            if (true) {
                // donation matrix aka heatmap
                var matrix = $('<table />').addClass('matrix').appendTo(top).on('mouseleave', mouseout),
                    tr = $('<tr />').appendTo(matrix),
                    t0 = new Date(time_range[0]*1000),
                    t1 = new Date(time_range[1]*1000),
                    yr = t1.getFullYear(),
                    yr1 = t0.getFullYear(),
                    max = 0,
                    m, bg,
                    ym_dict = {};
                $.each(filt_donations, function(i, don) {
                    var ym = yearmonth(don.date1.getFullYear(), don.date1.getMonth()+1);
                    if (!ym_dict[ym]) ym_dict[ym] = 0;
                    ym_dict[ym] += don.amount;
                    max = Math.max(max, ym_dict[ym]);
                });
                bg = chroma.scale('YlGnBu').domain([50000, max]);
                tr.append('<th />');
                $.each(monthNames, function(i, m) {
                    $('<th />').html(m.substr(0,1)).appendTo(tr);
                });
                while (yr >= yr1) {
                    tr = $('<tr />').appendTo(matrix);
                    $('<th />').html(yr).appendTo(tr);
                    m = 1;
                    while (m <= 12) {
                        var k = yearmonth(yr, m);
                        $('<td />')
                            .attr('title', ym_dict[k] ? fmt_amount(ym_dict[k], true) : '')
                            .css({ background: ym_dict[k] ? bg(ym_dict[k]).hex() : '#fff' })
                            .data('ym', k)
                            .on('mouseover', mouseenter)
                            .on('mouseout', mouseout)
                            .appendTo(tr);
                        m++;
                    }
                    yr--;
                }
            } else {
                // top 10 donations
                filt_donations.sort(function(a,b) { return b.amount - a.amount; });
                filt_donations = filt_donations.slice(0, 10);
                $.each(filt_donations, function(i, d) {
                    $('<div><b>'+fmt_amount(d.amount)+'</b> '+(visible_donors.length != 1 ? '<span>von</span>&nbsp;'+d.key : '')+
                        (visible_parties.length == 1 ? '' : '&nbsp;<span>an</span>&nbsp;'+d.party)+' <span>(</span>'+fmt_date(d.ts, true)+'<span>)</span></div>').appendTo(top);
                });
            }
            //$('.intro').hide();
        } else {
            $('.focus-parties, .top-donations').html('');
           //$('.intro').show();
        }
        function mouseenter(e) {
            hover_month = $(e.target).data('ym');
            if (!ym_dict[hover_month]) hover_month = undefined;
            updateFilter();
        }
        function mouseout() {
            hover_month = undefined;
            updateFilter();
        }
        function yearmonth(yr, m) {
            return yr+'-'+(m < 10 ? '0' : '') + m;
        }
    }

    function fmt_amount(val, plain) {
        val = Math.round(val / 5000) * 5;
        var sp = !plain ? '&nbsp;' : ' ';
        if (val >= 1000) {
            return (val / 1000).toFixed(2).replace('.', ',') + sp+'Mio'+sp+'€';
        }
        return val + '.000'+sp+'€';
    }

    function fmt_date(val, short) {
        var d = new Date(val*1000);
        return short ? (d.getMonth()+1)+'/'+(''+d.getYear()).substr(1) :
            monthNamesAbbr[d.getMonth()] + '&nbsp;'+d.getFullYear();
    }

    $(function() {
        ow = $('#wrapper').width();
        $.ajax({
            url: 'donations.csv',
            success: function(raw) {
            // body...
                makeData(raw);
                drawDonationCircle();
                initUI();
                updateFilter();
            }
        });

        var resizeTimer;
        $(window).resize(function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                drawDonationCircle();
                initUI(true);
                updateFilter();
            }, 500);
        });
    });


})();


