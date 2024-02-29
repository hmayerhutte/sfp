import { PROCESSNAME,PATH,EVENTTYPE, ValidateHookSchema } from './types';
import fs from 'fs';
import { ValidateJobMarkdown } from '../eventMarkdown/validate';
import { ValidateProps } from '../../impl/validate/ValidateImpl';
import { ReleaseStreamService } from './release';
import { BuildStreamService } from './build';

export class ValidateStreamService {
    public static buildProps(props: ValidateProps): void {
        ValidateLoggerBuilder.getInstance().buildProps(props);
    }

    public static buildCommandError(message: string): void {
        ValidateLoggerBuilder.getInstance().buildCommandError(message);
    }

    public static buildJobId(jobId: string): void {
        ValidateLoggerBuilder.getInstance().buildJobId(jobId);
    }

    public static buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): void {
        ValidateLoggerBuilder.getInstance().buildStatistik(elapsedTime,failed,success, scheduled);
    }

    public static cloneReleaseAndBuild(): void {
        ValidateLoggerBuilder.getInstance().buildCloneReleaseAndBuild();
    }

    public static writeArtifacts(): void {
        const file = ValidateLoggerBuilder.getInstance().build();
        if (!fs.existsSync(PATH.DEFAULT)) {
            fs.mkdirSync(PATH.DEFAULT);
        }
            fs.writeFileSync(PATH.VALIDATE, JSON.stringify(file, null, 4), 'utf-8');
            ValidateJobMarkdown.run(file);
    }


}

class ValidateLoggerBuilder {
    private file: ValidateHookSchema;
    private static instance: ValidateLoggerBuilder;

    private constructor() {
        this.file = {
            payload: {
                processName: PROCESSNAME.VALIDATE,
                scheduled: 0,
                success: 0,
                failed: 0,
                elapsedTime: 0,
                status: 'inprogress',
                message: '',
                releaseConfig: [],
                instanceUrl: '',
                deployEvents: {},
                buildEvents: {},
            },
            eventType: EVENTTYPE.VALIDATE,
            jobId: '',
            devHubAlias: '',
            branch: '',
        };
    }

    public static getInstance(): ValidateLoggerBuilder {
        if (!ValidateLoggerBuilder.instance) {
            ValidateLoggerBuilder.instance = new ValidateLoggerBuilder();
        }

        return ValidateLoggerBuilder.instance;
    }

    buildProps(props: ValidateProps): ValidateLoggerBuilder {
        this.file.payload.validateProps = {...props, hubOrg: undefined}; //without hubOrg to reduce complexity
        return this;
    }

    buildCommandError(message: string): ValidateLoggerBuilder {
        this.file.payload.status = 'failed';
        this.file.payload.message = message;
        return this;
    }

    buildJobId(jobId: string): ValidateLoggerBuilder {
        this.file.jobId = jobId;
        return this;
    }

    buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): ValidateLoggerBuilder {
        this.file.payload.elapsedTime = elapsedTime;
        this.file.payload.status = this.file.payload.status === 'inprogress' ? 'success' : 'failed';
        this.file.payload.failed = failed;
        this.file.payload.success = success;
        this.file.payload.scheduled = scheduled;
        return this;
    }

    buildCloneReleaseAndBuild(): ValidateLoggerBuilder {
        const releaseFile = ReleaseStreamService.getFile();
        const buildFile = BuildStreamService.getFile();
        this.file.payload.buildEvents = buildFile.payload.events;
        this.file.payload.deployEvents = releaseFile.payload.events;
        this.file.payload.instanceUrl = releaseFile.payload.instanceUrl;
        return this;
    }

    build(): ValidateHookSchema {
        return this.file;
    }
}
