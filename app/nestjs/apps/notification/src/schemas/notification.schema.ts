import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, maxlength: 255 })
  title: string;

  @Prop({ required: true, maxlength: 50, unique: true })
  type: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
