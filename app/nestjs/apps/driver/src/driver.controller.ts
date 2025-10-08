import { Controller, Get } from '@nestjs/common';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @Get('test')
  test() {
    return this.driverService.test();
  }
}
