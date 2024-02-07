import SfpCommand from '../../SfpCommand';
import {Flags} from '@oclif/core'
import {SfProject, SfProjectJson} from '@salesforce/core'
import {NamedPackageDirLarge, PackageCharacter} from '../../core/package/types/types'
import {Dictionary, Nullable} from '@salesforce/ts-types'
import ValidateDiff from '../../core/package/validateBranch/validate'
import Table from 'cli-table3'
import { Messages } from '@salesforce/core';

import SFPLogger, {COLOR_HEADER, COLOR_KEY_MESSAGE, COLOR_TRACE, COLOR_TIME, COLOR_WARNING } from '@flxblio/sfp-logger'
import PackageInstall from '../../core/package/validateBranch/package-install'

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@flxblio/sfp', 'branch');

export default class PackageValidate extends SfpCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = ['sfp validate:branch --devHubAlias <DevHubAlias> --orgAlias <OrgAlias> --runScripts --package <package>']

  public static flags = {
    devHubAlias: Flags.string({char: 'v', description: 'DevHubAlias', required: true}),
    orgAlias: Flags.string({char: 'o', description: 'DevHubAlias', required: true}),
    runScripts: Flags.boolean({char: 'r', description: 'Run pre and post deployment scripts'}),
    package: Flags.string({
      char: 'p',
      description: 'Single package to validate',
    }),
  }

  async execute(): Promise<void> {
    SFPLogger.log(COLOR_KEY_MESSAGE('Validating package(s)...'))

    const {flags} = await this.parse(PackageValidate)

    const project = await SfProject.resolve()
    const projectJson: SfProjectJson = await project.retrieveSfProjectJson()
    const packageTrees: NamedPackageDirLarge[] = project.getPackageDirectories()
    const packageAliases: Nullable<Dictionary<string>> = project.getPackageAliases()
    const packageMap = new Map<string, PackageCharacter>()

    const packageInfoTable = new Table({
      head: [
        COLOR_HEADER('Package Name'),
        COLOR_HEADER('Reason'),
        COLOR_HEADER('Has Managed Pck Deps'),
        COLOR_HEADER('Type'),
      ],
      colWidths: [30, 30, 15, 15],
      wordWrap: true,
    })
    // first loop for changes detection
    const promises: Promise<void>[] = []
    for (const pck of packageTrees) {
      if (pck.ignoreOnStage && Array.isArray(pck.ignoreOnStage) && pck.ignoreOnStage.includes('validate')) {
        SFPLogger.log(COLOR_TRACE(`👆 Package ${pck.package} is ignored on validate stage. Skipping...`))
        continue
      }

      const promise = this.checkPackageChanges(pck, packageAliases, packageMap, projectJson, flags.package)

      promises.push(promise)
    }

    SFPLogger.log(COLOR_TRACE(`🧐 Checking for changes in ${packageTrees.length} packages...`))

    await Promise.allSettled(promises)
    if (packageMap.size === 0) {
      SFPLogger.log(COLOR_TIME(`✔ Found no packages with changes. Process finished without validation`))
      return
    }

    for (const [key, value] of packageMap) {
      packageInfoTable.push([key, value.reason, value.hasManagedPckDeps ? '✅' : '❌', value.type])
    }

    const packageMessage = flags.package ? `👉 Validate selected package:` : `👉 Following packages with changes:`
    SFPLogger.log(COLOR_HEADER(packageMessage))
    SFPLogger.log(packageInfoTable.toString())

    // now install all packages
    await PackageInstall.getInstance().run(packageMap, flags.devHubAlias, flags.orgAlias, flags.runScripts)
  }

  async checkPackageChanges(
    pck: NamedPackageDirLarge,
    packageAliases: Nullable<Dictionary<string>>,
    packageMap: Map<string, PackageCharacter>,
    projectJson: SfProjectJson,
    singlePck?: string,
  ): Promise<void> {
    const packageCharacter: PackageCharacter = {
      hasManagedPckDeps: false,
      reason: '',
      type: '',
      versionNumber: '',
      packageDeps: [],
      path: pck.path,
      hasError: false,
      errorMessage: '',
      targetTree: {} as NamedPackageDirLarge,
    }
    if (pck.ignoreOnStage && Array.isArray(pck.ignoreOnStage) && pck.ignoreOnStage.includes('validate')) {
      return
    }

    // check bit2win dependencies
    if (pck.dependencies && Array.isArray(pck.dependencies)) {
      for (const packageTreeDeps of pck.dependencies!) {
        if (packageAliases![packageTreeDeps.package] && packageAliases![packageTreeDeps.package]?.startsWith('04')) {
          packageCharacter.hasManagedPckDeps = true
        } else {
          packageCharacter.packageDeps.push(packageTreeDeps)
        }
      }
    }

    // check pck type
    if (pck.type ?? pck.type === 'data') {
      packageCharacter.type = 'data'
    } else if (packageAliases![pck.package!]) {
      packageCharacter.type = 'unlocked'
    } else {
      packageCharacter.type = 'source'
    }

    // set version number
    packageCharacter.versionNumber = pck?.versionNumber ?? ''

    if (singlePck) {
      if (pck.package === singlePck) {
        if (packageCharacter.type !== 'unlocked') {
            SFPLogger.log(COLOR_WARNING(`👆 No validation for this source packages! Please choose another package`))
          return
        }

        packageCharacter.reason = 'Single package validation'
        packageMap.set(pck.package!, packageCharacter)
      }

      return
    }

    const hasGitDiff = await ValidateDiff.getInstance().getGitDiff(pck, projectJson)
    if (hasGitDiff) {
      packageCharacter.reason = 'Found change(s) in package'
      packageMap.set(pck.package!, packageCharacter)
    }

    const targetTree = await ValidateDiff.getInstance().getPackageTreeChanges(pck, projectJson)
    if (targetTree && hasGitDiff) {
      packageCharacter.targetTree = targetTree
      packageMap.set(pck.package!, packageCharacter)
    }
  }
}
