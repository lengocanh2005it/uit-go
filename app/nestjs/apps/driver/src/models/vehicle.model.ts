import { Schema } from 'dynamoose';

export const vehicleSchema = new Schema({
  id: {
    type: String,
    hashKey: true,
  },
  plate_number: {
    type: String,
    required: true,
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
  driver_id: {
    type: String,
    required: true,
  },
});
