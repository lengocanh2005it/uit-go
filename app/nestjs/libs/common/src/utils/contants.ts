import { UserRole } from '@/user/src/enums';
import {
  DriverApprovalStatusEnum,
  DriverStatusEnum,
  TripRequestStatusEnum,
  TripStatusEnum,
} from '@libs/common/enums';
import { DriverApprovalStatus, DriverStatus } from '@libs/common/proto/driver';
import { TripRequestStatus, TripStatus } from '@libs/common/proto/trip';
import { UserRole as UseerRoleProto } from '@libs/common/proto/user';

export const RABBITMQ_SERVCE_TOKEN = Symbol('RABBITMQ_SERVICE');
export const REDIS_SERVICE_TOKEN = Symbol('REDIS_SERVICE');
export const BULLMQ_SERVICE_TOKEN = Symbol('BULLMQ_SERVICE');
export const RABBITMQ_QUEUE_SERVICES = [
  'USER_SERVICE',
  'TRIP_SERVICE',
  'DRIVER_SERVICE',
  'NOTIFICATION_SERVICE',
] as const;
export type ServiceName = (typeof RABBITMQ_QUEUE_SERVICES)[number];
export const SERVICES = RABBITMQ_QUEUE_SERVICES.reduce(
  (acc, service) => {
    acc[service] = service;
    return acc;
  },
  {} as Record<ServiceName, ServiceName>,
);
export const MAX_RETRY = 5;
export const BACKOFF_MS = 5000;
export const tripRequestStatusMapping: Record<
  TripRequestStatus,
  TripRequestStatusEnum
> = {
  [TripRequestStatus.TRIP_REQUEST_STATUS_UNSPECIFIED]:
    TripRequestStatusEnum.PENDING,
  [TripRequestStatus.TRIP_REQUEST_STATUS_ACCEPTED]:
    TripRequestStatusEnum.ACCEPTED,
  [TripRequestStatus.TRIP_REQUEST_STATUS_PENDING]:
    TripRequestStatusEnum.PENDING,
  [TripRequestStatus.TRIP_REQUEST_STATUS_REJECTED]:
    TripRequestStatusEnum.REJECTED,
  [TripRequestStatus.TRIP_REQUEST_STATUS_TIMEOUT]:
    TripRequestStatusEnum.TIMEOUT,
  [TripRequestStatus.UNRECOGNIZED]: TripRequestStatusEnum.PENDING,
};
export const tripStatusMapping: Record<TripStatus, TripStatusEnum> = {
  [TripStatus.TRIP_STATUS_UNSPECIFIED]: TripStatusEnum.SEARCHING,
  [TripStatus.TRIP_STATUS_SEARCHING]: TripStatusEnum.SEARCHING,
  [TripStatus.TRIP_STATUS_ACCEPTED]: TripStatusEnum.ACCEPTED,
  [TripStatus.TRIP_STATUS_ONGOING]: TripStatusEnum.ONGOING,
  [TripStatus.TRIP_STATUS_COMPLETED]: TripStatusEnum.COMPLETED,
  [TripStatus.TRIP_STATUS_CANCELLED]: TripStatusEnum.CANCELLED,
  [TripStatus.UNRECOGNIZED]: TripStatusEnum.SEARCHING,
};
export const grpcRoleToUserRoleMapping: Record<UseerRoleProto, UserRole> = {
  [UseerRoleProto.USER_ROLE_CUSTOMER]: UserRole.CUSTOMER,
  [UseerRoleProto.USER_ROLE_DRIVER]: UserRole.DRIVER,
  [UseerRoleProto.USER_ROLE_ADMIN]: UserRole.ADMIN,
  [UseerRoleProto.USER_ROLE_UNSPECIFIED]: UserRole.CUSTOMER,
  [UseerRoleProto.UNRECOGNIZED]: UserRole.CUSTOMER,
};
export const driverStatusMapping: Record<DriverStatus, DriverStatusEnum> = {
  [DriverStatus.DRIVER_STATUS_UNSPECIFIED]: DriverStatusEnum.ONLINE,
  [DriverStatus.UNRECOGNIZED]: DriverStatusEnum.ONLINE,
  [DriverStatus.DRIVER_STATUS_OFFLINE]: DriverStatusEnum.OFFLINE,
  [DriverStatus.DRIVER_STATUS_ONLINE]: DriverStatusEnum.ONLINE,
  [DriverStatus.DRIVER_STATUS_BUSY]: DriverStatusEnum.BUSY,
};
export const driverApprovalStatusMapping: Record<
  DriverApprovalStatus,
  DriverApprovalStatusEnum
> = {
  [DriverApprovalStatus.DRIVER_APPROVAL_STATUS_UNSPECIFIED]:
    DriverApprovalStatusEnum.PENDING,
  [DriverApprovalStatus.UNRECOGNIZED]: DriverApprovalStatusEnum.PENDING,
  [DriverApprovalStatus.DRIVER_APPROVAL_STATUS_PENDING]:
    DriverApprovalStatusEnum.PENDING,
  [DriverApprovalStatus.DRIVER_APPROVAL_STATUS_ACCEPTED]:
    DriverApprovalStatusEnum.ACCEPTED,
  [DriverApprovalStatus.DRIVER_APPROVAL_STATUS_REJECTED]:
    DriverApprovalStatusEnum.REJECTED,
};
