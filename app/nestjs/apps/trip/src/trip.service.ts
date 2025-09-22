import { Injectable } from '@nestjs/common';
import { TripRequest } from '@shared/types/trip';

@Injectable()
export class TripService {
  getTrip(request: TripRequest) {
    return { id: request.id, destination: 'Hanoi' };
  }
}
