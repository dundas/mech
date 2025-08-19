import { Queue, Job } from 'bullmq';
import { Schedule, ISchedule } from '../models/schedule.model';
import { 
  CreateScheduleDto, 
  UpdateScheduleDto, 
  ScheduleResponse, 
  ScheduleListQuery 
} from '../types/schedule.types';
import { QueueManager } from './queue-manager';
import logger from '../utils/logger';
import { ApiError } from '../utils/errors';
import * as cronParser from 'cron-parser';
import { DateTime } from 'luxon';
import axios from 'axios';

export class ScheduleService {
  private schedulerQueue: Queue | undefined;

  constructor(private queueManager: QueueManager) {
    // Create a dedicated queue for the scheduler
    this.initializeSchedulerQueue();
  }

  private async initializeSchedulerQueue() {
    try {
      this.schedulerQueue = await this.queueManager.getQueue('scheduler');
      logger.info('Scheduler queue initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler queue:', error);
    }
  }

  async createSchedule(
    dto: CreateScheduleDto,
    createdBy: string
  ): Promise<ScheduleResponse> {
    try {
      // Validate schedule configuration
      this.validateScheduleConfig(dto.schedule);
      this.validateEndpointConfig(dto.endpoint);

      // Check if schedule with same name exists
      const existing = await Schedule.findOne({ name: dto.name });
      if (existing) {
        throw new ApiError(409, `Schedule with name '${dto.name}' already exists`);
      }

      // Calculate next execution time
      const nextExecutionAt = this.calculateNextExecution(dto.schedule);

      // Create schedule document
      const schedule = new Schedule({
        name: dto.name,
        description: dto.description,
        schedule: dto.schedule,
        endpoint: dto.endpoint,
        retryPolicy: dto.retryPolicy,
        enabled: dto.enabled !== false,
        createdBy,
        metadata: dto.metadata,
        nextExecutionAt,
        executionCount: 0
      });

      // If enabled, add to BullMQ
      if (schedule.enabled) {
        const bullJobKey = await this.addScheduleToQueue(schedule);
        schedule.bullJobKey = bullJobKey;
      }

      await schedule.save();
      logger.info(`Schedule created: ${schedule.name}`);

      return this.formatScheduleResponse(schedule);
    } catch (error) {
      logger.error('Error creating schedule:', error);
      throw error;
    }
  }

  async updateSchedule(
    scheduleId: string,
    dto: UpdateScheduleDto,
    updatedBy: string
  ): Promise<ScheduleResponse> {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new ApiError(404, 'Schedule not found');
      }

      // Validate if schedule config is being updated
      if (dto.schedule) {
        this.validateScheduleConfig({ ...schedule.schedule, ...dto.schedule });
      }

      // Validate endpoint if being updated
      if (dto.endpoint) {
        this.validateEndpointConfig({ ...schedule.endpoint, ...dto.endpoint });
      }

      // Remove from BullMQ if currently active
      if (schedule.enabled && schedule.bullJobKey) {
        await this.removeFromQueue(schedule.bullJobKey);
      }

      // Update fields
      Object.assign(schedule, {
        ...dto,
        schedule: dto.schedule ? { ...schedule.schedule, ...dto.schedule } : schedule.schedule,
        endpoint: dto.endpoint ? { ...schedule.endpoint, ...dto.endpoint } : schedule.endpoint,
        retryPolicy: dto.retryPolicy || schedule.retryPolicy
      });

      // Recalculate next execution if schedule changed
      if (dto.schedule || dto.enabled !== undefined) {
        schedule.nextExecutionAt = this.calculateNextExecution(schedule.schedule);
      }

      // Re-add to BullMQ if enabled
      if (schedule.enabled) {
        const bullJobKey = await this.addScheduleToQueue(schedule);
        schedule.bullJobKey = bullJobKey;
      } else {
        schedule.bullJobKey = undefined;
      }

      await schedule.save();
      logger.info(`Schedule updated: ${schedule.name}`);

