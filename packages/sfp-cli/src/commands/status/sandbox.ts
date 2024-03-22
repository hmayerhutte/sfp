import SFPLogger, {
    LoggerLevel,
    COLOR_KEY_MESSAGE,
    COLOR_HEADER,
    COLOR_INFO,
    COLOR_TRACE,
    COLOR_SUCCESS,
    COLOR_KEY_VALUE,
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
import SfpCommand from './../../SfpCommand';
import { loglevel, targetdevhubusername } from '../../flags/sfdxflags';
import fs from 'fs';
import Table from 'cli-table3';
import QueryHelper from '../../core/queryHelper/QueryHelper';


Messages.importMessagesDirectory(__dirname);

export type SandboxProcess = {
    Id: string;
    SandboxName: string;
    Status: string;
    StartDate: Date;
    ActivatedDate: Date;
    HistoryDays: number;
    Description: string;
    LicenseType: string;
    SandboxInfoId: string;
};

enum PATH {
    DEFAULT = '.sfops',
    OUTPUT_FILE_PATH = '.sfops/status_sandbox.json',
}

const messages = Messages.loadMessages('@flxbl-io/sfp', 'status_sandbox');


export default class StatusSandbox extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfops status:sandbox --name mySandbox1 -v myDevHub'];

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
        }),
        targetdevhubusername,
        json: Flags.boolean({
            description: "oupout in json format",
            default: false,
        }),
        loglevel,
    };

    public async execute(): Promise<any> {
        
        try {
            if(this.flags.json) {
              SFPLogger.disableLogs();
            }
            else {
                SFPLogger.log(COLOR_HEADER('command: status sandbox'));
                SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
            }

        
            const prodOrg = await Org.create({ aliasOrUsername: this.flags.targetdevhubusername });
            const prodConnection = prodOrg.getConnection();
            SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch sandbox status from org 👉 ${prodConnection.getAuthInfoFields().instanceUrl}`));
            let sandBoxQuery = 'Select id, Status,SandboxName,StartDate,ActivatedDate, LicenseType, HistoryDays,Description,SandboxInfoId from SandboxProcess';
            if(this.flags.name){
                sandBoxQuery += ` where SandboxName = '${this.flags.name}'`;
            }
            sandBoxQuery += ' order by CreatedDate desc';

            let sandboxList = await QueryHelper.query<SandboxProcess>(sandBoxQuery, prodConnection, true);

            if (sandboxList.length === 0) {
                throw messages.createError(
                    `error.SandboxProcessResultLength`,[this.flags.name, this.flags.targetdevhubusername]
                );
            }

    
            if(!this.flags.json) {
            SFPLogger.log(COLOR_KEY_MESSAGE(`Found sandbox process information for the given parameters 👇`));
            let sandboxInfos = new Table({
                head: [COLOR_KEY_MESSAGE('Id'), COLOR_KEY_MESSAGE('SandboxName'), COLOR_KEY_MESSAGE('Status'), COLOR_KEY_MESSAGE('Description'), COLOR_KEY_MESSAGE('LicenseType')],
                colWidths: [20, 20, 20, 30, 20], 
                wordWrap: true,
            });
            for (let sandbox of sandboxList) {
                sandboxInfos.push([sandbox.Id, sandbox.SandboxName, sandbox.Status, sandbox.Description, sandbox.LicenseType]);
            }
            SFPLogger.log(sandboxInfos.toString(), LoggerLevel.INFO);
        }
            if (!fs.existsSync(PATH.DEFAULT)) {
                fs.mkdirSync(PATH.DEFAULT);
            }
            fs.writeFileSync(PATH.OUTPUT_FILE_PATH, JSON.stringify(sandboxList, null, 4), 'utf-8');
            return { result: true, path: PATH.OUTPUT_FILE_PATH };
        } catch (error) {
            throw messages.createError('error.Default',[error.message]);
        }
    }
}
