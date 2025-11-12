import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UserNotificationDocument = UserNotification &
  Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class UserNotification {
  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notification: Types.ObjectId;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  data?: Record<string, any>;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserNotificationSchema =
  SchemaFactory.createForClass(UserNotification);
