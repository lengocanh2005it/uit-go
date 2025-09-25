import { ValueTransformer } from 'typeorm';
import Decimal from 'decimal.js';

export const DecimalColumnTransformer: ValueTransformer = {
  to: (value: number | null): string | null => {
    return value !== null ? new Decimal(value).toFixed(2) : null;
  },
  from: (value: string | null): number | null => {
    return value !== null
      ? new Decimal(value).toDecimalPlaces(2).toNumber()
      : null;
  },
};
