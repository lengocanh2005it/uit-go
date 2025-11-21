import {
  DeleteNotificationOfUserDto,
  GetNotificationsOfUserDto,
  MarkAsReadDto,
} from '@/notification/src/dto';
import { TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import { JwtGrpcGuard } from '@libs/common/guards';
import { NOTIFICATION_SERVICE_NAME } from '@libs/common/proto/notification';
import { Controller, ParseUUIDPipe, UseGuards, UsePipes } from '@nestjs/common';
import { EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from '@libs/common/dto/notification';
import { GrpcValidationPipe } from '@libs/common/pipes';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @GrpcMethod(
    NOTIFICATION_SERVICE_NAME,
    GRPC_METHODS.NOTIFICATION_SERVICE.MARK_AS_READ,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async markAsRead(@GrpcBody(MarkAsReadDto) markAsReadDto: MarkAsReadDto) {
    return this.notificationService.markAsRead(markAsReadDto);
  }

  @GrpcMethod(
    NOTIFICATION_SERVICE_NAME,
    GRPC_METHODS.NOTIFICATION_SERVICE.DELETE_NOTIFICATION_OF_USER,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async deleteNotificationOfUser(
    @GrpcBody(DeleteNotificationOfUserDto)
    deleteNotificationOfUserDto: DeleteNotificationOfUserDto,
  ) {
    return this.notificationService.deleteNotificationOfUser(
      deleteNotificationOfUserDto,
    );
  }

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
  @UsePipes(GrpcValidationPipe)
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
