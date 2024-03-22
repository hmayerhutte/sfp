/* Original Copyright belongs to
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import SFPLogger, { LoggerLevel, COLOR_KEY_MESSAGE, COLOR_HEADER, COLOR_TRACE, COLOR_SUCCESS } from '@flxbl-io/sfp-logger';
import { Messages, SfError } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../SfpCommand';
import { loglevel, requiredUserNameFlag } from '../../flags/sfdxflags';
import fs from 'fs-extra';
import * as path from 'path';
import ora from 'ora';
import { platform, tmpdir } from 'os';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_open');

export default class OrgOpen extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresUsername = true;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfp org:open -o myTargetOrg'];

    public static flags = {
        private: Flags.boolean({
            summary: messages.getMessage('flags.private.summary'),
            exclusive: ['browser'],
        }),
        browser: Flags.option({
            char: 'b',
            summary: messages.getMessage('flags.browser.summary'),
            options: ['chrome', 'edge', 'firefox'] as const, // These are ones supported by "open" package
            exclusive: ['private'],
        })(),
        requiredUserNameFlag,
        loglevel,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org open'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const { flags } = await this.parse(OrgOpen);
        await this.org.refreshAuth(); // we need a live accessToken for the frontdoor url
        const conn = this.org.getConnection();
        const accessToken = conn.accessToken;
        SFPLogger.log(COLOR_KEY_MESSAGE(`Opening org for username 👉 ${this.org.getUsername()}`), LoggerLevel.INFO);
        const instanceUrl = conn.getAuthInfoFields().instanceUrl;
        const instanceUrlClean = instanceUrl.replace(/\/$/, '');
        const retUrl = '/lightning/setup/SetupOneHome/home';

        const frontdoorUrl = `${instanceUrlClean}/secur/frontdoor.jsp?sid=${accessToken}`;

        if(this.flags.json) {
            return { frontdoorUrl };
        }

        const tempFilePath = path.join(tmpdir(), `org-open-sfp-${new Date().valueOf()}.html`);
        SFPLogger.log(COLOR_TRACE(`Create temporary file for frontdoor URL: ${tempFilePath}`), LoggerLevel.TRACE);

        fs.writeFileSync(
            tempFilePath,
            `<html>
             <body onload="document.body.firstElementChild.submit()">
               <form method="POST" action="${instanceUrl}/secur/frontdoor.jsp">
                <input type="hidden" name="sid" value="${accessToken}" />
                <input type="hidden" name="retURL" value="${retUrl}" /> 
               </form>
             </body>
            </html>`
        );

        const urlSpinner = ora(COLOR_KEY_MESSAGE(`Start open url for instance ${instanceUrl}`)).start();
        try {
            const openModule = await import('open');
            const { default: open, apps } = openModule;

            await open(`file:///${tempFilePath}`, {
                ...(flags.browser ? { app: { name: apps[flags.browser] } } : {}),
                ...(flags.private ? { newInstance: platform() === 'darwin', app: { name: apps.browserPrivate } } : {}),
            });
        } catch (error) {
            urlSpinner.fail(COLOR_KEY_MESSAGE('Failed to open URL'));
            fs.removeSync(tempFilePath);
            throw SfError.wrap(error);
        }
        
        urlSpinner.succeed(COLOR_SUCCESS('Url successfully opened in browser! 👌'));
        
        const cleanUpSpinner = ora(COLOR_KEY_MESSAGE(`File is still in use from the broser. So we wait 7 seconds before cleanup`)).start();
        await new Promise(resolve => setTimeout(resolve, 7000))
        fs.removeSync(tempFilePath);
        cleanUpSpinner.succeed(COLOR_SUCCESS('Temporary file cleaned up! 👌'));

        return {};
    }
}
