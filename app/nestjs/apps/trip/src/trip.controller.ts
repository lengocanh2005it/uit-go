import { Controller } from '@nestjs/common';
import {
  TripRequest,
  TripResponse,
  TripServiceController,
  TripServiceControllerMethods,
} from '@shared/types/trip';
import { TripService } from './trip.service';

@Controller()
@TripServiceControllerMethods()
export class TripController implements TripServiceController {
  constructor(private readonly tripService: TripService) {}

  async getTrip(request: TripRequest): Promise<TripResponse> {
    return this.tripService.getTrip(request);
  }
}
