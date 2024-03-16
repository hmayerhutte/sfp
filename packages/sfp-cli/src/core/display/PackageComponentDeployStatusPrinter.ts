const Table = require('cli-table');
import { LazyCollection, SourceComponent } from '@salesforce/source-deploy-retrieve';
import SFPLogger, { COLOR_ERROR, COLOR_HEADER, COLOR_INFO, COLOR_KEY_MESSAGE, COLOR_SUCCESS, Logger, LoggerLevel } from '@flxbl-io/sfp-logger';
import { ZERO_BORDER_TABLE } from './TableConstants';
import { stat } from 'fs';

export default class PackageComponentDeployStatusPrinter {
    public static printComponentTable(components: any, status: string, logger: Logger) {
        if (components === null || components === undefined) return;

        if (!Array.isArray(components)) {
            components = [components];
        }
        if (components.length == 0) return;

        let table = new Table({
            head: ['Metadata Type', 'API Name/Message', 'Status'],
            chars: ZERO_BORDER_TABLE,
        });

        for (const component of components) {
            let item;
            if (component.componentType != '' && component.fullName != 'destructiveChanges.xml') {
                if (component.changed)
                    item = [component.componentType, component.fullName, component.deleted ? `${COLOR_SUCCESS(`deleted`)}` : `${COLOR_SUCCESS(`deployed`)}`];
                else
                    item = [
                        component.componentType,
                        component.fullName,
                        component.deleted ? `${COLOR_INFO(`already deleted`)}` : `${COLOR_INFO(`no changes`)}`,
                    ];

                table.push(item);
            }

            if (component.componentType != '' && component.fullName == 'destructiveChanges.xml') {
                if (component.problemType == 'Warning') {
                    item = [component.componentType, COLOR_KEY_MESSAGE(component.problem), COLOR_HEADER(`warning`)];
                    table.push(item);
                }
            }
        }

        if (status == 'succeeded' && table.length)
            SFPLogger.log('The following metadata has succeeded:', LoggerLevel.INFO, logger);
        else SFPLogger.log('The following metadata failed:', LoggerLevel.INFO, logger);

        SFPLogger.log(table.toString(), LoggerLevel.INFO, logger);
    }
}
