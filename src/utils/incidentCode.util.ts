import { Types } from 'mongoose';
import { getVNDateString } from './date.util.ts';

export function generateIncidentCode(): string {
  const date = getVNDateString().replace(/-/g, '');
  const suffix = new Types.ObjectId().toHexString().toUpperCase();
  return `INC-${date}-${suffix}`;
}
