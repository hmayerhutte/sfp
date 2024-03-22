/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../../SfpCommand';
import SFPLogger, {
    LoggerLevel,
    COLOR_KEY_MESSAGE,
    COLOR_HEADER,
    COLOR_SUCCESS,
    COLOR_TRACE,
    COLOR_ERROR,
} from '@flxbl-io/sfp-logger';
import { loglevel, targetdevhubusername } from '../../../flags/sfdxflags';
import Table from 'cli-table3';
import Ajv from 'ajv';
import path from 'path';
import * as fs from 'fs-extra';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_update_sandbox');

export type SandboxProcess = {
    SandboxInfoId: string;
    SandboxName: string;
    Status: string;
    Description: string;
    LicenseType: string;
};

type SandboxDefinition = {
    apexClassId?: string;
    autoActivate?: boolean;
    copyArchivedActivities?: boolean;
    copyChatter?: boolean;
    description?: string;
    historyDays?: number;
    licenseType?: string;
    sandboxName: string;
    sourceSandboxName?: string;
    templateId?: string;
};

type SandboxInfo = {
    Id: string;
    ApexClassId?: string;
    AutoActivate?: boolean;
    CopyChatter?: boolean;
    Description?: string;
    HistoryDays?: number;
    LicenseType?: string;
    SandboxName: string;
    SourceId?: string;
    TemplateId?: string;
};

