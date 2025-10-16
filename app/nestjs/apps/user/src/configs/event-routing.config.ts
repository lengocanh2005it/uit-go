import { patterns, ServiceName } from '@libs/common/utils';

export const EventRoutingMap: Record<
  string,
  { service: ServiceName; pattern: string }
> = {
  LOGIN: {
    service: 'DRIVER_SERVICE' as ServiceName,
    pattern: patterns.driverService.updateDriverStatus,
  },
};
