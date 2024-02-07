import {NamedPackageDir, PackageDirDependency} from '@salesforce/core'

export interface NamedPackageDirLarge extends NamedPackageDir {
  ignoreOnStage?: string[]
  postDeploymentScript?: string
  preDeploymentScript?: string
  type?: string
}

export type PackageCharacter = {
  hasManagedPckDeps: boolean
  reason: string
  versionNumber: string
  type: string
  packageDeps: PackageDirDependency[]
  path: string
  hasError: boolean
  errorMessage: string
  targetTree: NamedPackageDirLarge
}

export type Package2Version = {
  Id: string
  SubscriberPackageVersionId: string
}

export type Flow = {
  Id: string
  VersionNumber: number
  Status: string
  MasterLabel: string
}

export type DeployError = {
  Name: string
  Type: string
  Status: string
  Message: string
}

export type CodeCoverageWarnings = {
  id: string
  message: string
  name?: string
  namespace: object
}

export type ApexTestclassCheck = {
  Id: string
  isTest: boolean
}

export type ApexClass = {
  Id: string
  Name: string
  Body: string
}

export type ApexTestQueueResult = {
  QueuedList: string[]
  CompletedList: string[]
  FailedList: string[]
  ProcessingList: string[]
  OtherList: string[]
}

export type ApexTestQueueItem = {
  Id: string
  ApexClass: ApexClass
  ApexClassId: string
  Status: string
  ExtendedStatus: string
  ParentJobId: string
  TestRunResultId: string
}

export type ApexTestResult = {
  ApexClass: ApexClass
  Outcome: string
  MethodName: string
  Message: string
}

export type ApexClassOrTrigger = {
  Name: string
}

export type ApexCodeCoverageAggregate = {
  ApexClassOrTrigger: ApexClassOrTrigger
  NumLinesCovered: number
  NumLinesUncovered: number
}

export type AggregateResult = {
  expr0: number
  MasterLabel: string
}
