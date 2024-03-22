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
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_create_sandbox');

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

export default class OrgCreateSandbox extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:create:sandbox -v MyDevHub -n MySandbox1'];
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
        SFPLogger.log(COLOR_HEADER('command: org create sandbox'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);

        try {
            const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetdevhubusername });
            const prodConnection = prodOrg.getConnection();
            let sandboxDefinitionFile: SandboxDefinition;
            let namesList: string[] = [];
            if (this.flags.name) {
                SFPLogger.log(COLOR_TRACE(`Create sandbox using name 👉 ${this.flags.name}`));
                namesList = this.flags.name.split(',').map((i) => i.trim());
            } else {
                SFPLogger.log(COLOR_TRACE(`Create sandbox using definition file 👉 ${this.flags['definition-file']}`));
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


            SFPLogger.log(COLOR_KEY_MESSAGE(`\nStart creation for this records... 👇`));
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
                head: ['SandboxName', 'License Type', 'Description', 'HistoryDays'],
                colWidths: [20, 20, 20, 30, 20],
                wordWrap: true,
            });

            const sandboxInfoList: SandboxInfo[] = [];

            for (const name of namesList) {
                let sandboxInfo:SandboxInfo = {
                SandboxName: name,
                ...(sandboxDefinitionFile?.apexClassId ? {ApexClassId: sandboxDefinitionFile.apexClassId} : {}),
                ...(sandboxDefinitionFile?.autoActivate ? {AutoActivate: sandboxDefinitionFile.autoActivate} : {}),
                ...(sandboxDefinitionFile?.copyChatter ? {CopyChatter: sandboxDefinitionFile.copyChatter} : {}),
                ...(sandboxDefinitionFile?.description ? {Description: sandboxDefinitionFile.description} : {}),
                ...(sandboxDefinitionFile?.historyDays ? {HistoryDays: sandboxDefinitionFile.historyDays} : {}),
                ...(sandboxDefinitionFile?.licenseType ? {LicenseType: sandboxDefinitionFile.licenseType} : {LicenseType: 'DEVELOPER'}), // default to developer
                ...(sandboxDefinitionFile?.templateId ? {TemplateId: sandboxDefinitionFile.templateId} : {}),
                ...(sandboxDefinitionFile?.sourceSandboxName ? {SourceId: sandboxDefinitionFile.sourceSandboxName} : {}),
                };

                sandboxInfos.push([
                    name,
                    sandboxDefinitionFile?.licenseType ?? 'DEVELOPER',
                    sandboxDefinitionFile?.description ?? '',
                    sandboxDefinitionFile?.historyDays ?? 0,
                ]);
                sandboxInfoList.push(sandboxInfo);
            }
            SFPLogger.log(sandboxInfos.toString(), LoggerLevel.INFO);

            let totalSandboxCount = sandboxInfoList.length;
            let succesfullyDeletedSandboxCount = 0;
            let failedUpdatedSandboxCount = 0;

            for (const sandboxInfo of sandboxInfoList) {
                try {
                    const result = await prodConnection.tooling.sobject('SandboxInfo').create(sandboxInfo);
                    if (result.success) {
                        SFPLogger.log(COLOR_SUCCESS(`\nSandbox creation is succesfully requested!`), LoggerLevel.INFO);
                        succesfullyDeletedSandboxCount++;
                    } else {
                        SFPLogger.log(
                            COLOR_ERROR(`Sandbox creation is failed! due to ${result[0].errors}`),
                            LoggerLevel.INFO
                        );
                        failedUpdatedSandboxCount++;
                    }
                } catch (error) {
                    SFPLogger.log(COLOR_ERROR(`Sandbox creation is failed! due to ${error}`), LoggerLevel.INFO);
                    failedUpdatedSandboxCount++;
                }
            }
            if (totalSandboxCount === succesfullyDeletedSandboxCount) {
                SFPLogger.log(COLOR_SUCCESS(`All sandboxes are successfully created!`), LoggerLevel.INFO);
                return { requested: totalSandboxCount, updated: succesfullyDeletedSandboxCount };
            } else {
                SFPLogger.log(
                    COLOR_ERROR(`Failed to create ${failedUpdatedSandboxCount} sandboxes!`),
                    LoggerLevel.INFO
                );
                throw new Error(`Unable to create some of the sandboxes, please check the logs for more details`);
            }
        } catch (error) {
            SFPLogger.log(COLOR_ERROR(`\nSandbox creation is failed! due to ${error}`), LoggerLevel.INFO);
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
