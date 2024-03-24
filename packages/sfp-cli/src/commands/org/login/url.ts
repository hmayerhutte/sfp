/* Original Copyright belongs to
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import SFPLogger, { LoggerLevel, COLOR_KEY_MESSAGE, COLOR_HEADER } from '@flxbl-io/sfp-logger';
import { Messages, AuthInfo } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../../SfpCommand';
import { loglevel } from '../../../flags/sfdxflags';
import { parseJson } from '@salesforce/kit';
import * as fs from 'fs';
import Bottleneck from 'bottleneck';
import dedent from 'dedent';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_login_url');
const AUTH_URL_FORMAT = 'force://<clientId>:<clientSecret>:<refreshToken>@<instanceUrl>';

export default class OrgLoginUrl extends SfpCommand {
    public static description = messages.getMessage('commandDescription', [AUTH_URL_FORMAT]);

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfp org:login:url --url-file files/authFile.json'];

    public static flags = {
        'url-file': Flags.file({
            char: 'f',
            description: messages.getMessage('flags.url-file.description'),
            exactlyOne: ['url-file', 'url-stdin'],
        }),
        'url-stdin': Flags.file({
            char: 'u',
            description: messages.getMessage('flags.url-stdin.description'),
            exactlyOne: ['url-file', 'url-stdin'],
        }),
        'set-default-dev-hub': Flags.boolean({
            char: 'd',
            description: messages.getMessage('flags.set-default-dev-hub.description'),
        }),
        'set-default': Flags.boolean({
            char: 's',
            description: messages.getMessage('flags.set-default.description'),
        }),
        alias: Flags.string({
            char: 'a',
            description: messages.getMessage('flags.alias.description'),
        }),
        loglevel,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org login url'));
        SFPLogger.log(COLOR_HEADER(`alias: ${this.flags.alias}`), LoggerLevel.INFO);
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const { flags } = await this.parse(OrgLoginUrl);
        const authFile = flags['url-file'];
        const authStdin = flags['url-stdin'];
        let sfpAuthUrl;
        try {
            if (authFile) {
                sfpAuthUrl = authFile.endsWith('.json')
                    ? await getUrlFromJson(authFile)
                    : fs.readFileSync(authFile, 'utf8');
            } else if (authStdin) {
                sfpAuthUrl = authStdin;
            } else {
                throw new Error('Salesforce Auth URL not found.');
            }
        } catch (error) {
            throw new Error(
                `Looks like the file is missing or the file format is incorrect.`
            );
        }
        if (!sfpAuthUrl) {
            throw new Error(dedent(
                `Error getting the auth URL from file ${authFile}. 
                 Please ensure it meets the description shown in the documentation for this command.`)
            );
        }

        const oauth2Options = AuthInfo.parseSfdxAuthUrl(sfpAuthUrl);
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
            setDefaultDevHub: flags['set-default-dev-hub'],
        });
        // ensure the clientSecret field... even if it is empty
        const result = { clientSecret: '', ...authInfo.getFields(true) };
        await AuthInfo.identifyPossibleScratchOrgs(result, authInfo);
        const successMsg = messages.getMessage('authorizeCommandSuccess', [result.username, result.orgId]);
        SFPLogger.log(COLOR_KEY_MESSAGE(successMsg), LoggerLevel.INFO);
        return { alias: flags.alias, username: result.username, orgId: result.orgId };
    }
}

const getUrlFromJson = async (authFile) => {
    const jsonContents = fs.readFileSync(authFile, 'utf8');
    const authFileJson = parseJson(jsonContents);
    if (typeof authFileJson === 'object' && authFileJson !== null && 'sfdxAuthUrl' in authFileJson) {
        return authFileJson.sfdxAuthUrl;
    }
    if (typeof authFileJson === 'object' && authFileJson !== null && 'result' in authFileJson) {
        if (
            typeof authFileJson.result === 'object' &&
            authFileJson.result !== null &&
            'sfdxAuthUrl' in authFileJson.result
        ) {
            return authFileJson.result.sfdxAuthUrl;
        }
    }
    return '';
};
