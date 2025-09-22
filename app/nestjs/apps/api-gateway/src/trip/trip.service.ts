import { Inject, Injectable } from '@nestjs/common';
import type { TripServiceClient } from '@shared/types/trip';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TripService {
  constructor(
    @Inject('TRIP_SERVICE') private readonly tripClient: TripServiceClient,
  ) {}

  public getTrip = async (id: string) => {
    return firstValueFrom(this.tripClient.getTrip({ id }));
  };
}
