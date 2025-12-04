import {
  CreateUserDto,
  GetUserDto,
  GetUsersDto,
  LoginUserDto,
  UpdateProfileDto,
} from '@/user/src/dto';
import { status } from '@grpc/grpc-js';
import {
  convertStringsToDates,
  generateNotificationContent,
  NotificationParams,
  SERVICES,
  TGrpcUser,
} from '@libs/common';
import { EventTypes, PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { CreateDriverDto, CreateOutboxDto } from '@libs/common/dto';
import { DriverApprovalStatusEnum, DriverStatusEnum } from '@libs/common/enums';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import {
  GetMeResponse,
  GetUsersResponse,
  LoginResponse,
  RegisterResponse,
} from '@libs/common/proto/user';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '@user-service/enums';
import * as bcrypt from 'bcryptjs';
import { instanceToPlain } from 'class-transformer';
import { omit } from 'lodash';
import { ObjectType } from 'nestjs-dynamoose';
import CircuitBreaker from 'opossum';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OutboxEvent, User, UserProfile } from './entities';

@Injectable()
export class UserService {
  private getDriverApprovalStatusBreaker: CircuitBreaker<
    [userId: string],
    ObjectType | undefined
  >;
  private getDriverInfoBreaker: CircuitBreaker<[userId: string], ObjectType>;
  private createDriverBreaker: CircuitBreaker<
    [CreateDriverRequest: CreateDriverDto, userId: string],
    | {
        message: string;
        data: {
          driverApprovalId: string;
          driverId: string;
        };
      }
    | undefined
  >;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.getDriverApprovalStatusBreaker = new CircuitBreaker(
      (userId) =>
        this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.GET_APPROVAL_STATUS,
          { userId },
        ),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.getDriverInfoBreaker = new CircuitBreaker(
      (userId) =>
        this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.GET_INFO,
          { userId },
        ),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.createDriverBreaker = new CircuitBreaker(
      (createDriverRequest, userId) =>
        this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.CREATE,
          {
            createDriverDto: createDriverRequest,
            userId,
          },
        ),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.getDriverApprovalStatusBreaker.fallback(() => ({
      status: DriverApprovalStatusEnum.PENDING,
    }));

    this.getDriverInfoBreaker.fallback(() => ({
      driverId: '',
      userId: '',
      rating: 0,
      totalTrip: 0,
      licenseNumber: '',
      licenseExpiry: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    this.createDriverBreaker.fallback(() => undefined);
  }

  public register = async (
    registerRequest: CreateUserDto,
  ): Promise<RegisterResponse> => {
    const { email, password, role, createDriverDto, ...res } = registerRequest;

    const exists = await this.userRepo.findOne({ where: { email } });

    if (exists)
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Email has existed.',
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      role,
    });

    await this.userRepo.save(user);

    const profile = this.profileRepo.create({
      ...res,
      user,
    });

    await this.profileRepo.save(profile);

    let driverApprovalId: string = '';
    let driverId: string = '';

    if (
      user.role === UserRole.DRIVER &&
      createDriverDto &&
      Object.keys(createDriverDto)?.length > 0
    ) {
      const driverInfo = await this.createDriverBreaker.fire(
        createDriverDto,
        user.id,
      );

      if (!driverInfo)
        throw new RpcException({
          code: status.INTERNAL,
          message: 'Driver info created failed.',
        });

      driverApprovalId = driverInfo.data.driverApprovalId;
      driverId = driverInfo.data.driverId;
    }

    const savedUser = await this.getMe(user.id);

    let typeNotif: NotificationTypeEnum | null = null;
    let params: NotificationParams = {};
    let messageNotif: string = '';
    let titleNotif: string = '';
    let userIdNotif: string = '';

    if (role === UserRole.CUSTOMER) {
      typeNotif = NotificationTypeEnum.ACCOUNT_CREATED;
      params = {
        userName: savedUser.profile?.fullName ?? '',
      };

      const { message, title } = generateNotificationContent(typeNotif, params);

      messageNotif = message;
      titleNotif = title;
      userIdNotif = savedUser.id;
    } else if (role === UserRole.DRIVER) {
      const admin = await this.findAminUser();

      typeNotif = NotificationTypeEnum.DRIVER_SUBMITTED_DOCUMENTS;
      params = {
        driverName: savedUser.profile?.fullName ?? '',
      };

      const { message, title } = generateNotificationContent(typeNotif, params);

      messageNotif = message;
      titleNotif = title;
      userIdNotif = admin.id;
    }

    this.rabbitMqService.emit(
      SERVICES.NOTIFICATION_SERVICE,
      PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
      {
        userId: userIdNotif,
        createNotificationDto: {
          type: typeNotif,
          message: messageNotif,
          title: titleNotif,
        },
        ...(driverApprovalId?.trim() &&
          driverId?.trim() && {
            data: {
              driverApprovalId,
              driverId,
            },
          }),
      },
    );

    const message =
      savedUser.role === UserRole.CUSTOMER
        ? 'Your account has been created.'
        : 'Your documents have been submitted for admin review. Please wait for approval.';

    return {
      message,
      success: true,
      data: {
        sub: savedUser.id,
        fullName: savedUser?.profile?.fullName ?? '',
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  };

  public login = async (loginUserDto: LoginUserDto): Promise<LoginResponse> => {
    return this.dataSource.transaction(async (manager) => {
      const { email, password, currentLocation } = loginUserDto;

      const user = await manager
        .getRepository(User)
        .findOne({ where: { email } });

      if (!user)
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'Invalid credentials',
        });

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch)
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: 'Invalid credentials',
        });

