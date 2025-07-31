import { CreateScheduleDto, UpdateScheduleDto, ScheduleResponse, ScheduleListQuery } from '../types/schedule.types';
import { QueueManager } from './queue-manager';
export declare class ScheduleService {
    private queueManager;
    private schedulerQueue;
    constructor(queueManager: QueueManager);
    private initializeSchedulerQueue;
    createSchedule(dto: CreateScheduleDto, createdBy: string): Promise<ScheduleResponse>;
    updateSchedule(scheduleId: string, dto: UpdateScheduleDto, updatedBy: string): Promise<ScheduleResponse>;
    deleteSchedule(scheduleId: string): Promise<void>;
    getSchedule(scheduleId: string): Promise<ScheduleResponse>;
    listSchedules(query: ScheduleListQuery): Promise<{
        schedules: ScheduleResponse[];
        total: number;
        page: number;
        pages: number;
    }>;
    executeScheduleNow(scheduleId: string): Promise<{
        executionId: string;
    }>;
    executeScheduledJob(scheduleId: string): Promise<void>;
    private executeHttpCall;
    private addScheduleToQueue;
    private removeFromQueue;
    private validateScheduleConfig;
    private validateEndpointConfig;
    private calculateNextExecution;
    private formatScheduleResponse;
}
//# sourceMappingURL=schedule.service.d.ts.map