import { Schema } from 'dynamoose';

export const VehicleSchema = new Schema({
  vehicle_id: {
    type: String,
    hashKey: true,
    map: 'vehicleId',
  },
  driver_id: {
    type: String,
    required: true,
    map: 'driverId',
    index: {
      name: 'GSI_Driver',
      type: 'global',
    }
  },
  plate_number: {
    type: String,
    required: true,
    map: 'plateNumber',
    index: {
      name: 'GSI_PlateNumber',
      type: 'global',
    }
  },
  brand: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
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
});
