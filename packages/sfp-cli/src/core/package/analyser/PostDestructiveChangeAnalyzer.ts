import path from 'path';
import fs from 'fs-extra';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import SfpPackage, { PackageType } from '../SfpPackage';
import { PackageAnalyzer } from './PackageAnalyzer';
import SFPLogger, { Logger, LoggerLevel } from '@flxbl-io/sfp-logger';
import PackageToComponent from '../components/PackageToComponent';

export default class PostDestructiveChangeAnalyzer implements PackageAnalyzer {
    public getName() {
        return 'PostDestructiveChangeAnalyzer';
    }

    public async analyze(sfpPackage: SfpPackage, componentSet: ComponentSet, logger: Logger): Promise<SfpPackage> {
        try {
            //read the preDestructive changes
            let postDestructiveComponentsPath = path.join(
                sfpPackage.workingDirectory,
                sfpPackage.projectDirectory,
                `post-destructive`
            );
            

            //read components in the pre-destructive folder
            if (fs.existsSync(postDestructiveComponentsPath)) {
                let components = new PackageToComponent(
                    sfpPackage.package_name,
                    postDestructiveComponentsPath
                ).generateComponents();
                if (components.length > 0) {
                    sfpPackage.postDestructiveChangesRequired = true;
                    sfpPackage.postDestructiveChanges = components;
                }
            }
        } catch (error) {
            //Ignore error for now
            SFPLogger.log(
                `Unable to process pre destructive changes due to ${error.message}`,
                LoggerLevel.TRACE,
                logger
            );
        }
        return sfpPackage;
    }

    public async isEnabled(sfpPackage: SfpPackage, logger: Logger): Promise<boolean> {
       if(sfpPackage.packageType == PackageType.Diff || sfpPackage.packageType == PackageType.Source)
         return true;
       else
         return false;
    }
}
