import { GetServerLocationResponse } from '@libs/common/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CommonService {
  constructor(private readonly configService: ConfigService) {}

  async getServerLocation(): Promise<GetServerLocationResponse> {
    const res = await axios.get(
      this.configService.get<string>('ipwho_url', ''),
    );
    return {
      latitude: res.data.latitude,
      longitude: res.data.longitude,
      city: res.data.city,
      country: res.data.country,
    };
  }
}
