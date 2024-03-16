import { Logger } from '@flxbl-io/sfp-logger';
import SfpPackage from '../SfpPackage';

export default interface PropertyFetcher {
    /**
     * Retrieves property from packageDescriptor and adds its to SfpPackage by reference
     * @param sfpPackage
     * @param packageLogger
     */
    getsfpProperties(sfpPackage: SfpPackage, packageLogger?: Logger);
}
