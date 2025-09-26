import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [CommonModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
