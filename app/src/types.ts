export interface Donation {
    party: string;
    donor_key: string;
    donor_name: string;
    donation: number;
    ts: number;
    date1: Date;
    date2: Date;
    addr1: string;
    addr2: string;
}

export interface Party {
    name: string;
    donations: Donation[];
    total: number;
    slice?: any;
    startAngle?: number;
    endAngle?: number;
    count?: number;
}

export interface Donor {
    key: string;
    names: string[];
    addresses: string[];
    donations: Donation[];
    total: number;
    _total?: number;
    slice?: any;
    startAngle?: number;
    endAngle?: number;
    count?: number;
}
