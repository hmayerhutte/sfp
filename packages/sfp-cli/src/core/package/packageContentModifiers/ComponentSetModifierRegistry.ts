import { ComponentSetModifier  } from './ComponentSetModifier';
import EntitlementVersionFilter from './EntitlementVersionFilter';




export class ComponentSetModifierRegistry {
    static getImplementations(): ComponentSetModifier[] {
        let deploymentFilterImpls: ComponentSetModifier[] = [];

        //TODO: Make dynamic
        let entitlementVersionFilter = new EntitlementVersionFilter();
        deploymentFilterImpls.push(entitlementVersionFilter);
    
        return deploymentFilterImpls;
    }
}
