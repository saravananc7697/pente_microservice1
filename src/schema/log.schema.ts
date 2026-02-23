import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'logs',
})
export class Log extends Document {
  @Prop({
    required: true,
    index: true,
  })
  userId: string; // Postgres user.id (UUID)

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const LogSchema = SchemaFactory.createForClass(Log);
