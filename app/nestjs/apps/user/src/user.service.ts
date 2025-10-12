import {
  InjectKongService,
  InjectRabbitMqService,
} from '@libs/common/decorators';
import { CreateUserDto } from '@libs/common/dto/user/create-user.dto';
import { LoginUserDto } from '@libs/common/dto/user/login-user.dto';
import { UpdateProfileDto } from '@libs/common/dto/user/update-profile.dto';
import { KongService } from '@libs/common/kong/kong.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { omit } from 'lodash';
import { Repository } from 'typeorm';
import { User, UserProfile } from './entities';
import { patterns, TUserSession } from '@libs/common';
import { DriverStatusEnum, UserRole } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import { ObjectType } from 'nestjs-dynamoose';

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
  ) { }

  public register = async (createUserDto: CreateUserDto) => {
    const { email, password, role, licenseNumber, licenseExpiry, plateNumber, brand, model, color } = createUserDto;
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email has existed.');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      passwordHash: hashedPassword,
      role,
    });
    await this.userRepo.save(user);

    const profile = this.profileRepo.create({ userId: user.id });
    await this.profileRepo.save(profile);
    try {
      await this.kongService.createNewConsumer(user.id);
    } catch (err) {
      console.error('Failed to create Kong consumer:', err.message);
    }
    if (user.role === UserRole.DRIVER) {
      await this.rabbitMqService.send(
        'DRIVER_SERVICE',
        patterns.driverService.createDriver,
        {
          userId: user.id,
          licenseNumber: licenseNumber,
          licenseExpiry: licenseExpiry,
          plateNumber: plateNumber,
          brand: brand,
          model: model,
          color: color,
        })
    }
    return omit(user, ['passwordHash']);
  };

  public login = async (loginUserDto: LoginUserDto) => {
    const { email, password } = loginUserDto;
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload: TUserSession = {
      sub: user.id,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('jwt_expiration_time', '120s'),
      secret: this.configService.get<string>('jwt_secret', ''),
    });

    if (user.role === UserRole.DRIVER) {
      const driverInfo = await this.rabbitMqService.send(
        'DRIVER_SERVICE',
        patterns.driverService.getDriverInfo,
        {
          userId: user.id,
        },
      );

      if (driverInfo) {
        this.rabbitMqService.emit(
          'DRIVER_SERVICE',
          patterns.driverService.updateDriverStatus,
          {
            driverId: driverInfo.id,
            status: DriverStatusEnum.ONLINE,
          },
        );
      }
    }

    return { accessToken: token };
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

    let formattedUser: any = omit(user, ['passwordHash']);

    if (user.role === UserRole.DRIVER) {
      formattedUser.driverInfo = await this.rabbitMqService.send<ObjectType>(
        'DRIVER_SERVICE',
        patterns.driverService.getDriverInfo,
        {
          userId: user.id,
        },
      );
    }

    return formattedUser;
  };

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    Object.assign(profile, updateProfileDto);
    return this.profileRepo.save(profile);
  }
}
