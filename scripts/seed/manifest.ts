/** Approved checkpoints. Descriptions are a preview, never executable seed steps. */
export const SEED_MILESTONES = [
  { id: 1, name: 'Preparation and verified backup', expected: {} },
  {
    id: 2,
    name: 'Account + Facility (reset once)',
    expected: { users: 37, profiles: 37, facilities: 5 },
  },
  {
    id: 3,
    name: 'Unit Type + Amenity + Offering + Timeslot',
    expected: {
      unittypes: 4,
      amenities: 5,
      facilityunittypeofferings: 20,
      facilityamenityofferings: 25,
      facilitytimeslots: 35,
    },
  },
  {
    id: 4,
    name: 'Storage Unit + Storage Rack + Rack Tier',
    expected: { storageunits: 95, storageracks: 50, racktiers: 200 },
  },
  {
    id: 5,
    name: 'Contract + Finance',
    expected: {
      contracttemplates: 1,
      signingauthorizations: 4,
      reservations: 16,
      contracts: 32,
      invoices: 160,
      payments: 176,
      refundrequests: 16,
    },
  },
  {
    id: 6,
    name: 'Access Schedule + SKU + Inventory + Movement',
    expected: {
      accessschedules: 24,
      customerskus: 8,
      customerinventories: 24,
      inventorymovements: 36,
    },
  },
  { id: 7, name: 'Final reconciliation and handover', expected: {} },
] as const;

export const SEED_REFERENCE_DATE = '2026-11-18';
