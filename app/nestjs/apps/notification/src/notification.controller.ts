import { GetNotificationsOfUserDto } from '@/notification/src/dto';
import { TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import { JwtGrpcGuard } from '@libs/common/guards';
import { NOTIFICATION_SERVICE_NAME } from '@libs/common/proto/notification';
import { Controller, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from '@libs/common/dto/notification';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION)
  async createNotification(
    @Payload('createNotificationDto')
    createNotificationDto: CreateNotificationDto,
    @Payload('userId', ParseUUIDPipe) userId: string,
    @Payload('data') data?: Record<string, any>,
  ) {
    return this.notificationService.createNotification(
      createNotificationDto,
      userId,
      data,
    );
  }

  @GrpcMethod(
    NOTIFICATION_SERVICE_NAME,
    GRPC_METHODS.NOTIFICATION_SERVICE.GET_NOTIFICATIONS_OF_USER,
  )
  @UseGuards(JwtGrpcGuard)
  async getNotificationsOfUser(
    @GrpcBody(GetNotificationsOfUserDto)
    getNotificationOfUserDto: GetNotificationsOfUserDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.notificationService.getNotificationsOfUser(
      getNotificationOfUserDto,
      grpcUser,
    );
  }
}
