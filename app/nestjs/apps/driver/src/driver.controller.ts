import { Controller } from '@nestjs/common';
import { DriverService } from './driver.service';

@Controller()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}
}
