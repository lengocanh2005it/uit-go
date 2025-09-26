import {
  CalculateRouteCommand,
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  SearchPlaceIndexForTextCommand,
} from '@aws-sdk/client-location';
import { GetEstimateFareResponse, GetGeocodeResponse } from '@libs/common';
import {
  GetEstimateFareDto,
  GetGeoCodeDto,
  ReverseGeoCodeDto,
} from '@libs/common/dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocationService {
  private client: LocationClient;
  private placeIndex: string;
  private routeCalculator: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new LocationClient({
      region: configService.get<string>('aws.region', ''),
      credentials: {
        accessKeyId: configService.get<string>('aws.accessKeyId', ''),
        secretAccessKey: configService.get<string>('aws.secretAccessKey', ''),
      },
    });
    this.placeIndex = configService.get<string>('aws.place_index', '');
    this.routeCalculator = configService.get<string>(
      'aws.route_calculator',
      '',
    );
  }

  public getGeocode = async (
    getGeoCodeDto: GetGeoCodeDto,
  ): Promise<GetGeocodeResponse | null> => {
    const { address } = getGeoCodeDto;
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: this.placeIndex,
      MaxResults: 1,
      Text: address,
    });

    const response = await this.client.send(command);
    const pos = response.Results?.[0]?.Place?.Geometry?.Point;
    return pos ? { longitude: pos[0], latitude: pos[1] } : null;
  };

  public reverseGeocode = async (reverseGeoCodeDto: ReverseGeoCodeDto) => {
    const { lat, lon } = reverseGeoCodeDto;
    const command = new SearchPlaceIndexForPositionCommand({
      IndexName: this.placeIndex,
      Position: [lon, lat],
      MaxResults: 1,
    });

    const response = await this.client.send(command);
    return response.Results?.[0]?.Place?.Label ?? null;
  };

  public estimateFare = async (
    getEstimateFareDto: GetEstimateFareDto,
  ): Promise<GetEstimateFareResponse> => {
    const { startAddress, destinationAddress } = getEstimateFareDto;

    const startPos = await this.getGeocode({ address: startAddress });
    const endPos = await this.getGeocode({ address: destinationAddress });

    if (!startPos || !endPos) {
      throw new NotFoundException(
        'Could not find coordinates for the provided address.',
      );
    }

    const routeCmd = new CalculateRouteCommand({
      CalculatorName: this.routeCalculator,
      DeparturePosition: [startPos.longitude, startPos.latitude],
      DestinationPosition: [endPos.longitude, endPos.latitude],
    });

    const routeResp = await this.client.send(routeCmd);
    const distanceKm = routeResp.Summary?.Distance ?? 0;
    const estimatedFare = this.calculateFare(distanceKm);

    return {
      startAddress,
      destinationAddress,
      distanceKm,
      estimatedFare,
      currency: 'VND',
    };
  };

  private calculateFare(distanceKm: number): number {
    const baseFare = 10000;
    const perKm = 5000;
    return baseFare + distanceKm * perKm;
  }
}
