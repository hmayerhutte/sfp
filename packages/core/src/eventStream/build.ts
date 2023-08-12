import fs from 'fs';
import { PROCESSNAME, BuildProps, BuildHookSchema, BuildPackageDependencies } from './types';
import SfpPackage from '../package/SfpPackage';
import { EventService } from './event';
import { HookService } from './hooks';
import dotenv from 'dotenv';

dotenv.config();

export class BuildStreamService {
    public static buildPackageInitialitation(pck: string, reason: string, tag: string): void {
        BuildLoggerBuilder.getInstance().buildPackageInitialitation(pck, reason, tag);
    }

    public static sendPackageError(sfpPackage: SfpPackage, message: string): void {
        const file = BuildLoggerBuilder.getInstance().buildPackageError(sfpPackage, message).build();
        //EventService.getInstance().logEvent(file.payload.events[sfpPackage.package_name]);
        HookService.getInstance().logEvent(file.payload.events[sfpPackage.package_name]);
    }

    public static buildPackageErrorList(pck: string): void {
        BuildLoggerBuilder.getInstance().buildPackageErrorList(pck);
    }

    public static buildPackageSuccessList(pck: string): void {
        BuildLoggerBuilder.getInstance().buildPackageSuccessList(pck);
    }

    public static buildPackageAwaitingList(pck: string[]): void {
        BuildLoggerBuilder.getInstance().buildPackageAwaitingList(pck);
    }

    public static buildPackageCurrentlyProcessedList(pck: string[]): void {
        BuildLoggerBuilder.getInstance().buildPackageCurrentlyProcessedList(pck);
    }

    public static async sendPackageCompletedInfos(sfpPackage: SfpPackage): Promise<void> {
        const file = BuildLoggerBuilder.getInstance().buildPackageCompletedInfos(sfpPackage).build();
        //EventService.getInstance().logEvent(file.payload.events[sfpPackage.package_name]);
        await HookService.getInstance().logEvent(file.payload.events[sfpPackage.package_name]);
    }

    public static buildPackageDependencies(pck: string, dependencies: BuildPackageDependencies): void {
        BuildLoggerBuilder.getInstance().buildPackageDependencies(pck, dependencies);
    }

    public static buildProps(props: BuildProps): void {
        BuildLoggerBuilder.getInstance().buildProps(props);
    }

    public static buildStatus(status: 'success' | 'failed' | 'inprogress', message: string): void {
        BuildLoggerBuilder.getInstance().buildStatus(status, message);
    }

    public static sendStatistics(scheduled: number, success: number, failed: number, elapsedTime: number): void {
        const file = BuildLoggerBuilder.getInstance().buildStatistics(scheduled, success, failed, elapsedTime).build();
    }

    public static buildReleaseConfig(pcks: string[]): void {
        BuildLoggerBuilder.getInstance().buildReleaseConfig(pcks);
    }

    public static buildPackageStatus(pck: string, status: 'success' | 'inprogress', elapsedTime?: number): void {
        BuildLoggerBuilder.getInstance().buildPackageStatus(pck, status, elapsedTime);
    }

    public static buildJobAndOrgId(jobId: string,orgId: string, ): void {
        BuildLoggerBuilder.getInstance().buildOrgAndJobId(orgId, jobId);
    }

    public static startServer(): void {
        //EventService.getInstance();
    }

    public static closeServer(): void {
        //EventService.getInstance().closeServer();
    }
}

class BuildLoggerBuilder {
    private file: BuildHookSchema;
    private static instance: BuildLoggerBuilder;

    private constructor() {
        this.file = {
            payload: {
                processName: PROCESSNAME.BUILD,
                scheduled: 0,
                success: 0,
                failed: 0,
                elapsedTime: 0,
                status: 'inprogress',
                message: '',
                releaseConfig: [],
                awaitingDependencies: [],
                currentlyProcessed: [],
                successfullyProcessed: [],
                failedToProcess: [],
                instanceUrl: '',
                events: {},
            },
            eventType: 'sfpowerscripts.build',
            jobId: '',
        };
    }

    public static getInstance(): BuildLoggerBuilder {
        if (!BuildLoggerBuilder.instance) {
            BuildLoggerBuilder.instance = new BuildLoggerBuilder();
        }

        return BuildLoggerBuilder.instance;
    }

    buildOrgAndJobId(orgId: string, jobId: string): BuildLoggerBuilder {
        this.file.jobId = jobId;
        this.file.payload.instanceUrl = orgId;
        return this;
    }

