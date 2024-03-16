import SfpPackage from '../SfpPackage';
import PropertyFetcher from './PropertyFetcher';

export default class ReconcilePropertyFetcher implements PropertyFetcher {
    getsfpProperties(sfpPackage: SfpPackage, packageLogger?: any) {
        if (sfpPackage.packageDescriptor.hasOwnProperty('reconcileProfiles')) {
            sfpPackage.reconcileProfiles = sfpPackage.packageDescriptor.reconcileProfiles;
        }
    }
}
