import type { TUserSession } from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { UserSession } from '@libs/common/decorators';
import { UpdateOutboxEventDto } from '@libs/common/dto';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  CreateUserDto,
  LoginUserDto,
  UpdateProfileDto,
} from '@user-service/dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('sign-up')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('sign-in')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @Get('me')
  getUser(@UserSession() userSession: TUserSession) {
    return this.userService.getUser(userSession.sub);
  }

  @Put(':id')
  updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(id, updateProfileDto);
  }

  @EventPattern(PATTERNS.USER_SERVICE.UPDATE_OUTBOX)
  async updateOutboxEvent(
    @Payload() updateOutboxEventDto: UpdateOutboxEventDto,
  ) {
    await this.userService.updateOutboxEvent(updateOutboxEventDto);
  }
}
