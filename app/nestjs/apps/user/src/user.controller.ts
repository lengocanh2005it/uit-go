import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '@libs/common/dto/user/create-user.dto';
import { LoginUserDto } from '@libs/common/dto/user/login-user.dto';
import { UpdateProfileDto } from '@libs/common/dto/user/update-profile.dto';

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
  @Get('/users/:id')
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id)
  }

  @Put('/users/:id')
  updateProfile(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.updateProfile(id, updateProfileDto)
  }
}
