import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { Schema } from 'dynamoose';

export const driverApprovalSchema = new Schema({
  id: {
    type: String,
    hashKey: true,
  },
  status: {
    type: String,
    enum: [DriverApprovalStatusEnum],
    default: DriverApprovalStatusEnum.PENDING,
  },
  reviewed_date: {
    type: Date,
  },
  note: {
    type: String,
  },
  created_at: {
    type: Date,
  },
  driver_id: {
    type: String,
    required: true,
  },
  vehicle_id: {
    type: String,
    required: true,
  },
});
