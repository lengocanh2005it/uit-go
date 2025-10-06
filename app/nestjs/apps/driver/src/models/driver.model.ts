import { DriverStatusEnum } from '@libs/common/enums';
import { Schema } from 'dynamoose';

export const driverSchema = new Schema({
  id: {
    type: String,
    hashKey: true,
  },
  status: {
    type: String,
    enum: [DriverStatusEnum],
    required: true,
    default: DriverStatusEnum.ONLINE,
  },
  rating: {
    type: Number,
    required: true,
    default: 0,
    set: (val: number) => Math.round(val * 10) / 10,
  },
  total_trip: {
    type: Number,
    required: true,
    default: 0,
  },
  license_number: {
    type: String,
    required: true,
  },
  license_expiry: {
    type: Date,
    required: true,
  },
  created_at: {
    type: Date,
    required: true,
    default: () => new Date(),
  },
  updated_at: {
    type: Date,
    required: true,
    default: () => new Date(),
  },
  user_id: {
    type: String,
    required: true,
  },
});
