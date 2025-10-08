import { Schema } from 'dynamoose';

export const DriverLocationSchema = new Schema({
  hash_prefix: {
    type: String,
    hashKey: true,
    map: 'hashPrefix',
  },
  driver_id: {
    type: String,
    rangeKey: true,
    map: 'driverId',
    index: {
      name: 'GSI_Driver',
      type: 'global',
    }
  },
  geo_hash: {
    type: String,
    required: true,
    map: 'geoHash',
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
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
