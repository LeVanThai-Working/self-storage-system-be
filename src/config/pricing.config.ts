import { RackZoneEnum } from '../common/enums/storageRack.enum.ts';

/**
 * Global default pricing template for shared warehouse racks across zones.
 * Pre-filled automatically when Business Ops Manager sets up a WAREHOUSE_RACK offering for a facility.
 */
export const DEFAULT_RACK_ZONE_PRICING = {
  [RackZoneEnum.PRIME]: 1500000,
  [RackZoneEnum.STANDARD]: 1200000,
  [RackZoneEnum.ECONOMY]: 1000000,
} as const;
