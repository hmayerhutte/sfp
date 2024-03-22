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

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_delete_sandbox');

export type SandboxProcess = {
    SandboxInfoId: string;
    SandboxName: string;
    Status: string;
    Description: string;
    LicenseType: string;
};

enum PATH {
    DEFAULT = '.sfops',
    BUILD = '.sfops/sandbox_auth.json',
}

export default class OrgDeleteSandbox extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:delete:sandbox -v my-sandbox-org'];
    public static readonly flags = {
        name: Flags.string({
            char: 'n',
            summary: messages.getMessage('flags.name.summary'),
            required: true,
        }),
        loglevel,
        targetdevhubusername,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org delete sandbox'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);

        try {
            const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetdevhubusername });
            const prodConnection = prodOrg.getConnection();

            const namesList = this.flags.name.split(',').map((i) => i.trim());
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
            SFPLogger.log(COLOR_TRACE(`👆 Exclude sandboxes with status 'Deleted,Deleting'`));

            let sandboxProcessQuery =
                'Select SandboxInfoId,SandboxName,Status, Description, LicenseType from SandboxProcess';
            sandboxProcessQuery += ` where SandboxName in ('${namesList.join(`','`)}')`;
            sandboxProcessQuery += ` and Status not in ('E','D')`;
            sandboxProcessQuery += ` and SandboxInfoId != null`;

            SFPLogger.log(COLOR_TRACE(sandboxProcessQuery), LoggerLevel.TRACE);

            let sandboxOrgResponse = await prodConnection.tooling.query<SandboxProcess>(sandboxProcessQuery);
            let sandboxList = sandboxOrgResponse.records ? sandboxOrgResponse.records : [];

            if (sandboxList.length === 0) {
                throw messages.createError(`error.SandboxProcessResultLength`, [
                    this.flags.name,
                    this.flags.targetdevhubusername,
                ]);
            }

            SFPLogger.log(COLOR_KEY_MESSAGE(`\nStart deleting for this records... 👇`));
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
                head: ['SandboxInfoId', 'SandboxName', 'Status', 'Description', 'LicenseType'],
                colWidths: [20, 20, 20, 30, 20],
                wordWrap: true,
            });

            const sandboxInfoSet = new Set<string>();

            for (const sandbox of sandboxList) {
                sandboxInfoSet.add(sandbox.SandboxInfoId);
                sandboxInfos.push([
                    sandbox.SandboxInfoId,
                    sandbox.SandboxName,
                    sandbox.Status,
                    sandbox.Description,
                    sandbox.LicenseType,
                ]);
            }

            SFPLogger.log(sandboxInfos.toString(), LoggerLevel.INFO);

            let totalSandboxCount = sandboxInfoSet.size;
            let succesfullyDeletedSandboxCount = 0;
            let failedDeletedSandboxCount = 0;

            for (const sandboxInfoId of sandboxInfoSet) {
                try {
                    const result = await prodConnection.tooling.sobject('SandboxInfo').delete(sandboxInfoId);
                    if (result.success) {
                        SFPLogger.log(COLOR_SUCCESS(`\nSandbox deletion is succesfully requested!`), LoggerLevel.INFO);
                        succesfullyDeletedSandboxCount++;
                    } else {
                        SFPLogger.log(
                            COLOR_ERROR(`Sandbox deletion is failed! due to ${result[0].errors}`),
                            LoggerLevel.INFO
                        );
                        failedDeletedSandboxCount++;
                    }
                } catch (error) {
                    SFPLogger.log(COLOR_ERROR(`Sandbox deletion is failed! due to ${error}`), LoggerLevel.INFO);
                    failedDeletedSandboxCount++;
                }
            }
            if (totalSandboxCount === succesfullyDeletedSandboxCount) {
                SFPLogger.log(COLOR_SUCCESS(`All sandboxes are successfully deleted!`), LoggerLevel.INFO);
                return { "requested": totalSandboxCount, "deleted": succesfullyDeletedSandboxCount };
            } else {
                SFPLogger.log(
                    COLOR_ERROR(`Failed to delete ${failedDeletedSandboxCount} sandboxes!`),
                    LoggerLevel.INFO
                );
               throw new Error(`Unable to delete some of the sandboxes, please check the logs for more details`);
            }
        } catch (error) {
            SFPLogger.log(COLOR_ERROR(`\nSandbox deletion is failed! due to ${error}`), LoggerLevel.INFO);
            throw error;
        }
    }
}