export default class OrgUpdateSandbox extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:update:sandbox -o MyDevHub -n my-sandbox'];
    public static readonly flags = {
        name: Flags.string({
            char: 'n',
            summary: messages.getMessage('flags.name.summary'),
            exclusive: ['definition-file'],
        }),
        'definition-file': Flags.string({
            char: 'f',
            summary: messages.getMessage('flags.file.summary'),
            default: 'config/sandbox-def.json',
            exclusive: ['name'],
        }),
        loglevel,
        targetdevhubusername,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org update sandbox'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);

        try {
            const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetdevhubusername });
            const prodConnection = prodOrg.getConnection();
            let sandboxDefinitionFile: SandboxDefinition;
            let namesList: string[] = [];
            if (this.flags.name) {
                SFPLogger.log(COLOR_TRACE(`Update sandbox using name 👉 ${this.flags.name}`));
                namesList = this.flags.name.split(',').map((i) => i.trim());
            } else {
                SFPLogger.log(COLOR_TRACE(`Update sandbox using definition file 👉 ${this.flags['definition-file']}`));
                sandboxDefinitionFile = fs.readJSONSync(this.flags['definition-file']);
                this.validateSandboxDefinition(sandboxDefinitionFile);
                namesList = sandboxDefinitionFile?.sandboxName.split(',').map((i) => i.trim());
            }

            SFPLogger.log(COLOR_KEY_MESSAGE(`Found sandbox names for the given input 👇`));

            let sandboxInputTable = new Table({
                chars: {
                    top: '',
                    'top-mid': '',
                    'top-left': '',
                    'top-right': '',
                    bottom: '',
                    'bottom-mid': '',
                    'bottom-left': '',
                    'bottom-right': '',
                    left: '',
                    'left-mid': '',
                    mid: '',
                    'mid-mid': '',
                    right: '',
                    'right-mid': '',
                    middle: ' ',
                },
                head: ['Sandbox Name(s)'],
                colWidths: [30],
                wordWrap: true,
            });

            for (const name of namesList) {
                sandboxInputTable.push([name]);
            }

            SFPLogger.log(sandboxInputTable.toString(), LoggerLevel.INFO);

            SFPLogger.log(
                COLOR_TRACE(`\nFetch sandbox infos from org 👉 ${prodConnection.getAuthInfoFields().instanceUrl}`)
            );

            let sandboxProcessQuery =
                'Select Id,ApexClassId,AutoActivate, CopyChatter, HistoryDays, LicenseType,SandboxName,SourceId, TemplateId from SandboxInfo';
            sandboxProcessQuery += ` where SandboxName in ('${namesList.join(`','`)}')`;

            SFPLogger.log(COLOR_TRACE(sandboxProcessQuery), LoggerLevel.TRACE);

            let sandboxOrgResponse = await prodConnection.tooling.query<SandboxInfo>(sandboxProcessQuery);
            let sandboxList = sandboxOrgResponse.records ? sandboxOrgResponse.records : [];

            if (sandboxList.length === 0) {
                throw messages.createError(`error.SandboxProcessResultLength`, [
                    namesList,
                    this.flags.targetdevhubusername,
                ]);
            }

            let sandboxInfo = sandboxList[0];

            SFPLogger.log(COLOR_KEY_MESSAGE(`\nStart refresh for this records... 👇`));
            let sandboxInfos = new Table({
                chars: {
                    top: '',
                    'top-mid': '',
                    'top-left': '',
                    'top-right': '',
                    bottom: '',
                    'bottom-mid': '',
                    'bottom-left': '',
                    'bottom-right': '',
                    left: '',
                    'left-mid': '',
                    mid: '',
                    'mid-mid': '',
                    right: '',
                    'right-mid': '',
                    middle: ' ',
                },
                head: ['SandboxInfoId', 'SandboxName', 'License Type', 'Description', 'HistoryDays'],
                colWidths: [20, 20, 20, 30, 20],
                wordWrap: true,
            });

            for (const sandbox of sandboxList) {
                sandbox.ApexClassId = sandboxDefinitionFile?.apexClassId ?? sandbox.ApexClassId;
                sandbox.AutoActivate = sandboxDefinitionFile?.autoActivate ?? sandbox.AutoActivate;
                sandbox.CopyChatter = sandboxDefinitionFile?.copyChatter ?? sandbox.CopyChatter;
                sandbox.Description = sandboxDefinitionFile?.description ?? sandbox.Description;
                sandbox.HistoryDays = sandboxDefinitionFile?.historyDays ?? sandbox.HistoryDays;
                sandbox.LicenseType = sandboxDefinitionFile?.licenseType ?? sandbox.LicenseType;
                sandbox.TemplateId = sandboxDefinitionFile?.templateId ?? sandbox.TemplateId;
                sandbox.SourceId = sandboxDefinitionFile?.sourceSandboxName ?? sandbox.SourceId;

                sandboxInfos.push([
                    sandbox.Id,
                    sandbox.SandboxName,
                    sandbox.LicenseType,
                    sandbox.Description,
                    sandbox.HistoryDays,
                ]);
            }
            SFPLogger.log(sandboxInfos.toString(), LoggerLevel.INFO);

            let totalSandboxCount = sandboxList.length;
            let succesfullyDeletedSandboxCount = 0;
            let failedUpdatedSandboxCount = 0;

            for (const sandboxInfo of sandboxList) {
                try {
                    const result = await prodConnection.tooling.sobject('SandboxInfo').update(sandboxInfo);
                    if (result.success) {
                        SFPLogger.log(COLOR_SUCCESS(`\nSandbox refresh is succesfully requested!`), LoggerLevel.INFO);
                        succesfullyDeletedSandboxCount++;
                    } else {
                        SFPLogger.log(
                            COLOR_ERROR(`Sandbox refresh is failed! due to ${result[0].errors}`),
                            LoggerLevel.INFO
                        );
                        failedUpdatedSandboxCount++;
                    }
                } catch (error) {
                    SFPLogger.log(COLOR_ERROR(`Sandbox refresh is failed! due to ${error}`), LoggerLevel.INFO);
                    failedUpdatedSandboxCount++;
                }
            }
            if (totalSandboxCount === succesfullyDeletedSandboxCount) {
                SFPLogger.log(COLOR_SUCCESS(`All sandboxes are successfully refreshed!`), LoggerLevel.INFO);
                return { requested: totalSandboxCount, updated: succesfullyDeletedSandboxCount };
            } else {
                SFPLogger.log(
                    COLOR_ERROR(`Failed to refresh ${failedUpdatedSandboxCount} sandboxes!`),
                    LoggerLevel.INFO
                );
                throw new Error(`Unable to refresh some of the sandboxes, please check the logs for more details`);
            }
        } catch (error) {
            SFPLogger.log(COLOR_ERROR(`\nSandbox refresh is failed! due to ${error}`), LoggerLevel.INFO);
            throw messages.createError('error.Default', [error.message]);
        }
    }

    private validateSandboxDefinition(sandboxDef: SandboxDefinition): void {
        let schema = fs.readJSONSync(
            path.join(__dirname, '..', '..', '..', '..', 'resources', 'schemas', 'sandbox-definition.schema.json'),
            { encoding: 'UTF-8' }
        );

        let validator = new Ajv({ allErrors: true }).compile(schema);
        let validationResult = validator(sandboxDef);

        if (!validationResult) {
            let errorMsg: string =
                `Sandbox definition provided does not meet schema requirements, ` +
                `found ${validator.errors.length} validation errors:\n`;

            validator.errors.forEach((error, errorNum) => {
                errorMsg += `\n${errorNum + 1}: ${error.instancePath}: ${error.message} ${JSON.stringify(
                    error.params,
                    null,
                    4
                )}`;
            });

            throw new Error(errorMsg);
        }
    }
}
