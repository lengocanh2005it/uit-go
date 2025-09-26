import { ForbiddenTripStatus } from '@libs/common';
import {
  CreateTripDto,
  CreateTripRequestDto,
  GetTripsOfDriverQueryDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
} from '@libs/common/dto';
import { TripStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import {
  GetEstimateFareResponse,
  GetGeocodeResponse,
} from '@libs/common/utils';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Trip, TripRequest } from './entities';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepository: Repository<TripRequest>,
    private readonly rabbitMqService: RabbitMQService,
  ) {}

  public getTrip = async (tripId: string) => {
    return this.findTripById(tripId);
  };

  public createTrip = async (createTripDto: CreateTripDto) => {
    const { destinationAddress, originAddress } = createTripDto;

    const originAddressGeoCode =
      await this.rabbitMqService.send<GetGeocodeResponse>(
        'LOCATION_SERVICE',
        'get-geocode',
        {
          address: originAddress,
        },
      );

    const destinationAddressGeoCode =
      await this.rabbitMqService.send<GetGeocodeResponse>(
        'LOCATION_SERVICE',
        'get-geocode',
        {
          address: destinationAddress,
        },
      );

    const estimateFareData =
      await this.rabbitMqService.send<GetEstimateFareResponse>(
        'LOCATION_SERVICE',
        'get-estimate-fare',
        {
          startAddress: originAddress,
          destinationAddress,
        },
      );

    const newTrip = this.tripRepository.create({
      originAddress,
      destinationAddress,
      originLat: originAddressGeoCode?.latitude ?? 0,
      originLng: originAddressGeoCode?.longitude ?? 0,
      destinationLat: destinationAddressGeoCode?.latitude ?? 0,
      destinationLng: destinationAddressGeoCode?.longitude ?? 0,
      fareEstimate: estimateFareData.estimatedFare ?? 0,
      fareFinal: estimateFareData?.estimatedFare ?? 0,
      driverId: '1',
      passengerId: '1',
    });

    await this.tripRepository.save(newTrip);

    const now = new Date();
    const expiresTime = new Date(now);
    expiresTime.setMinutes(now.getMinutes() + 15);

    await this.createTripRequest({
      expiresTime,
      tripId: newTrip.id,
    });
  };

  public updateTrip = async (tripId: string, updateTripDto: UpdateTripDto) => {
    const trip = await this.tripRepository.findOne({
      where: {
        id: tripId,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found.');

    const { destinationAddress, status, note, fareFinal } = updateTripDto;

    if (
      trip.status === TripStatusEnum.CANCELLED ||
      trip.status === TripStatusEnum.COMPLETED
    )
      throw new ForbiddenException(
        `Trip has been ${trip.status === TripStatusEnum.CANCELLED ? 'cancelled' : 'completed'} and cannot be modified.`,
      );

    if (trip.status === TripStatusEnum.ONGOING && destinationAddress) {
      throw new ForbiddenException(
        'Destination address cannot be changed while the trip is ongoing.',
      );
    }

    if (destinationAddress) {
      const newDestAddressGeocode =
        await this.rabbitMqService.send<GetGeocodeResponse | null>(
          'LOCATION_SERVICE',
          'get-geocode',
          {
            address: destinationAddress,
          },
        );

      trip.destinationLat =
        newDestAddressGeocode?.latitude || trip.destinationLat;
      trip.destinationLng =
        newDestAddressGeocode?.longitude || trip.destinationLng;

      const newEstimateFare =
        await this.rabbitMqService.send<GetEstimateFareResponse>(
          'LOCATION_SERVICE',
          'get-estimate-fare',
          {
            startAddress: trip.originAddress,
            destinationAddress,
          },
        );

      trip.fareEstimate = newEstimateFare.estimatedFare || trip.fareEstimate;
      trip.fareFinal = newEstimateFare.estimatedFare || trip.fareEstimate;
    }

    trip.status = status || trip.status;
    trip.note = note || trip.note;
    trip.destinationAddress = destinationAddress || trip.destinationAddress;
    if (!destinationAddress) trip.fareFinal = fareFinal || trip.fareFinal;

    await this.tripRepository.save(trip);

    return trip;
  };

  public cancelTrip = async (tripId: string) => {
    const trip = await this.findTripById(tripId);

    const forbiddenMessages: Record<ForbiddenTripStatus, string> = {
      [TripStatusEnum.CANCELLED]:
        'Trip has been cancelled and cannot be cancelled.',
      [TripStatusEnum.COMPLETED]:
        'Trip has already been completed and cannot be cancelled.',
    };

    if (forbiddenMessages[trip.status as ForbiddenTripStatus]) {
      throw new ForbiddenException(
        forbiddenMessages[trip.status as ForbiddenTripStatus],
      );
    }

    trip.status = TripStatusEnum.CANCELLED;
    await this.tripRepository.save(trip);
  };

  public updateTripRequestStatus = async (
    tripRequestId: string,
    updateTripRequestStatusDto: UpdateTripRequestStatusDto,
  ) => {
    const tripRequest = await this.tripRequestRepository.findOne({
      where: {
        id: tripRequestId,
      },
    });

    if (!tripRequest) throw new NotFoundException('Trip request not found.');

    const { status } = updateTripRequestStatusDto;
    tripRequest.status = status;
    await this.tripRequestRepository.save(tripRequest);
  };

  public getTripsOfDriver = async (
    driverId: string,
    getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
  ) => {
    const { afterCursor } = getTripsOfDriverQueryDto;
    const paginator = buildPaginator({
      entity: Trip,
      alias: 'trip',
      paginationKeys: ['createdAt'],
      query: {
        limit: 10,
        order: 'DESC',
        afterCursor,
      },
    });

    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .andWhere('trip.driverId = :driverId', { driverId });

    const { data, cursor } = await paginator.paginate(qb);

    return {
      data,
      afterCursor: cursor?.afterCursor ?? null,
    };
  };

  private createTripRequest = async (
    createTripRequestDto: CreateTripRequestDto,
  ) => {
    const newTripRequest =
      this.tripRequestRepository.create(createTripRequestDto);
    return this.tripRequestRepository.save(newTripRequest);
  };

  private findTripById = async (tripId: string) => {
    const trip = await this.tripRepository.findOne({
      where: {
        id: tripId,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found.');

    return trip;
  };
}
