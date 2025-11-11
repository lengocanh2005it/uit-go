import { CreateUserDto, LoginUserDto, UpdateProfileDto } from '@/user/src/dto';
import { TGrpcUser } from '@libs/common';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import { JwtGrpcGuard } from '@libs/common/guards';
import { GrpcValidationPipe } from '@libs/common/pipes';
import {
  GetMeResponse,
  LoginResponse,
  RegisterResponse,
  UserServiceControllerMethods,
} from '@libs/common/proto/user';
import { Controller, UseGuards, UsePipes } from '@nestjs/common';
import { UserService } from './user.service';

@Controller()
@UserServiceControllerMethods()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtGrpcGuard)
  async getMe(@GrpcUser() grpcUser: TGrpcUser): Promise<GetMeResponse> {
    return this.userService.getUser(grpcUser.sub);
  }

  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateProfile(
    @GrpcBody(UpdateProfileDto) updateProfileDto: UpdateProfileDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ): Promise<GetMeResponse> {
    return this.userService.updateProfile(grpcUser, updateProfileDto);
  }

  @UsePipes(GrpcValidationPipe)
  async login(
    @GrpcBody(LoginUserDto) loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    return this.userService.login(loginUserDto);
  }

  @UsePipes(GrpcValidationPipe)
  async register(
    @GrpcBody(CreateUserDto) createUserDto: CreateUserDto,
  ): Promise<RegisterResponse> {
    return this.userService.register(createUserDto);
  }
}
