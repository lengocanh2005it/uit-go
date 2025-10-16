import { ServiceName } from '@libs/common/utils';

export const EventRoutingMap: Record<
  string,
  { service: ServiceName; pattern: string }
> = {
  TRIP_CREATED: { service: 'DRIVER_SERVICE', pattern: 'trip.created' },
  TRIP_COMPLETED: { service: 'USER_SERVICE', pattern: 'trip.completed' },
  DRIVER_ASSIGNED: { service: 'TRIP_SERVICE', pattern: 'driver.assigned' },
};
