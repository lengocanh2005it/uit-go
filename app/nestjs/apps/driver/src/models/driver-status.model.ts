import { DriverStatusEnum } from "@libs/common/enums";
import { Schema } from "dynamoose";

export const DriverStatusSchema = new Schema({
  driver_id: {
    type: String,
    hashKey: true,
    map: 'driverId',
  },
  status: {
    type: String,
    enum: Object.values(DriverStatusEnum),
    default: DriverStatusEnum.ONLINE,
  },
  last_seen_at: {
    type: {
      value: Date,
      settings: {
        storage: "iso"
      }
    },
    default: () => new Date(),
    map: 'lastSeenAt',
  },
  current_trip_id: {
    type: String,
    required: false,
    map: 'currentTripId',
  },
  vehicle_cached: {
    type: Object,
    required: false,
    schema: {
      vehicleId: String,
      plateNumber: String,
      brand: String,
      model: String,
    },
    map: 'vehicleCached',
  },
}, {
  timestamps: {
    createdAt: {
      created_at: {
        type: {
          value: Date,
          settings: {
            storage: "iso"
          }
        }
      }
    },
    updatedAt: {
      updated_at: {
        type: {
          value: Date,
          settings: {
            storage: "iso"
          }
        }
      }
    }
  }
})