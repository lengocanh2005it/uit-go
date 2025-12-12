import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Cluster;
  private redisNodes: Redis[];

  constructor(private readonly configService: ConfigService) {
    const nodes = (this.configService.get<string>('redis.clusterNodes') || '')
      .split(',')
      .map((node) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

    this.redisNodes = nodes.map(({ host, port }) => new Redis({ host, port }));
    this.redisClient = new Redis.Cluster(nodes);

    this.redisClient.on('connect', () => {
      console.log('✅ Connected to Redis.');
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  getRedisNodes(): Redis[] {
    return this.redisNodes;
  }

  getClient(): Cluster {
    return this.redisClient;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, 'EX', ttlSeconds);
    }
    return this.redisClient.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.redisClient.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.redisClient.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.redisClient.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.redisClient.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redisClient.lrange(key, start, stop);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redisClient.smembers(key);
  }

  pipeline() {
    return this.redisClient.pipeline();
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.srem(key, ...members);
  }
}
