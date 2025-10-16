import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { Schema } from 'dynamoose';

export const DriverApprovalSchema = new Schema(
  {
    driver_approval_id: {
      type: String,
      hashKey: true,
      map: 'driverApprovalId',
    },
    status: {
      type: String,
      enum: Object.values(DriverApprovalStatusEnum),
      default: DriverApprovalStatusEnum.PENDING,
    },
    reviewed_date: {
      type: Date,
      required: false,
      map: 'reviewedDate',
    },
    note: {
      type: String,
      required: false,
    },
    driver_id: {
      type: String,
      required: true,
      map: 'driverId',
      index: {
        name: 'driverId-index',
        type: 'global',
      },
    },
    vehicle_id: {
      type: String,
      required: true,
      map: 'vehicleId',
    },
  },
  {
    timestamps: {
      createdAt: {
        created_at: {
          type: {
            value: Date,
            settings: {
              storage: 'iso',
            },
          },
        },
      },
      updatedAt: {
        updated_at: {
          type: {
            value: Date,
            settings: {
              storage: 'iso',
            },
          },
        },
      },
    },
  },
);
