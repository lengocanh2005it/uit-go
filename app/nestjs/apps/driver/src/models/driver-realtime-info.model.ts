import { DriverStatusEnum } from '@libs/common/enums';
import { Schema } from 'dynamoose';

export const DriverRealtimeInfoSchema = new Schema(
  {
    driverId: {
      type: String,
      hashKey: true,
    },
    cellToken: {
      type: String,
      index: {
        name: 'GSI_CellToken',
        type: 'global',
      },
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DriverStatusEnum),
      default: DriverStatusEnum.ONLINE,
      required: true,
    },
    vehicle: {
      type: Object,
      required: false,
      schema: {
        vehicleId: String,
        plateNumber: String,
        brand: String,
        model: String,
        color: String,
      },
      map: 'vehicleCached',
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
);
