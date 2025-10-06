import { Schema } from 'dynamoose';

export const driverLocationSchema = new Schema({
  driver_id: {
    type: String,
    hashKey: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  updated_at: {
    type: Date,
    required: true,
  },
});
