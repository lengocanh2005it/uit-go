import { Schema } from 'dynamoose';

export const ProcessedEventSchema = new Schema(
  {
    event_id: {
      type: String,
      hashKey: true,
      map: 'eventId',
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
    },
  },
);
