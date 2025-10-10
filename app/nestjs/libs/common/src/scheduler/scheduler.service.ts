import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  addJob(name: string, cronExpression: string, callback: () => void) {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.logger.warn(`Job ${name} already exists.`);
      return;
    }

    const job = new CronJob(cronExpression, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(`✅ Added cron job: ${name}`);
  }

  deleteJob(name: string) {
    if (!this.schedulerRegistry.doesExist('cron', name)) {
      this.logger.warn(`Job ${name} does not exist.`);
      return;
    }

    this.schedulerRegistry.deleteCronJob(name);
    this.logger.log(`🗑️ Removed cron job: ${name}`);
  }
}
