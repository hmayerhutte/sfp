import SFPLogger, {
    LoggerLevel,
    COLOR_KEY_MESSAGE,
    COLOR_HEADER,
    COLOR_INFO,
    COLOR_TRACE,
    COLOR_SUCCESS,
} from '@flxbl-io/sfp-logger';
import {
    Messages,
    Org,
    WebOAuthServer,
    SandboxProcessObject,
    SandboxUserAuthRequest,
    SandboxUserAuthResponse,
    AuthFields,
    StateAggregator,
    AuthInfo,
} from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../../SfpCommand';
import { loglevel, targetdevhubusername } from '../../../flags/sfdxflags';
import fs from 'fs';
import Table from 'cli-table3';
import Bottleneck from "bottleneck";
import dedent from 'dedent-js';

Messages.importMessagesDirectory(__dirname);

export type SandboxProcess = {
    Id: string;
    SandboxName: string;
    Status: string;
    Description: string;
    LicenseType: string;
    SandboxInfoId: string;
};

enum PATH {
    DEFAULT = '.sfops',
    BUILD = '.sfops/sandbox_auth.json',
}

const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_login_sandbox');

export default class Sandbox extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfops org:login:sandbox --name mySandbox1 -v myDevHub'];

    public static flags = {
        name: Flags.string({
            char: 'n',
            summary: messages.getMessage('flags.name.description'),
            parse: (name) => {
                if (name.length > 10) {
                    throw messages.createError('error.SandboxNameLength', [name]);
                }
                return Promise.resolve(name);
            },
            required: true,
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
        SFPLogger.log(COLOR_HEADER('command: org login sandbox'));
        SFPLogger.log(COLOR_HEADER(`sbx name: ${this.flags.name}`), LoggerLevel.INFO);
        SFPLogger.log(COLOR_HEADER(`alias: ${this.flags.alias ?? '-'}`), LoggerLevel.INFO);
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        try {
            const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetdevhubusername });
            const prodConnection = prodOrg.getConnection();
            SFPLogger.log(
                COLOR_KEY_MESSAGE(`Fetch sandbox infos from org 👉 ${prodConnection.getAuthInfoFields().instanceUrl}`)
            );
            let sandboxOrgResponse = await prodConnection.tooling.query<SandboxProcess>(
                `Select Id,SandboxName,Status, Description, LicenseType from SandboxProcess where SandboxInfo.SandboxName = '${this.flags.name}' Order By CreatedDate Desc Limit 1`
            );
            let sandboxList = sandboxOrgResponse.records ? sandboxOrgResponse.records : [];

            if (sandboxList.length === 0) {
                throw messages.createError(`error.SandboxProcessResultLength`, [
                    this.flags.name,
                    this.flags.targetdevhubusername,
                ]);
            }

            let sandbox = sandboxList[0];
            SFPLogger.log(COLOR_KEY_MESSAGE(`Found sandbox process information for the given parameters 👇`));
            let sandboxInfos = new Table({
                head: ['Id', 'SandboxName', 'Status', 'Description', 'LicenseType'],
                colWidths: [20, 20, 20, 30, 20],
                wordWrap: true,
            });

            sandboxInfos.push([
                sandbox.Id,
                sandbox.SandboxName,
                sandbox.Status,
                sandbox.Description,
                sandbox.LicenseType,
            ]);
            SFPLogger.log(sandboxInfos.toString(), LoggerLevel.INFO);

            if (sandbox.Status === 'Completed') {
                SFPLogger.log(
                    COLOR_KEY_MESSAGE(`Sandbox ${sandbox.SandboxName} is ready to use. 👌`),
                    LoggerLevel.INFO
                );
                SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch sandbox auth fields for login requests...`), LoggerLevel.INFO);
                const authFields = prodConnection.getAuthInfoFields();
                const callbackUrl = `http://localhost:${await WebOAuthServer.determineOauthPort()}/OauthRedirect`;
                const sandboxReq: SandboxUserAuthRequest = {
                    // the sandbox signup has been completed on production, we have production clientId by this point
                    clientId: authFields.clientId as string,
                    sandboxName: sandbox.SandboxName,
                    callbackUrl,
                };
                SFPLogger.log(
                    COLOR_TRACE(sandboxReq, 'Calling sandboxAuth with SandboxUserAuthRequest'),
                    LoggerLevel.TRACE
                );
                const limiter = new Bottleneck({ maxConcurrent: 1 });

                limiter.on('failed', async (error, jobInfo) => { 
                    if (jobInfo.retryCount < 20) {
                        return 6000 + (jobInfo.retryCount * 1000);
                    } else {
                        throw new Error(`Retry limit exceeded, Unable to get sandbox auth infos due to ${error.message}`);
                    }
                });

                limiter.on('retry', (error, jobInfo) =>
                    SFPLogger.log(
                        `Sandbox auth request runs on error. Retrying (${jobInfo.retryCount + 1}/10) after 6 seconds...`,
                        LoggerLevel.WARN
                    )
                    
                );
                const url = `${prodConnection.tooling._baseUrl()}/sandboxAuth`;

                const {result,authInfo} = await limiter.schedule(async () => {
                    try {
                        const result:any = await prodConnection.tooling.request({
                            method: 'POST',
                            url,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(sandboxReq),
                        });

                        const oauth2Options: AuthFields & {
                            redirectUri?: string;
                        } = {
                            loginUrl: result.loginUrl,
                            instanceUrl: result.instanceUrl,
                            username: result.authUserName,
                        };
                        oauth2Options.redirectUri = `http://localhost:${await WebOAuthServer.determineOauthPort()}/OauthRedirect`;
                        oauth2Options.authCode = result.authCode;
                        const stateAggregator = await StateAggregator.getInstance();
                        try {
                            await stateAggregator.orgs.read(result.authUserName);
                            await stateAggregator.orgs.remove(result.authUserName);
                        } catch (e) {
                            // ignore since this is only for deleting existing auth files.
                        }
                        const authInfo = await AuthInfo.create({
                            username: result.authUserName,
                            oauth2Options,
                            parentUsername: authFields.username,
                        });
                        SFPLogger.log(COLOR_KEY_MESSAGE(`Save the auth info and set the alias...`), LoggerLevel.INFO);
        
                        await authInfo.save({
                            isScratch: false,
                            isSandbox: true,
                        });
        
                        await authInfo.handleAliasAndDefaultSettings({
                            alias: this.flags.alias,
                            setDefault: this.flags['set-default'],
                            setDefaultDevHub: this.flags['set-default-dev-hub'],
                        });

                        return {result, authInfo};
        
                    } catch (error) {
                        throw new Error(dedent(`Unable to fetch auth token from Salesforce, 
                                        Please retry, If the issue persists please contact Salesforce Support and mention that
                                        sf org resume is broken with the error: ${error.message}
                                        `));
                    }
                });

                let authResponseTable = new Table({
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
                    style: { 'padding-left': 0, 'padding-right': 0 },
                });

                
                SFPLogger.log(COLOR_INFO(`The login details were successfully determined`), LoggerLevel.INFO);
                SFPLogger.log(COLOR_INFO(`Writing the login details to the file ${PATH.BUILD}`), LoggerLevel.INFO);
                if (!fs.existsSync(PATH.DEFAULT)) {
                    fs.mkdirSync(PATH.DEFAULT);
                }
                fs.writeFileSync(PATH.BUILD, JSON.stringify(authInfo.getSfdxAuthUrl(), null, 4), 'utf-8');

                const cleanInstanceUrl = authInfo.getFields().instanceUrl?.replace(/\/$/, '');
                const frontDoorUrl = `${cleanInstanceUrl}/secur/frontdoor.jsp?sid=${
                    authInfo.getFields(true).accessToken
                }`;

                SFPLogger.log(COLOR_KEY_MESSAGE(`Login was successfully completed. Here is the front door url 👇`));
                SFPLogger.log(COLOR_SUCCESS(`${frontDoorUrl}`));
                return {
                    loginUrl: result.loginUrl,
                    instanceUrl: result.instanceUrl,
                    sandboxName: sandbox.SandboxName,
                    alias: this.flags.alias,
                    username: result.authUserName,
                    frontDoorUrl:frontDoorUrl,
                };
            } else {
                throw messages.createError(`error.SandboxNotCompleted`, [sandbox.SandboxName, sandbox.Status]);
            }
        } catch (error) {
            throw messages.createError('error.Default', [error.message]);
        }
    }
}
