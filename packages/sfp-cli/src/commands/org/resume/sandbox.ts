import SFPLogger, { LoggerLevel, COLOR_KEY_MESSAGE,COLOR_HEADER, COLOR_INFO, COLOR_TRACE, COLOR_SUCCESS } from '@flxblio/sfp-logger';
import { Messages, Org, WebOAuthServer, SandboxProcessObject, SandboxUserAuthRequest,SandboxUserAuthResponse,AuthFields, StateAggregator,AuthInfo } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../../SfpCommand';
import { loglevel } from '../../../flags/sfdxflags';
import fs from 'fs';


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
    DEFAULT = ".sfpowerscripts",
    BUILD = ".sfpowerscripts/sandbox_auth.json"
}


const messages = Messages.loadMessages('@flxblio/sfp', 'org_resume_sandbox');

export default class OrgResumeSandbox extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:resume:sandbox --name sandbox1'];

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
            required: true
        }),
        targetorg: Flags.string({
            char: 'o',
            summary: messages.getMessage('flags.targetorg.description'),
            required: true
        }),
        loglevel,
    };


    public async execute(): Promise<SandboxProcessObject> {
        SFPLogger.log(COLOR_HEADER('command: org resume sandbox'));
        SFPLogger.printHeaderLine('',COLOR_HEADER,LoggerLevel.INFO);
        try {
        const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetorg });
        const prodConnection = prodOrg.getConnection();
        let sandboxOrgResponse = await prodConnection.tooling.query<SandboxProcess>(
            `Select Id,SandboxName,Status, Description, LicenseType from SandboxProcess where SandboxInfo.SandboxName = '${this.flags.name}' Order By CreatedDate Desc Limit 1`
        );
        let sandboxList = sandboxOrgResponse.records ? sandboxOrgResponse.records : [];

        if(sandboxList.length === 0) {
            throw new Error(`Found no sandbox process information for the given parameters. Please check the sandbox name '${this.flags.name}' in the production org '${this.flags.targetorg}' and try again!`);
        }

        let sandbox = sandboxList[0];

        if (this.sandboxIsResumable(sandbox.Status)) {
            if(sandbox.Status === 'Completed') {
                SFPLogger.log(COLOR_KEY_MESSAGE(`Sandbox ${sandbox.SandboxName} is ready to use.`), LoggerLevel.INFO);
                SFPLogger.log(COLOR_INFO(`Try to fetch login infos`), LoggerLevel.INFO);
                const authFields = prodConnection.getAuthInfoFields();
                const callbackUrl = `http://localhost:${await WebOAuthServer.determineOauthPort()}/OauthRedirect`;
                const sandboxReq: SandboxUserAuthRequest = {
                    // the sandbox signup has been completed on production, we have production clientId by this point
                    clientId: authFields.clientId as string,
                    sandboxName: 'Packaging',
                    callbackUrl,
                };
                SFPLogger.log(COLOR_TRACE(sandboxReq, 'Calling sandboxAuth with SandboxUserAuthRequest'),LoggerLevel.TRACE);
                const url = `${prodConnection.tooling._baseUrl()}/sandboxAuth`;
                const result: SandboxUserAuthResponse = await prodConnection.tooling.request(
                    {
                        method: 'POST',
                        url,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sandboxReq),
                    }
                );

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



                  await authInfo.save({
                    isScratch: false,
                    isSandbox: true,
                  });

                   SFPLogger.log(COLOR_SUCCESS(`The login details were successfully determined`), LoggerLevel.INFO);
                   SFPLogger.log(COLOR_SUCCESS(`Writing the login details to the file ${PATH.BUILD}`), LoggerLevel.INFO);
                   if (!fs.existsSync(PATH.DEFAULT)) {
                    fs.mkdirSync(PATH.DEFAULT);
                }
                    fs.writeFileSync(PATH.BUILD, JSON.stringify(authInfo.getSfdxAuthUrl(), null, 4), 'utf-8');

            } else {
                throw new Error(`Sandbox ${sandbox.SandboxName} is still in progress ⌛️. Status: ${sandbox.Status}. Please try again later!`);
            }
        } else {
            throw new Error(`Sandbox ${sandbox.SandboxName} is not resumable. Status: ${sandbox.Status}`);
        }
        return;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    private sandboxIsResumable (value: string): boolean {
        const resumableSandboxStatus = ['Activating', 'Pending', 'Pending Activation', 'Processing', 'Sampling', 'Completed'];
        return resumableSandboxStatus.includes(value);
    }


}

