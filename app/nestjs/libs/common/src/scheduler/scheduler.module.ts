import { SCHEDULER_SERVICE_TOKEN } from '@libs/common/utils';
import { Global, Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    {
      provide: SCHEDULER_SERVICE_TOKEN,
      useClass: SchedulerService,
    },
  ],
  exports: [SCHEDULER_SERVICE_TOKEN],
})
export class SchedulerModule {}
