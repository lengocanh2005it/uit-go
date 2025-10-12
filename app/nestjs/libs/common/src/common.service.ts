import { GetServerLocationResponse } from '@libs/common/utils';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDistance } from 'geolib';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CommonService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getServerLocation(): Promise<GetServerLocationResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<Record<string, any>>(
          this.configService.get<string>('ipwho_url', ''),
        ),
      );
      return {
        latitude: res.data.latitude,
        longitude: res.data.longitude,
        city: res.data.city,
        country: res.data.country,
      };
    } catch (error) {
      console.error('Error get server location: ', error);
      return {
        latitude: 0,
        longitude: 0,
        city: 'HCM',
        country: 'Viet Nam',
      };
    }
  }

  async getCoordinates(address: string): Promise<{
    lat: number;
    lon: number;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          this.configService.get<string>('geoapify.url', ''),
          {
            params: {
              text: address,
              apiKey: this.configService.get<string>('geoapify.api_key', ''),
            },
          },
        ),
      );

      const results = response.data.features;

      if (results.length === 0) {
        console.log('Address not found.');
        return { lat: 0, lon: 0 };
      }

      const { lat, lon } = results[0].properties;
      return { lat, lon };
    } catch (error) {
      console.error(
        'Error get coordinates:',
        error.response?.data || error.message || error,
      );
      return {
        lat: 0,
        lon: 0,
      };
    }
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
}
