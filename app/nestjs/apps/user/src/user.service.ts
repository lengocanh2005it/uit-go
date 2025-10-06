import { CreateUserDto } from '@libs/common/dto/user/create-user.dto';
import { LoginUserDto } from '@libs/common/dto/user/login-user.dto';
import { UpdateProfileDto } from '@libs/common/dto/user/update-profile.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User, UserProfile } from './entities';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public register = async (createUserDto: CreateUserDto) => {
    const { email, password, role } = createUserDto;
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email has existed.');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email: email,
      passwordHash: hashedPassword,
      role: role,
    });
    await this.userRepo.save(user);

    const profile = this.profileRepo.create({ userId: user.id });
    await this.profileRepo.save(profile);
    return user;
  };

  public login = async (loginUserDto: LoginUserDto) => {
    const { email, password } = loginUserDto;
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      iss: 'user-service',
      sub: user.id,
      role: user.role,
      aud: 'kong-api',
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('jwt_expiration_time', '120s'),
      secret: this.configService.get<string>('jwt_secret', ''),
    });

    return { accessToken: token };
  };

  public getUser = (userId: string) => {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
  };

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    Object.assign(profile, updateProfileDto);
    return this.profileRepo.save(profile);
  }
}