    buildPackageInitialitation(pck: string, reason: string, tag: string): BuildLoggerBuilder {
        this.file.payload.events[pck] = {
            event: 'sfpowerscripts.build.awaiting',
            context: {
                command: 'sfpowerscript:orchestrator:build',
                eventId: `${this.file.jobId}_${Date.now().toString()}`,
                jobId: this.file.jobId,
                timestamp: new Date(),
                instanceUrl: this.file.payload.instanceUrl,
            },
            metadata: {
                package: pck,
                message: [],
                elapsedTime: 0,
                reasonToBuild: reason,
                lastKnownTag: tag,
                type: '',
                versionNumber: '',
                versionId: '',
                testCoverage: 0,
                coverageCheckPassed: false,
                metadataCount: 0,
                apexInPackage: false,
                profilesInPackage: false,
                sourceVersion: '',
                packageDependencies: [],
            },
        };
        return this;
    }

    buildPackageCompletedInfos(sfpPackage: SfpPackage): BuildLoggerBuilder {
        this.file.payload.events[sfpPackage.package_name].event = 'sfpowerscripts.build.success';
        this.file.payload.events[sfpPackage.package_name].metadata.type = sfpPackage.package_type;
        this.file.payload.events[sfpPackage.package_name].metadata.versionNumber = sfpPackage.package_version_number;
        this.file.payload.events[sfpPackage.package_name].metadata.versionId = sfpPackage.package_version_id;
        this.file.payload.events[sfpPackage.package_name].metadata.testCoverage = sfpPackage.test_coverage;
        this.file.payload.events[sfpPackage.package_name].metadata.coverageCheckPassed =
            sfpPackage.has_passed_coverage_check;
        this.file.payload.events[sfpPackage.package_name].metadata.metadataCount = sfpPackage.metadataCount;
        this.file.payload.events[sfpPackage.package_name].metadata.apexInPackage = sfpPackage.isApexFound;
        this.file.payload.events[sfpPackage.package_name].metadata.profilesInPackage = sfpPackage.isProfilesFound;
        this.file.payload.events[sfpPackage.package_name].metadata.sourceVersion = sfpPackage.sourceVersion;
        this.file.payload.events[sfpPackage.package_name].context.timestamp = new Date();
        return this;
    }

    buildPackageError(sfpPackage: SfpPackage, message: string): BuildLoggerBuilder {
        this.file.payload.events[sfpPackage.package_name].event = 'sfpowerscripts.build.failed';
        this.file.payload.events[sfpPackage.package_name].metadata.type = sfpPackage.package_type;
        this.file.payload.events[sfpPackage.package_name].context.timestamp = new Date();
        if (message) {
            this.file.payload.events[sfpPackage.package_name].metadata.message.push(message);
        }
        return this;
    }

    buildPackageErrorList(pcks: string): BuildLoggerBuilder {
        this.file.payload.failedToProcess.push(pcks);
        return this;
    }

    buildPackageSuccessList(pcks: string): BuildLoggerBuilder {
        this.file.payload.successfullyProcessed.push(pcks);
        return this;
    }

    buildPackageAwaitingList(pcks: string[]): BuildLoggerBuilder {
        this.file.payload.awaitingDependencies = pcks;
        return this;
    }

    buildPackageCurrentlyProcessedList(pcks: string[]): BuildLoggerBuilder {
        this.file.payload.currentlyProcessed = pcks;
        return this;
    }

    buildPackageDependencies(pck: string, dependencies: BuildPackageDependencies): BuildLoggerBuilder {
        this.file.payload.events[pck].metadata.packageDependencies.push(dependencies);
        return this;
    }

    buildProps(props: BuildProps): BuildLoggerBuilder {
        this.file.payload.buildProps = { ...props };
        return this;
    }

    buildStatus(status: 'inprogress' | 'success' | 'failed', message: string): BuildLoggerBuilder {
        this.file.payload.status = status;
        this.file.payload.message = message;
        return this;
    }

    buildStatistics(scheduled: number, success: number, failed: number, elapsedTime: number): BuildLoggerBuilder {
        this.file.payload.scheduled = success + failed;
        this.file.payload.success = success;
        this.file.payload.failed = failed;
        this.file.payload.elapsedTime = elapsedTime;
        this.file.payload.awaitingDependencies = [];
        // set status to success when scheduled = success
        if (this.file.payload.scheduled > 1 && this.file.payload.scheduled === this.file.payload.success) {
            this.file.payload.status = 'success';
        } else {
            this.file.payload.status = 'failed';
        }
        return this;
    }

    buildReleaseConfig(pcks: string[]): BuildLoggerBuilder {
        this.file.payload.releaseConfig = pcks;
        return this;
    }

    buildPackageStatus(pck: string, status: 'success' | 'inprogress', elapsedTime?: number): BuildLoggerBuilder {
        this.file.payload.events[pck].event =
            status === 'success' ? 'sfpowerscripts.build.success' : 'sfpowerscripts.build.progress';
        if (elapsedTime) {
            this.file.payload.events[pck].metadata.elapsedTime = elapsedTime;
        }
        return this;
    }

    build(): BuildHookSchema {
        return this.file;
    }
}