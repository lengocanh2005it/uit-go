import { Coordinates, GetServerLocationResponse } from '@libs/common/utils';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDistance } from 'geolib';
import CircuitBreaker from 'opossum';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CommonService {
  private geoApiBreaker: CircuitBreaker<[address: string], Coordinates>;
  private serverLocationBreaker: CircuitBreaker<[], GetServerLocationResponse>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.geoApiBreaker = new CircuitBreaker(
      (address: string) =>
        firstValueFrom(
          this.httpService.get(
            this.configService.get<string>('geoapify.url', ''),
            {
              params: {
                text: address,
                apiKey: this.configService.get<string>('geoapify.api_key', ''),
              },
            },
          ),
        ).then((res) => {
          const results = res.data.features;
          if (!results || results.length === 0) return { lat: 0, lon: 0 };
          const { lat, lon } = results[0].properties;
          return { lat, lon };
        }),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 15000,
      },
    );

    this.serverLocationBreaker = new CircuitBreaker(
      () =>
        firstValueFrom(
          this.httpService.get<Record<string, any>>(
            this.configService.get<string>('ipwho_url', ''),
          ),
        ).then((res) => {
          const { latitude, longitude, city, country } = res.data;
          return {
            latitude,
            longitude,
            city,
            country,
          };
        }),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 15000,
      },
    );

    this.geoApiBreaker.fallback(() => ({
      lat: 0,
      lon: 0,
    }));

    this.serverLocationBreaker.fallback(() => ({
      latitude: 0,
      longitude: 0,
      city: 'HCM',
      country: 'Viet Nam',
    }));
  }

  async getServerLocation(): Promise<GetServerLocationResponse> {
    return this.serverLocationBreaker.fire();
  }

  async getCoordinates(address: string): Promise<Coordinates> {
    return this.geoApiBreaker.fire(address);
  }

  async getEstimatedFare(
    originAddress: string,
    destAddress: string,
  ): Promise<number> {
    try {
      const distanceKm = await this.getDistance(originAddress, destAddress);

      const baseFare = 10000;
      const pricePerKm = 4000;
      const estimatedPrice =
        baseFare + Math.max(0, distanceKm - 1) * pricePerKm;

      return Math.round(estimatedPrice);
    } catch (error) {
      console.error('Error get estimated price:', error.message);
      return 0;
    }
  }

  async getDistance(originAddress: string, destAddress: string) {
    const origin = await this.getCoordinates(originAddress);
    const destination = await this.getCoordinates(destAddress);

    const distanceMeters = getDistance(
      { latitude: origin.lat, longitude: origin.lon },
      { latitude: destination.lat, longitude: destination.lon },
    );

    return distanceMeters / 1000;
  }

  async getDistanceWithCoordinates(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
  ) {
    const distanceMeters = getDistance(
      { latitude: origin.lat, longitude: origin.lon },
      { latitude: destination.lat, longitude: destination.lon },
    );
    return distanceMeters / 1000;
  }
}
