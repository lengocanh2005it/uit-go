import { Schema } from 'dynamoose';

export const DriverSchema = new Schema(
  {
    driver_id: {
      type: String,
      hashKey: true,
      map: 'driverId',
    },
    user_id: {
      type: String,
      map: 'userId',
      required: true,
      index: {
        name: 'GSI_User',
        type: 'global',
      },
    },
    rating: {
      type: Number,
      default: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    total_trip: {
      type: Number,
      default: 0,
      map: 'totalTrip',
    },
    license_number: {
      type: String,
      required: true,
      map: 'licenseNumber',
    },
    license_expiry: {
      type: Date,
      required: true,
      map: 'licenseExpiry',
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
