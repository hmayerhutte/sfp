import { Org } from "@salesforce/core";
import { DeployProps } from '../../impl/deploy/DeployImpl';
import { ValidateProps } from "../../impl/validate/ValidateImpl"
import { BuildProps } from "../../impl/parallelBuilder/BuildImpl";
import { ReleaseProps } from "../../impl/release/ReleaseImpl";
import Release from "../../commands/release";
// default types for file logger

export enum PROCESSNAME {
    PREPARE = "prepare",
    BUILD = "build",
    VALIDATE = "validate",
    RELEASE = "release",
    DEPLOY = "deploy",
}

export enum PATH {
    DEFAULT = ".sfpowerscripts/eventStream",
    PREPARE = ".sfpowerscripts/eventStream/prepare.json",
    BUILD = ".sfpowerscripts/eventStream/build.json",
    VALIDATE = ".sfpowerscripts/eventStream/validate.json",
    RELEASE = ".sfpowerscripts/eventStream/release.json",
    DEPLOY = ".sfpowerscripts/eventStream/deploy.json",
    VALIDATE_MD = ".sfpowerscripts/eventStream/validate.md",
    BUILD_MD = ".sfpowerscripts/eventStream/build.md",
    RELEASE_MD = ".sfpowerscripts/eventStream/release.md",
    DEPLOY_MD = ".sfpowerscripts/eventStream/deploy.md"
}

export enum EVENTTYPE {
    BUILD = "sfp.build",
    RELEASE = "sfp.release",
    VALIDATE = "sfp.validate",
    PREPARE = "sfp.prepare",
    DEPLOY = "sfp.deploy"
}

export enum EVENTSTATUS {
    BUILD_AWAITING = "sfp.build.awaiting",
    BUILD_PROGRESS = "sfp.build.progress",
    BUILD_SUCCESS = "sfp.build.success",
    BUILD_FAILED = "sfp.build.failed",
    DEPLOY_AWAITING = "sfp.deploy.awaiting",
    DEPLOY_PROGRESS = "sfp.deploy.progress",
    DEPLOY_SUCCESS = "sfp.deploy.success",
    DEPLOY_FAILED = "sfp.deploy.failed",
}


export interface Context {
    stage: string;
    eventId: string;
    jobId: string;
    instanceUrl: string;
    timestamp: Date;
    commitId: string;
    branch: string;
    devHubAlias: string;
    eventType: string;
 }

// types for file logger prepare
export interface PrepareHookSchema {
    eventType: string;
    eventId: string;
    payload: PrepareFile;
}
export interface PrepareFile {
    processName: string;
    success: number;
    failed: number;
    status: 'success' | 'failed' | 'inprogress';
    message: string;
    errorCode: string;
    poolDefinition: PoolDefinition;
    poolInfo: Poolinfo;
    externalDependencies: ExternalDependency[];
    releaseConfig?: string[];
}

export interface Poolinfo {
    activeOrgs: number;
    maxOrgs: number;
    prepareDuration: number;
    events: OrgDetails[];
}

export interface OrgDetails {
    event: 'sfpowerscripts.prepare.success' | 'sfpowerscripts.prepare.failed';
    context: Context;
    metadata: OrgInfo;
    orgId: string;
}

export interface OrgInfo {
    alias: string;
    orgId: string;
    username: string;
    loginURL: string;
    elapsedTime: number;
    password: string;
    status?: 'success' | 'failed';
    message?: string;
}

export interface ExternalDependency {
    order: number;
    pck: string;
    version?: string;
    subscriberVersionId: string;
}

export interface PoolDefinition {
    tag: string;
    waitTime?: number;
    expiry?: number;
    maxAllocation: number;
    batchSize?: number;
    configFilePath?: string;
    releaseConfigFile?: string;
    succeedOnDeploymentErrors?: boolean;
    installAll?: boolean;
    enableVlocity?: boolean;
    enableSourceTracking?: boolean;
    relaxAllIPRanges?: boolean;
    ipRangesToBeRelaxed?: string[];
    retryOnFailure?: boolean;
    maxRetryCount?: number;
    snapshotPool?: string;
    postDeploymentScriptPath?: string;
    preDependencyInstallationScriptPath?: string;
    disableSourcePackageOverride?: boolean;
 }

// types for file logger build

export interface BuildHookSchema {
    eventType: string;
    jobId: string;
    devhubAlias: string;
    commitId: string;
    payload: BuildFile;
}

export interface BuildFile {
    processName: string;
    scheduled: number;
    success: number;
    failed: number;
    elapsedTime: number;
    status: 'success' | 'failed' | 'inprogress';
    message: string;
    buildProps?: BuildProps;
    releaseConfig: string[];
    awaitingDependencies: string[];
    currentlyProcessed: string[];
    successfullyProcessed: string[];
    failedToProcess: string[];
    instanceUrl: string;
    events: BuildPackage;
}

export interface BuildPackage {
    [key: string]: BuildPackageDetails
}

export interface BuildPackageDetails {
    event: EVENTSTATUS;
    context: Context;
    metadata: BuildPackageMetadata;
}

export interface BuildPackageDependencies {
    order: number;
    pck: string;
    version: string;
}


export interface BuildPackageMetadata {
    package: string;
    message: string;
    elapsedTime: number;
    reasonToBuild: string;
    lastKnownTag: string;
    type: string;
    versionNumber: string;
    versionId: string;
    testCoverage: number;
    coverageCheckPassed: boolean;
    metadataCount: number;
    apexInPackage: boolean;
    profilesInPackage: boolean;
    sourceVersion?: string;
    packageDependencies: BuildPackageDependencies[];
}


export interface ValidateHookSchema {
    eventType: string;
    jobId: string;
    devHubAlias: string;
    branch: string;
    payload: ValidateFile;
}

