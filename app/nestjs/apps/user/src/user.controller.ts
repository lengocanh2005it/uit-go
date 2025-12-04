import {
  CreateUserDto,
  GetUserDto,
  GetUsersDto,
  LoginUserDto,
  UpdateProfileDto,
} from '@/user/src/dto';
import { TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import { JwtGrpcGuard } from '@libs/common/guards';
import { GrpcValidationPipe } from '@libs/common/pipes';
import {
  GetMeResponse,
  LoginResponse,
  RegisterResponse,
  USER_SERVICE_NAME,
} from '@libs/common/proto/user';
import { Controller, ParseUUIDPipe, UseGuards, UsePipes } from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.GET_ME)
  @UseGuards(JwtGrpcGuard)
  async getMe(@GrpcUser() grpcUser: TGrpcUser): Promise<GetMeResponse> {
    return this.userService.getMe(grpcUser.sub);
  }

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.UPDATE_PROFILE)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateProfile(
    @GrpcBody(UpdateProfileDto) updateProfileDto: UpdateProfileDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ): Promise<GetMeResponse> {
    return this.userService.updateProfile(grpcUser, updateProfileDto);
  }

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.LOGIN)
  @UsePipes(GrpcValidationPipe)
  async login(
    @GrpcBody(LoginUserDto) loginUserDto: LoginUserDto,
  ): Promise<LoginResponse> {
    return this.userService.login(loginUserDto);
  }

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.REGISTER)
  @UsePipes(GrpcValidationPipe)
  async register(
    @GrpcBody(CreateUserDto) createUserDto: CreateUserDto,
  ): Promise<RegisterResponse> {
    return this.userService.register(createUserDto);
  }

  @MessagePattern(PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID)
  async getProfileByUserId(@Payload('userId', ParseUUIDPipe) userId: string) {
    return this.userService.getProfileByUserId(userId);
  }

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.GET_USERS)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getUsers(@GrpcBody(GetUsersDto) getUsersDto: GetUsersDto) {
    return this.userService.getUsers(getUsersDto);
  }

  @GrpcMethod(USER_SERVICE_NAME, GRPC_METHODS.USER_SERVICE.GET_USER)
  @UsePipes(GrpcValidationPipe)
  @UseGuards(JwtGrpcGuard)
  async getUser(@GrpcBody(GetUserDto) getUserDto: GetUserDto) {
    return this.userService.getUser(getUserDto);
  }
}
