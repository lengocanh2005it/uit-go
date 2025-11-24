import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redisClient = new Redis({
      host: configService.get<string>('redis.host', ''),
      port: configService.get<number>('redis.port', 6379),
      tls: configService.get<boolean>('redis.tls', false) ? {} : undefined,
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Connected to Redis.');
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  getClient(): Redis {
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

  async geoAdd(
    key: string,
    longitude: number,
    latitude: number,
    member: string,
  ): Promise<number> {
    return this.redisClient.geoadd(key, longitude, latitude, member);
  }

  async geoRadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: 'm' | 'km' | 'mi' | 'ft' = 'km',
  ) {
    return this.redisClient.georadius(key, longitude, latitude, radius, unit);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.redisClient.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    const subscriber = this.redisClient.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (_channel, message) => {
      if (_channel === channel) callback(message);
    });
  }

  pipeline() {
    return this.redisClient.pipeline();
  }

  async geoRadiusWithDistance(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: 'm' | 'km' | 'mi' | 'ft' = 'km',
    count?: number,
  ): Promise<{ member: string; distance: number }[]> {
    const resRaw = await this.redisClient.georadius(
      key,
      longitude,
      latitude,
      radius,
      unit,
      'WITHDIST',
      ...(count ? ['COUNT', count] : []),
    );

    return (resRaw as Array<[string, string]>).map(([member, distance]) => ({
      member,
      distance: parseFloat(distance),
    }));
  }

  async geoPos(
    key: string,
    member: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const res = await this.redisClient.geopos(key, member);
    if (!res || !res[0]) return null;

    return {
      lng: parseFloat(res[0][0]),
      lat: parseFloat(res[0][1]),
    };
  }

  async isDriverOnline(driverId: string): Promise<boolean> {
    return (await this.redisClient.sismember('online_drivers', driverId)) === 1;
  }

  async areDriversOnline(
    driverIds: string[],
  ): Promise<Record<string, boolean>> {
    const pipeline = this.redisClient.pipeline();
    driverIds.forEach((id) => pipeline.sismember('online_drivers', id));
    const results = await pipeline.exec();
    const map: Record<string, boolean> = {};
    driverIds.forEach((id, i) => {
      map[id] = results?.[i]?.[1] === 1;
    });
    return map;
  }
}
