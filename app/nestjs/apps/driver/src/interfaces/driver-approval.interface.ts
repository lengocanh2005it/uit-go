import { DriverApprovalStatusEnum } from '@libs/common/enums';

export interface DriverApprovalKey {
  driverApprovalId: string;
}

export interface DriverApproval extends DriverApprovalKey {
  status: DriverApprovalStatusEnum;
  reviewedDate?: Date;
  note?: string;
  driverId: string;
  vehicleId: string;
  createdAt: Date;
  updatedAt: Date;
}
