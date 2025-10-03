import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '@libs/common/dto/user/create-user.dto';
import { LoginUserDto } from '@libs/common/dto/user/login-user.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('/sign-up')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto)
  }

  @Post('/sign-in')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto)
  }

}