      return this.formatScheduleResponse(schedule);
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new ApiError(404, 'Schedule not found');
      }

      // Remove from BullMQ if active
      if (schedule.bullJobKey) {
        await this.removeFromQueue(schedule.bullJobKey);
      }

      await schedule.deleteOne();
      logger.info(`Schedule deleted: ${schedule.name}`);
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      throw error;
    }
  }

  async getSchedule(scheduleId: string): Promise<ScheduleResponse> {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new ApiError(404, 'Schedule not found');
    }
    return this.formatScheduleResponse(schedule);
  }

  async listSchedules(query: ScheduleListQuery): Promise<{
    schedules: ScheduleResponse[];
    total: number;
    page: number;
    pages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.enabled !== undefined) filter.enabled = query.enabled;
    if (query.createdBy) filter.createdBy = query.createdBy;

    const [schedules, total] = await Promise.all([
      Schedule.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Schedule.countDocuments(filter)
    ]);

    return {
      schedules: schedules.map(s => this.formatScheduleResponse(s)),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async executeScheduleNow(scheduleId: string): Promise<{ executionId: string }> {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        throw new ApiError(404, 'Schedule not found');
      }

      // Execute the HTTP call immediately
      const executionId = `manual_${scheduleId}_${Date.now()}`;
      await this.executeHttpCall(schedule, executionId);

      return { executionId };
    } catch (error) {
      logger.error('Error executing schedule:', error);
      throw error;
    }
  }

  // Method called by the queue worker to execute scheduled HTTP calls
  async executeScheduledJob(scheduleId: string): Promise<void> {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule || !schedule.enabled) {
        logger.warn(`Schedule ${scheduleId} not found or disabled`);
        return;
      }

      const executionId = `scheduled_${scheduleId}_${Date.now()}`;
      await this.executeHttpCall(schedule, executionId);

      // Update execution count and next execution time
      schedule.executionCount += 1;
      schedule.lastExecutedAt = new Date();

      // Check if we've reached the limit
      if (schedule.schedule.limit && schedule.executionCount >= schedule.schedule.limit) {
        schedule.enabled = false;
        schedule.bullJobKey = undefined;
        logger.info(`Schedule ${schedule.name} reached execution limit`);
      }

      // Check if we've passed the end date
      if (schedule.schedule.endDate && new Date() > new Date(schedule.schedule.endDate)) {
        schedule.enabled = false;
        schedule.bullJobKey = undefined;
        logger.info(`Schedule ${schedule.name} passed end date`);
      }

      await schedule.save();
    } catch (error) {
      logger.error(`Error executing scheduled job ${scheduleId}:`, error);
      throw error;
    }
  }

  private async executeHttpCall(schedule: ISchedule, executionId: string): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = schedule.retryPolicy?.attempts || 3;
    const backoffDelay = schedule.retryPolicy?.backoff?.delay || 5000;
    const backoffType = schedule.retryPolicy?.backoff?.type || 'exponential';

    while (attempt < maxAttempts) {
      try {
        logger.info(`Executing HTTP call for schedule ${schedule.name} (attempt ${attempt + 1}/${maxAttempts})`);

        const response = await axios({
          method: schedule.endpoint.method,
          url: schedule.endpoint.url,
          headers: schedule.endpoint.headers,
          data: schedule.endpoint.body,
          timeout: schedule.endpoint.timeout || 30000,
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        });

        const duration = Date.now() - startTime;

        // Update schedule with execution results
        schedule.lastExecutionStatus = response.status < 400 ? 'success' : 'failed';
        schedule.lastExecutionError = response.status >= 400 ? `HTTP ${response.status}: ${response.statusText}` : undefined;
        
        await schedule.save();

        logger.info(`HTTP call completed for schedule ${schedule.name}: ${response.status} in ${duration}ms`);

        // If successful or client error (4xx), don't retry
        if (response.status < 500) {
          return;
        }

        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      } catch (error) {
        attempt++;
        
        if (attempt >= maxAttempts) {
          // Final attempt failed
          schedule.lastExecutionStatus = 'failed';
          schedule.lastExecutionError = error instanceof Error ? error.message : String(error);
          await schedule.save();
          
          logger.error(`HTTP call failed for schedule ${schedule.name} after ${maxAttempts} attempts:`, error);
          throw error;
        }

        // Calculate backoff delay
        const delay = backoffType === 'exponential' 
          ? backoffDelay * Math.pow(2, attempt - 1)
          : backoffDelay;

        logger.warn(`HTTP call failed for schedule ${schedule.name}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async addScheduleToQueue(schedule: ISchedule): Promise<string> {
    const jobName = `schedule_${String(schedule._id)}`;
    const jobData = { scheduleId: String(schedule._id) };

    if (schedule.schedule.cron) {
      // Recurring job with cron pattern
      if (!this.schedulerQueue) {
        throw new Error('Scheduler queue not initialized');
      }
      const job = await this.schedulerQueue.add(jobName, jobData, {
        repeat: {
          pattern: schedule.schedule.cron,
          tz: schedule.schedule.timezone,
          endDate: schedule.schedule.endDate,
          limit: schedule.schedule.limit
        },
        jobId: `repeat_${schedule._id}`
      });
      return job.id!;
    } else if (schedule.schedule.at) {
      // One-time scheduled job
      const delay = new Date(schedule.schedule.at).getTime() - Date.now();
      if (delay > 0) {
        if (!this.schedulerQueue) {
          throw new Error('Scheduler queue not initialized');
        }
        const job = await this.schedulerQueue.add(jobName, jobData, {
          delay,
          jobId: `once_${String(schedule._id)}_${Date.now()}`
        });
        return job.id!;
      }
      throw new ApiError(400, 'Scheduled time must be in the future');
    }

    throw new ApiError(400, 'No valid schedule configuration');
  }

  private async removeFromQueue(jobKey: string): Promise<void> {
    try {
      if (!this.schedulerQueue) {
        throw new Error('Scheduler queue not initialized');
      }
      await this.schedulerQueue.removeRepeatableByKey(jobKey);
    } catch (error) {
      logger.error(`Error removing job from queue: ${error}`);
    }
  }

  private validateScheduleConfig(schedule: any): void {
    if (!schedule.cron && !schedule.at) {
      throw new ApiError(400, 'Either cron pattern or at time must be specified');
    }

    if (schedule.cron && schedule.at) {
      throw new ApiError(400, 'Cannot specify both cron pattern and at time');
    }

    if (schedule.cron) {
      try {
        cronParser.parseExpression(schedule.cron);
      } catch (error) {
        throw new ApiError(400, `Invalid cron pattern: ${schedule.cron}`);
      }
    }

    if (schedule.at) {
      const atTime = new Date(schedule.at);
      if (isNaN(atTime.getTime())) {
        throw new ApiError(400, 'Invalid date format for at time');
      }
      if (atTime.getTime() <= Date.now()) {
        throw new ApiError(400, 'Scheduled time must be in the future');
      }
    }

    if (schedule.timezone) {
      if (!DateTime.local().setZone(schedule.timezone).isValid) {
        throw new ApiError(400, `Invalid timezone: ${schedule.timezone}`);
      }
    }
  }

  private validateEndpointConfig(endpoint: any): void {
    if (!endpoint.url) {
      throw new ApiError(400, 'Endpoint URL is required');
    }

    try {
      new URL(endpoint.url);
    } catch (error) {
      throw new ApiError(400, 'Invalid endpoint URL');
    }

    if (!endpoint.method) {
      throw new ApiError(400, 'HTTP method is required');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(endpoint.method)) {
      throw new ApiError(400, `Invalid HTTP method: ${endpoint.method}`);
    }
  }

  private calculateNextExecution(schedule: any): Date | undefined {
    if (schedule.cron) {
      try {
        const options: any = {
          currentDate: new Date(),
          tz: schedule.timezone || 'UTC'
        };
        if (schedule.endDate) {
          options.endDate = new Date(schedule.endDate);
        }
        const interval = cronParser.parseExpression(schedule.cron, options);
        return interval.next().toDate();
      } catch (error) {
        logger.error('Error calculating next execution:', error);
        return undefined;
      }
    } else if (schedule.at) {
      return new Date(schedule.at);
    }
    return undefined;
  }

  private formatScheduleResponse(schedule: ISchedule): ScheduleResponse {
    return {
      id: String(schedule._id),
      name: schedule.name,
      description: schedule.description,
      schedule: {
        cron: schedule.schedule.cron,
        at: schedule.schedule.at?.toISOString(),
        timezone: schedule.schedule.timezone,
        endDate: schedule.schedule.endDate?.toISOString(),
        limit: schedule.schedule.limit
      },
      endpoint: {
        url: schedule.endpoint.url,
        method: schedule.endpoint.method,
        headers: schedule.endpoint.headers,
        body: schedule.endpoint.body,
        timeout: schedule.endpoint.timeout
      },
      retryPolicy: schedule.retryPolicy,
      enabled: schedule.enabled,
      createdBy: schedule.createdBy,
      metadata: schedule.metadata,
      lastExecutedAt: schedule.lastExecutedAt?.toISOString(),
      lastExecutionStatus: schedule.lastExecutionStatus,
      lastExecutionError: schedule.lastExecutionError,
      nextExecutionAt: schedule.nextExecutionAt?.toISOString(),
      executionCount: schedule.executionCount,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString()
    };
  }
}