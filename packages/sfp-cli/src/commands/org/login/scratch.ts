/* Original Copyright belongs to
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import SFPLogger, { LoggerLevel, COLOR_KEY_MESSAGE, COLOR_HEADER, COLOR_ERROR } from '@flxbl-io/sfp-logger';
import { Messages, AuthInfo, SfError } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../../SfpCommand';
import { loglevel, targetdevhubusername } from '../../../flags/sfdxflags';
import Bottleneck from 'bottleneck';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_login_scratch');

type ScratchOrgInfo = {
    Id: string;
    SfdxAuthUrl__c: string;
    Status: string;
}

export default class OrgLoginScratch extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresDevhubUsername = true;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfp org:login:scratch --username myScratch'];

    public static flags = {
        username: Flags.string({
            char: 'u',
            description: messages.getMessage('flags.username.description'),
        }),
        'set-default': Flags.boolean({
            char: 's',
            description: messages.getMessage('flags.set-default.description'),
        }),
        alias: Flags.string({
            char: 'a',
            description: messages.getMessage('flags.alias.description'),
        }),
        targetdevhubusername,
        loglevel,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org login scratch'));
        SFPLogger.log(COLOR_HEADER(`alias: ${this.flags.alias ?? 'not set'}`), LoggerLevel.INFO);
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const { flags } = await this.parse(OrgLoginScratch);
        let scratchOrgInfoList: ScratchOrgInfo[] = [];
        const conn = this.hubOrg.getConnection();
        SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch scratch org infos for the given dev hub 👉 ${conn._baseUrl()}`));
  
        let query = `Select Id, SfdxAuthUrl__c, Status from ScratchOrgInfo where SignupUsername = '${flags.username}'`;
       

        try {
            const result = await conn.query<ScratchOrgInfo>(query);

            scratchOrgInfoList = result.records ? result.records : [];
        } catch (error) {
            throw new SfError(COLOR_ERROR(error.message), 'SCRATCH_ORG_INFO_QUERY_FAILED');
        }

        if (scratchOrgInfoList.length === 0) {
            throw new SfError(COLOR_ERROR(`No scratch orgs found for the user ${flags.username}`), 'NO_SCRATCH_ORGS_FOUND');
        }

        if(scratchOrgInfoList[0].Status !== 'Active') {
            throw new SfError(COLOR_ERROR(`Scratch org is not active`), 'SCRATCH_ORG_NOT_ACTIVE');
        }

        const oauth2Options = AuthInfo.parseSfdxAuthUrl(scratchOrgInfoList[0].SfdxAuthUrl__c);
        const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 });

        limiter.on('failed', async (error, jobInfo) => {
            if (jobInfo.retryCount < 5) {
                return 6000;
            } else {
                throw new Error(`Retry limit exceeded (15 seconds). Unable to find a domain.`);
            }
        });

        limiter.on('retry', (error, jobInfo) =>
            SFPLogger.log(
                `Auth info runs on error. Retrying (${jobInfo.retryCount + 1}/5) after 3 seconds...`,
                LoggerLevel.WARN
            )
        );

        const authInfo = await limiter.schedule(async () => await AuthInfo.create({ oauth2Options }));
        await authInfo.save();
        await authInfo.handleAliasAndDefaultSettings({
            alias: flags.alias,
            setDefault: flags['set-default'],
            setDefaultDevHub: false,
        });
        // ensure the clientSecret field... even if it is empty
        const result = { clientSecret: '', ...authInfo.getFields(true) };
        await AuthInfo.identifyPossibleScratchOrgs(result, authInfo);
        const successMsg = messages.getMessage('authorizeCommandSuccess', [result.username, result.orgId]);
        SFPLogger.log(COLOR_KEY_MESSAGE(successMsg), LoggerLevel.INFO);
        return { alias: flags.alias, username: result.username, orgId: result.orgId };
    }
}