export interface ValidateFile {
    processName: string;
    scheduled: number;
    success: number;
    failed: number;
    elapsedTime: number;
    status: 'success' | 'failed' | 'inprogress';
    message: string;
    validateProps?: ValidateProps;
    releaseConfig?: string[];
    instanceUrl: string;
    buildEvents: BuildPackage;
    deployEvents: ReleasePackage;
}

export interface ValidatePackage {
    [key: string]: ValidatePackageDetails
}

export interface ValidatePackageDetails {
    event: EVENTSTATUS;
    context: Context;
    metadata: ValidatePackageMetadata;
    orgId: string;
}

export interface ValidatePackageMetadata {
    package: string;
    message: string[];
    elapsedTime: number;
    reasonToBuild: string;
    type: string;
    targetVersion: string;
    orgVersion: string;
    versionId: string;
    packageCoverage: number;
    coverageCheckPassed: boolean;
    metadataCount: number;
    apexInPackage: boolean;
    profilesInPackage: boolean;
    permissionSetGroupInPackage: boolean;
    isPayLoadContainTypesSupportedByProfiles: boolean;
    isPickListsFound: boolean;
    isDependencyValidated: boolean;
    creationDetails: {[key: string]: number};
    sourceVersion?: string;
    deployErrors: ValidateDeployError[];
    testResults: ValidateTestResult[];
    testCoverages: ValidateTestCoverage[];
    testSummary: ValidateTestSummary;
}

export interface ValidateTestResult {
    name: string;
    outcome: string;
    message: string;
    runtime: number;
}

export interface ValidateTestCoverage {
    class: string;
    coverage: number;
}

export interface ValidateTestSummary {
    [key: string]: string | number;
}

export interface ValidateDeployError {
    package?: string;
    metadataType: string;
    apiName: string;
    problemType: string;
    problem: string;
}

export enum ValidateAgainst {
	PROVIDED_ORG = "PROVIDED_ORG",
	PRECREATED_POOL = "PRECREATED_POOL",
}
export enum ValidationMode {
	INDIVIDUAL = "individual",
	FAST_FEEDBACK = "fastfeedback",
	THOROUGH = "thorough",
	FASTFEEDBACK_LIMITED_BY_RELEASE_CONFIG = "ff-release-config",
	THOROUGH_LIMITED_BY_RELEASE_CONFIG = "thorough-release-config",
}


export interface ReleaseHookSchema {
    eventType: string;
    jobId: string;
    devHubAlias: string;
    branch: string;
    payload: ReleaseFile;
}

export interface DeployHookSchema {
    eventType: string;
    jobId: string;
    devHubAlias: string;
    branch: string;
    payload: DeployFile;
}

export interface ReleaseFile {
    processName: string;
    scheduled: number;
    success: number;
    failed: number;
    elapsedTime: number;
    status: 'success' | 'failed' | 'inprogress';
    message: string;
    releaseProps?: ReleaseProps;
    releaseConfig?: string[];
    instanceUrl: string;
    events: ReleasePackage;
}

export interface DeployFile {
    processName: string;
    scheduled: number;
    success: number;
    failed: number;
    elapsedTime: number;
    status: 'success' | 'failed' | 'inprogress';
    message: string;
    deployProps?: DeployProps;
    releaseConfig?: string[];
    instanceUrl: string;
    events: ReleasePackage;
}

export interface ReleasePackage {
    [key: string]: ReleasePackageDetails
}

export interface ReleasePackageDetails {
    event: EVENTSTATUS;
    context: Context;
    metadata: ReleasePackageMetadata;
    orgId: string;
}

export interface ReleasePackageMetadata {
    package: string;
    message: string;
    elapsedTime: number;
    reasonToBuild: string;
    type: string;
    targetVersion: string;
    orgVersion: string;
    versionId: string;
    packageCoverage: number;
    coverageCheckPassed: boolean;
    metadataCount: number;
    apexInPackage: boolean;
    profilesInPackage: boolean;
    permissionSetGroupInPackage: boolean;
    isPayLoadContainTypesSupportedByProfiles: boolean;
    isPickListsFound: boolean;
    isDependencyValidated: boolean;
    creationDetails: {[key: string]: number};
    sourceVersion?: string;
    deployErrors: ValidateDeployError[];
    testResults: ValidateTestResult[];
    testCoverages: ValidateTestCoverage[];
    testSummary: ValidateTestSummary;
}

export interface ReleaseTestResult {
    name: string;
    outcome: string;
    message: string;
    runtime: number;
}

export interface ReleaseTestCoverage {
    class: string;
    coverage: number;
}

export interface ReleaseTestSummary {
    [key: string]: string | number;
}

export interface ReleaseDeployError {
    package?: string;
    metadataType: string;
    apiName: string;
    problemType: string;
    problem: string;
}

export interface SfPowerscriptsEvent__c {
    Name: string;
    Stage__c: string;
    EventId__c: string;
    JobId__c: string;
    Branch__c: string;
    Commit__c: string;
    InstanceUrl__c: string;
    JobTimestamp__c: Date;
    EventName__c: string;
    Package__c: string;
    ErrorMessage__c: string;
}

export default interface ReleaseDefinitionSchema {
    release: string;
    skipIfAlreadyInstalled: boolean;
    skipArtifactUpdate:boolean;
    baselineOrg?: string;
    artifacts: {
        [p: string]: string;
    };
    packageDependencies?: {
        [p: string]: string;
    };
    promotePackagesBeforeDeploymentToOrg?: string;
    changelog?: {
        repoUrl?: string;
        workItemFilter?:string;
        workItemFilters?: string[];
        workItemUrl?: string;
        limit?: number;
        showAllArtifacts?: boolean;
    };
}