      if (user.role === UserRole.DRIVER && !currentLocation?.trim()) {
        throw new RpcException({
          code: status.INVALID_ARGUMENT,
          message: 'Driver must provide current location when logging in.',
        });
      }

      if (user.role === UserRole.DRIVER && currentLocation?.trim()) {
        const driverApproval = await this.getDriverApprovalStatusBreaker.fire(
          user.id,
        );

        if (!driverApproval) {
          throw new RpcException({
            code: status.NOT_FOUND,
            message: 'Driver approval record not found. Please register again.',
          });
        }

        if (driverApproval.status !== DriverApprovalStatusEnum.ACCEPTED) {
          throw new RpcException({
            code: status.NOT_FOUND,
            message: 'Your driver account has not been approved yet.',
          });
        }
      }

      const payload: TGrpcUser = {
        sub: user.id,
        role: user.role,
      };

      const token = await this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>(
          'jwt_expiration_time',
          '120s',
        ),
        secret: this.configService.get<string>('jwt_secret', ''),
      });

      if (user.role === UserRole.DRIVER && currentLocation?.trim()) {
        const driverInfo = await this.getDriverInfoBreaker.fire(user.id);

        await this.createNewOutbox(
          {
            eventType: EventTypes.UPDATE_DRIVER_STATUS,
            payload: {
              driverId: driverInfo.driverId,
              status: DriverStatusEnum.ONLINE,
              currentLocation,
            },
            aggregateId: user.id,
            aggregateType: 'USER',
          },
          manager,
        );
      }

      return { accessToken: token };
    });
  };

  public getMe = async (sub: string): Promise<GetMeResponse> => {
    const user = await this.userRepo.findOne({
      where: {
        id: sub,
      },
      relations: {
        profile: true,
      },
    });

    if (!user)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found.',
      });

    let formattedUser: any = {
      ...omit(user, ['password']),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      profile: user.profile
        ? {
            ...user.profile,
            birthDay: user.profile.birthDay?.toISOString(),
          }
        : undefined,
    };

    if (user.role === UserRole.DRIVER) {
      formattedUser.driverInfo = await this.getDriverInfoBreaker.fire(user.id);
    }

    let plainUser: any = instanceToPlain(formattedUser);
    plainUser = convertStringsToDates(plainUser);

    return plainUser;
  };

  async updateProfile(grpcUser: TGrpcUser, updateProfileDto: UpdateProfileDto) {
    const { sub } = grpcUser;

    const profile = await this.profileRepo.findOne({
      where: {
        user: {
          id: sub,
        },
      },
    });

    if (!profile)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Profile not found',
      });

    Object.assign(profile, updateProfileDto);
    await this.profileRepo.save(profile);

    return this.getMe(sub);
  }

  private createNewOutbox = async (
    createOutboxDto: CreateOutboxDto,
    manager: EntityManager,
  ) => {
    const outboxRepo = manager.getRepository(OutboxEvent);
    const newOutbox = outboxRepo.create(createOutboxDto);
    return outboxRepo.save(newOutbox);
  };

  private async findAminUser() {
    const admin = await this.userRepo.findOne({
      where: {
        role: UserRole.ADMIN,
      },
    });

    if (!admin)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Admin user not found.`,
      });

    return admin;
  }

  async getProfileByUserId(userId: string) {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
      relations: {
        profile: true,
      },
    });

    if (!user)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `User ${userId} not found`,
      });

    return user;
  }

  async getUsers(getUsersDto: GetUsersDto): Promise<GetUsersResponse> {
    const { role: filterRole } = getUsersDto;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.role != :adminRole', { adminRole: UserRole.ADMIN });

    if (filterRole) {
      qb.andWhere('user.role = :filterRole', { filterRole });
    }

    const users = await qb.getMany();

    return {
      users: users.map((u) => omit(u, ['password'])),
    };
  }

  async getUser(getUserDto: GetUserDto): Promise<GetMeResponse> {
    const { userId } = getUserDto;
    return this.getMe(userId);
  }
}
