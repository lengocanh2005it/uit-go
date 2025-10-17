import { SERVICES, TUserSession } from '@libs/common';
import { EventTypes, PATTERNS } from '@libs/common/constants';
import {
  InjectKongService,
  InjectRabbitMqService,
} from '@libs/common/decorators';
import { CreateOutboxDto } from '@libs/common/dto';
import { DriverApprovalStatusEnum, DriverStatusEnum } from '@libs/common/enums';
import { KongService } from '@libs/common/modules/kong/kong.service';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  CreateUserDto,
  LoginUserDto,
  UpdateProfileDto,
} from '@user-service/dto';
import { UserRole } from '@user-service/enums';
import * as bcrypt from 'bcryptjs';
import { omit } from 'lodash';
import { ObjectType } from 'nestjs-dynamoose';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OutboxEvent, User, UserProfile } from './entities';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectKongService() private readonly kongService: KongService,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public register = async (createUserDto: CreateUserDto) => {
    const { email, password, role, createDriverDto, ...res } = createUserDto;
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email has existed.');
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
    try {
      await this.kongService.createNewConsumer(user.id);
    } catch (err) {
      console.error('Failed to create Kong consumer:', err.message);
    }
    if (
      user.role === UserRole.DRIVER &&
      createDriverDto &&
      Object.keys(createDriverDto)?.length > 0
    ) {
      const driverInfo = await this.rabbitMqService.send(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.CREATE,
        {
          createDriverDto,
          userId: user.id,
        },
      );

      if (!driverInfo)
        throw new InternalServerErrorException('Driver info created failed.');
    }
    return this.getUser(user.id);
  };

  public login = async (loginUserDto: LoginUserDto) => {
    return this.dataSource.transaction(async (manager) => {
      const { email, password } = loginUserDto;
      const user = await manager
        .getRepository(User)
        .findOne({ where: { email } });
      if (!user) throw new UnauthorizedException('Invalid credentials');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new UnauthorizedException('Invalid credentials');

      if (user.role === UserRole.DRIVER) {
        const driverApproval = await this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.GET_APPROVAL_STATUS,
          { userId: user.id },
        );

        if (!driverApproval) {
          throw new UnauthorizedException(
            'Driver approval record not found. Please register again.',
          );
        }

        if (driverApproval.status !== DriverApprovalStatusEnum.ACCEPTED) {
          throw new UnauthorizedException(
            'Your driver account has not been approved yet.',
          );
        }
      }

      const payload: TUserSession = {
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

      if (user.role === UserRole.DRIVER) {
        const driverInfo = await this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.GET_INFO,
          { userId: user.id },
        );

        await this.createNewOutbox(
          {
            eventType: EventTypes.UPDATE_DRIVER_STATUS,
            payload: {
              driverId: driverInfo.driverId,
              status: DriverStatusEnum.ONLINE,
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

  public getUser = async (userId: string) => {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
      relations: {
        profile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found.');

    let formattedUser: any = omit(user, ['password']);

    if (user.role === UserRole.DRIVER) {
      formattedUser.driverInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.GET_INFO,
        {
          userId: user.id,
        },
      );
    }

    return formattedUser;
  };

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.profileRepo.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    Object.assign(profile, updateProfileDto);
    return this.profileRepo.save(profile);
  }

  private createNewOutbox = async (
    createOutboxDto: CreateOutboxDto,
    manager: EntityManager,
  ) => {
    const outboxRepo = manager.getRepository(OutboxEvent);
    const newOutbox = outboxRepo.create(createOutboxDto);
    return outboxRepo.save(newOutbox);
  };
}
