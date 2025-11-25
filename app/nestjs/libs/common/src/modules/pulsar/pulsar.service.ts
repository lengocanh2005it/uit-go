import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pulsar from 'pulsar-client';

@Injectable()
export class PulsarService implements OnModuleDestroy {
  private client: Pulsar.Client;
  private producers: Map<string, Pulsar.Producer> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.client = new Pulsar.Client({
      serviceUrl: configService.get<string>(
        'pulsar.service_url',
        'pulsar://localhost:6650',
      ),
    });
  }

  async onModuleDestroy() {
    for (const producer of this.producers.values()) {
      await producer.close();
    }
    await this.client.close();
  }

  async createProducer(topic: string): Promise<Pulsar.Producer> {
    if (!this.producers.has(topic)) {
      const producer = await this.client.createProducer({
        topic,
      });
      this.producers.set(topic, producer);
    }
    return this.producers.get(topic) as Pulsar.Producer;
  }

  async sendMessage(topic: string, message: Record<string, any>, key?: string) {
    const producer = await this.createProducer(topic);
    await producer.send({
      data: Buffer.from(JSON.stringify(message)),
      partitionKey: key,
    });
  }

  async createConsumer(
    topic: string,
    subscription: string,
    subscriptionType: 'Exclusive' | 'Shared' | 'KeyShared' = 'Shared',
  ): Promise<Pulsar.Consumer> {
    const consumer = await this.client.subscribe({
      topic,
      subscription,
      subscriptionType,
    });
    return consumer;
  }
}
