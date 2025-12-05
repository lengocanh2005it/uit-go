import { Schema } from 'dynamoose';

export const DriverLocationSchema = new Schema(
  {
    cell_token: {
      type: String,
      hashKey: true,
      map: 'cellToken',
    },
    driver_id: {
      type: String,
      rangeKey: true,
      map: 'driverId',
      index: {
        name: 'GSI_Driver',
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
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
);
