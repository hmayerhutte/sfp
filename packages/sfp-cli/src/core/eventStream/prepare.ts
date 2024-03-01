import { PROCESSNAME,PATH,EVENTTYPE,EVENTSTATUS, PrepareHookSchema } from './types';
import fs from 'fs';
import { PrepareJobMarkdown } from '../eventMarkdown/prepare';
import { PoolConfig } from '../../core/scratchorg/pool/PoolConfig';
import ScratchOrg from './../../core/scratchorg/ScratchOrg';
import { HookService } from './hooks';

export class PrepareStreamService {
    public static buildPoolConfig(props: PoolConfig): void {
        PrepareLoggerBuilder.getInstance().buildPoolConfig(props);
    }

    public static buildPrepareInitialitation(alias: string): void {
        PrepareLoggerBuilder.getInstance().buildPrepareInitialitation(alias);
    }

    public static buildCommandError(message: string): void {
        PrepareLoggerBuilder.getInstance().buildCommandError(message);
    }

    public static buildJobId(jobId: string): void {
        PrepareLoggerBuilder.getInstance().buildJobId(jobId);
    }

    public static buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): void {
        PrepareLoggerBuilder.getInstance().buildStatistik(elapsedTime,failed,success, scheduled);
    }

    public static buildScratchOrgInfo(alias: string, scratchOrg: ScratchOrg): void {
        PrepareLoggerBuilder.getInstance().buildScratchOrgInfo(alias, scratchOrg);
    }

    public static buildScratchOrgPassword(alias: string, password: string): void {
        PrepareLoggerBuilder.getInstance().buildScratchOrgPassword(alias, password);
    }

    public static buildScratchOrgError(alias: string, message: string): void {
        PrepareLoggerBuilder.getInstance().buildScratchOrgError(alias, message);
    }

    public static buildScratchOrgSuccess(alias: string): void {
        PrepareLoggerBuilder.getInstance().buildScratchOrgSuccess(alias);
    }

    public static buildExecuteInProgress(alias: string): void {
        PrepareLoggerBuilder.getInstance().buildExecuteInProgress(alias);
    }

    public static buildExecuteSuccess(alias: string): void {
        PrepareLoggerBuilder.getInstance().buildExecuteSuccess(alias);
    }

    public static buildExecuteFailed(alias: string, message: string): void {
        PrepareLoggerBuilder.getInstance().buildExecuteFailed(alias, message);
    }

    public static writeArtifacts(): void {
        const file = PrepareLoggerBuilder.getInstance().build();
        if (!fs.existsSync(PATH.DEFAULT)) {
            fs.mkdirSync(PATH.DEFAULT);
        }
            fs.writeFileSync(PATH.PREPARE, JSON.stringify(file, null, 4), 'utf-8');
            PrepareJobMarkdown.run(file);
    }


}

class PrepareLoggerBuilder {
    private file: PrepareHookSchema;
    private static instance: PrepareLoggerBuilder;

    private constructor() {
        this.file = {
            payload: {
                processName: PROCESSNAME.PREPARE,
                scheduled: 0,
                success: 0,
                failed: 0,
                elapsedTime: 0,
                status: 'inprogress',
                message: '',
                externalDependencies: [],
                events: {},
            },
            eventType: EVENTTYPE.PREPARE,
            jobId: '',
            devhubAlias: '',
        };
    }

    public static getInstance(): PrepareLoggerBuilder {
        if (!PrepareLoggerBuilder.instance) {
            PrepareLoggerBuilder.instance = new PrepareLoggerBuilder();
        }

        return PrepareLoggerBuilder.instance;
    }

    buildPoolConfig(props: PoolConfig): PrepareLoggerBuilder {
        this.file.payload.poolConfig = props;
        return this;
    }

    buildCommandError(message: string): PrepareLoggerBuilder {
        this.file.payload.status = 'failed';
        this.file.payload.message = message;
        return this;
    }

    buildPrepareInitialitation(alias: string): PrepareLoggerBuilder {
        this.file.payload.events[alias] = {
            event: EVENTSTATUS.PREPARE_REQUEST_PROGRESS,
            context: {
                stage: 'prepare',
                eventId: `${this.file.jobId}_${Date.now().toString()}`,
                jobId: this.file.jobId,
                timestamp: new Date(),
                devHubAlias: this.file.devhubAlias,
                eventType: EVENTTYPE.PREPARE,
                instanceUrl: '',
                branch: '',
                commitId: '',
            },
            metadata: {
                package: alias,
                alias: alias,
                orgId: '',
                username: '',
                loginURL: '',
                elapsedTime: 0,
                password: '',
                message: ''
            },
        };
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        return this;
    }

    buildScratchOrgInfo(alias: string, scratchOrg: ScratchOrg): PrepareLoggerBuilder {
        this.file.payload.events[alias].metadata.loginURL = scratchOrg.loginURL;
        this.file.payload.events[alias].metadata.orgId = scratchOrg.orgId;
        this.file.payload.events[alias].metadata.username = scratchOrg.username;
        this.file.payload.events[alias].metadata.elapsedTime = scratchOrg.elapsedTime;
        return this;
    }

    buildScratchOrgPassword(alias: string, password: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].metadata.password = password;
        return this;
    }

    buildScratchOrgError(alias: string, message: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].event = EVENTSTATUS.PREPARE_REQUEST_FAILED;
        if (message) {
            this.file.payload.events[alias].metadata.message = message;
        }
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        return this;
    }

    buildScratchOrgSuccess(alias: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].event = EVENTSTATUS.PREPARE_REQUEST_SUCCESS;
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        return this;
    }

    buildExecuteInProgress(alias: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].event = EVENTSTATUS.PREPARE_EXECUTE_REQUEST;
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        return this;
    }

    buildExecuteSuccess(alias: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].event = EVENTSTATUS.PREPARE_EXECUTE_SUCCESS;
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        return this;
    }

    buildExecuteFailed(alias: string, message: string): PrepareLoggerBuilder {
        this.file.payload.events[alias].event = EVENTSTATUS.PREPARE_EXECUTE_FAILED;
        HookService.getInstance().logEvent(this.file.payload.events[alias]);
        if (message) {
            this.file.payload.events[alias].metadata.message = message;
        }
        return this;
    }

    buildJobId(jobId: string): PrepareLoggerBuilder {
        this.file.jobId = jobId;
        return this;
    }

    buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): PrepareLoggerBuilder {
        this.file.payload.elapsedTime = elapsedTime;
        this.file.payload.status = this.file.payload.status === 'inprogress' ? 'success' : 'failed';
        this.file.payload.failed = failed;
        this.file.payload.success = success;
        this.file.payload.scheduled = scheduled;
        return this;
    }

    build(): PrepareHookSchema {
        return this.file;
    }
}
