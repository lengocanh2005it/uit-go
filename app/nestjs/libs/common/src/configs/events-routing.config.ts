import { PATTERNS } from '@libs/common/constants';
import { ServiceName, SERVICES } from '@libs/common/utils';

export const EventRoutingMap: Record<
  string,
  { service: ServiceName; pattern: string }
> = {
  UPDATE_DRIVER_STATUS: {
    service: SERVICES.DRIVER_SERVICE,
    pattern: PATTERNS.DRIVER_SERVICE.UPDATE_STATUS,
  },
};
