import { Logger } from '@flxbl-io/sfp-logger';
import SfpPackage from '../SfpPackage';
import PropertyFetcher from './PropertyFetcher';

export default class AssignPermissionSetFetcher implements PropertyFetcher {
    public getsfpProperties(sfpPackage: SfpPackage, packageLogger?: Logger) {
        if (sfpPackage.packageDescriptor.assignPermSetsPreDeployment) {
            if (sfpPackage.packageDescriptor.assignPermSetsPreDeployment instanceof Array) {
                sfpPackage.assignPermSetsPreDeployment =
                    sfpPackage.packageDescriptor.assignPermSetsPreDeployment;
            } else throw new Error("Property 'assignPermSetsPreDeployment' must be of type array");
        }

        if (sfpPackage.packageDescriptor.assignPermSetsPostDeployment) {
            if (sfpPackage.packageDescriptor.assignPermSetsPostDeployment instanceof Array) {
                sfpPackage.assignPermSetsPostDeployment =
                    sfpPackage.packageDescriptor.assignPermSetsPostDeployment;
            } else throw new Error("Property 'assignPermSetsPostDeployment' must be of type array");
        }

        return sfpPackage;
    }
}
