import {
  DeleteNotificationOfUserDto,
  GetNotificationsOfUserDto,
  MarkAsReadDto,
} from '@/notification/src/dto';
import {
  Notification,
  NotificationDocument,
  UserNotification,
  UserNotificationDocument,
} from '@/notification/src/schemas';
import { status } from '@grpc/grpc-js';
import { TGrpcUser } from '@libs/common';
import { CreateNotificationDto } from '@libs/common/dto/notification';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import {
  DeleteNotificationOfUserResponse,
  GetNotificationsOfUserResponse,
  MarkAsReadResponse,
} from '@libs/common/proto/notification';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(UserNotification.name)
    private readonly userNotificationModel: Model<UserNotificationDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async markAsRead(markAsReadDto: MarkAsReadDto): Promise<MarkAsReadResponse> {
    const { notificationId } = markAsReadDto;

    const notification = await this.userNotificationModel
      .findById(notificationId)
      .populate('notification')
      .exec();

    if (!notification) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Notification not found.`,
      });
    }

    const updated = await this.userNotificationModel.findByIdAndUpdate(
      notificationId,
      {
        read: true,
        readAt: new Date(),
      },
      { new: true },
    );

    if (!updated)
      throw new RpcException({
        code: status.INTERNAL,
        message: `Can't update the notification.`,
      });

    const notif = updated.notification as unknown as NotificationDocument;

    return {
      id: updated._id.toString(),
      message: updated.message,
      read: updated.read,
      readAt: updated.readAt,
      data: updated.data ?? {},
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      notification: {
        id: notif._id.toString(),
        title: notif.title,
        type: notif.type,
        createdAt: notif.createdAt,
        updatedAt: notif.updatedAt,
      },
    };
  }

  async deleteNotificationOfUser(
    deleteNotificationDto: DeleteNotificationOfUserDto,
  ): Promise<DeleteNotificationOfUserResponse> {
    const { notificationId } = deleteNotificationDto;

    const notif = await this.userNotificationModel.findById(notificationId);

    if (!notif)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Notification not found.`,
      });

    await this.userNotificationModel.findOneAndDelete({ id: notificationId });

    return {
      message: 'The notification has been deleted successfully.',
      success: true,
    };
  }

  async createNotification(
    createNotificationDto: CreateNotificationDto,
    userId: string,
    data?: Record<string, any>,
  ) {
    const { type, title, message } = createNotificationDto;
    const notification = await this.createNewNotification(title, type);

    await this.userNotificationModel.create({
      userId,
      notification,
      message,
      ...(data && { data }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getNotificationsOfUser(
    getNotificationsOfUserDto: GetNotificationsOfUserDto,
    grpcUser: TGrpcUser,
  ): Promise<GetNotificationsOfUserResponse> {
    const { read } = getNotificationsOfUserDto;
    const userId = grpcUser.sub;
    const query: any = { userId };

    if (read !== undefined) {
      query.read = read;
    }

    const userNotifications = await this.userNotificationModel
      .find(query)
      .populate<{ notification: NotificationDocument }>('notification')
      .sort({ createdAt: -1 })
      .exec();

    return {
      notifications: userNotifications.map((un) => ({
        id: un._id.toString(),
        read: un.read,
        readAt: un.readAt,
        data: un.data ?? {},
        createdAt: un.createdAt,
        updatedAt: un.updatedAt,
        message: un.message,
        userId: un.userId,
        notification: {
          id: un.notification._id.toString(),
          title: un.notification.title,
          type: un.notification.type,
          createdAt: un.notification.createdAt,
          updatedAt: un.notification.updatedAt,
        },
      })),
    };
  }

  private async createNewNotification(
    title: string,
    type: NotificationTypeEnum,
  ) {
    const existed = await this.notificationModel.findOne({
      type,
    });

    if (existed) return existed;

    return this.notificationModel.create({
      title,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
