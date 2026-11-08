import { StatisticsController } from './statistics.controller.ts';
import { StatisticsService } from './statistics.service.ts';
import {
  StatisticsRepository,
  defaultStatisticsModels,
} from './statistics.repository.ts';
import { User } from '../user/user.model.ts';
import { UserRepository } from '../user/user.repository.ts';
import { Facility } from '../facility/facility.model.ts';
import { FacilityRepository } from '../facility/facility.repository.ts';
import { redis } from '../../config/redis.config.ts';

const statisticsRepository = new StatisticsRepository(defaultStatisticsModels);
const userRepository = new UserRepository(User);
const facilityRepository = new FacilityRepository(Facility);

export const statisticsService = new StatisticsService(
  statisticsRepository,
  userRepository,
  facilityRepository,
  redis
);

export const statisticsController = new StatisticsController(statisticsService);
