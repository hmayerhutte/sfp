import { PROCESSNAME,PATH,EVENTTYPE, DeployHookSchema } from './types';
import fs from 'fs';
import { DeployJobMarkdown } from '../eventMarkdown/deploy';
import { DeployProps } from '../../impl/deploy/DeployImpl';
import { ReleaseStreamService } from './release';

export class DeployStreamService {
    public static buildProps(props: DeployProps): void {
        DeployLoggerBuilder.getInstance().buildProps(props);
    }

    public static buildCommandError(message: string): void {
        DeployLoggerBuilder.getInstance().buildCommandError(message);
    }

    public static buildJobId(jobId: string): void {
        DeployLoggerBuilder.getInstance().buildJobId(jobId);
    }

    public static buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): void {
        DeployLoggerBuilder.getInstance().buildStatistik(elapsedTime,failed,success, scheduled);
    }

    public static cloneRelease(): void {
        DeployLoggerBuilder.getInstance().buildCloneRelease();
    }

    public static writeArtifacts(): void {
        const file = DeployLoggerBuilder.getInstance().build();
        if (!fs.existsSync(PATH.DEFAULT)) {
            fs.mkdirSync(PATH.DEFAULT);
        }
            fs.writeFileSync(PATH.DEPLOY, JSON.stringify(file, null, 4), 'utf-8');
            DeployJobMarkdown.run(file);
    }


}

class DeployLoggerBuilder {
    private file: DeployHookSchema;
    private static instance: DeployLoggerBuilder;

    private constructor() {
        this.file = {
            payload: {
                processName: PROCESSNAME.DEPLOY,
                scheduled: 0,
                success: 0,
                failed: 0,
                elapsedTime: 0,
                status: 'inprogress',
                message: '',
                releaseConfig: [],
                instanceUrl: '',
                events: {},
            },
            eventType: EVENTTYPE.DEPLOY,
            jobId: '',
            devHubAlias: '',
            branch: '',
        };
    }

    public static getInstance(): DeployLoggerBuilder {
        if (!DeployLoggerBuilder.instance) {
            DeployLoggerBuilder.instance = new DeployLoggerBuilder();
        }

        return DeployLoggerBuilder.instance;
    }

    buildProps(props: DeployProps): DeployLoggerBuilder {
        this.file.payload.deployProps = props;
        return this;
    }

    buildCommandError(message: string): DeployLoggerBuilder {
        this.file.payload.status = 'failed';
        this.file.payload.message = message;
        return this;
    }

    buildJobId(jobId: string): DeployLoggerBuilder {
        this.file.jobId = jobId;
        return this;
    }

    buildStatistik(elapsedTime: number, failed: number, success: number, scheduled: number): DeployLoggerBuilder {
        this.file.payload.elapsedTime = elapsedTime;
        this.file.payload.status = this.file.payload.status === 'inprogress' ? 'success' : 'failed';
        this.file.payload.failed = failed;
        this.file.payload.success = success;
        this.file.payload.scheduled = scheduled;
        return this;
    }

    buildCloneRelease(): DeployLoggerBuilder {
        const releaseFile = ReleaseStreamService.getFile();
        this.file.payload.message = releaseFile.payload.message;
        this.file.payload.releaseConfig = releaseFile.payload.releaseConfig;
        this.file.payload.instanceUrl = releaseFile.payload.instanceUrl;
        this.file.payload.events = releaseFile.payload.events;
        return this;
    }

    build(): DeployHookSchema {
        return this.file;
    }
}
