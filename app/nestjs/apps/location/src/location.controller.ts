import { Controller } from '@nestjs/common';
import { LocationService } from './location.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetEstimateFareDto,
  GetGeoCodeDto,
  ReverseGeoCodeDto,
} from '@libs/common/dto';

@Controller()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @MessagePattern('get-geocode')
  async getGeocode(@Payload() getGeoCodeDto: GetGeoCodeDto) {
    return this.locationService.getGeocode(getGeoCodeDto);
  }

  @MessagePattern('reverse-geocode')
  async reverseGeocode(@Payload() reverseGeoCodeDto: ReverseGeoCodeDto) {
    return this.locationService.reverseGeocode(reverseGeoCodeDto);
  }

  @MessagePattern('get-estimate-fare')
  async estimateFare(@Payload() getEstimateFareDto: GetEstimateFareDto) {
    return this.locationService.estimateFare(getEstimateFareDto);
  }
}
