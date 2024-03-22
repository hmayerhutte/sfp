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
import { loglevel, requiredUserNameFlag } from '../../../flags/sfdxflags';
import { faker } from '@faker-js/faker';
import Table from 'cli-table3';
import Bottleneck from 'bottleneck';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_deactivate_user');

type User = {
    Id?: string;
    Name?: string;
    ProfileId?: string;
    Profile?: {
        UserLicenseId: string;
    };
    Alias?: string;
    FirstName?: string;
    Username?: string;
    LastName?: string;
    Email?: string;
    LocaleSidKey?: string;
    LanguageLocaleKey?: string;
    EmailEncodingKey?: string;
    TimeZoneSidKey?: string;
    IsActive?: boolean;
};

export default class OrgDeactivateUser extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:deactivate:user -o MyOrg'];
    public static readonly flags = {
        alias: Flags.string({
            char: 'a',
            summary: messages.getMessage('flags.alias.summary'),
        }),
        exclude: Flags.string({
            char: 'e',
            summary: messages.getMessage('flags.exclude.summary'),
        }),
        loglevel,
        requiredUserNameFlag,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org deactivate user'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);

        const prodOrg = await Org.create({ aliasOrUsername: this.flags.requiredUserNameFlag });
        const prodConnection = prodOrg.getConnection();
        let userListFromOrg: User[] = [];
        let excludeList: string[] = [];
        if (this.flags.exclude) {
            excludeList = this.flags.exclude.split(',').map((i) => i.trim());
            SFPLogger.log(COLOR_KEY_MESSAGE(`Exclude this usernames 👇`));

            let sandboxInputTable = new Table({
                head: ['Exclude Usernames'],
                colWidths: [30],
                wordWrap: true,
            });

            for (const name of excludeList) {
                sandboxInputTable.push([name]);
            }

            SFPLogger.log(sandboxInputTable.toString(), LoggerLevel.INFO);
        }
        SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch user infos for the given org 👉 ${prodConnection._baseUrl()}`));
        let query = `Select Id, Name, Alias, Username, Email, IsActive from User Where IsActive = true`;
        if (this.flags.alias) {
            query += ` And Alias = '${this.flags.alias}'`;
        }

        try {
            const result = await prodConnection.query<User>(query);

            userListFromOrg = result.records ? result.records : [];
        } catch (error) {
            throw messages.createError('error.Default', [error]);
        }

        if (userListFromOrg.length === 0) {
            throw messages.createError(`error.UserResultLength`, [this.flags.requiredUserNameFlag]);
        }

        let userList: User[] = [];

        if (this.flags.exclude) {
            SFPLogger.log(COLOR_KEY_MESSAGE(`These users should be excluded 👇`));

            let excludeInfoTable = new Table({
                head: ['Excluded Username', 'Found in the org'],
                colWidths: [35, 35],
                wordWrap: true,
            });

            for (const name of excludeList) {
                excludeInfoTable.push([name, userListFromOrg.some((user) => user.Username === name) ? '✅' : '❌']);
            }

            userList = userListFromOrg.filter((user) => !excludeList.includes(user.Username));

            if (userList.length === 0) {
                throw messages.createError(`error.UserNoResultAfterExclude`);
            }
        } else {
            userList = userListFromOrg;
        }

        SFPLogger.log(COLOR_KEY_MESSAGE(`These users were identified using the appropriate parameters. 👇`));

        let userInfoTable = new Table({
            head: ['Id', 'Email', 'Alias', 'Username'],
            colWidths: [20, 35, 15, 35],
            wordWrap: true,
        });

        for (let user of userList) {
            userInfoTable.push([user.Id, user.Email, user.Alias, user.Username]);
        }

        SFPLogger.log(userInfoTable.toString());

        SFPLogger.log(COLOR_TRACE(`Start deactivating users in the org ...`));

        let userResultTable = new Table({
            head: ['Email', 'Alias', 'Status', 'Error'],
            colWidths: [30, 12, 8, 50],
            wordWrap: true,
        });

        const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 500 });

        let succesfullyDeactivatedCount = 0;
        let failedDeactivatedCount = 0;

        for (let user of userList) {
            await limiter.schedule(async () => {
                try {
                    const updateResult = await prodConnection.sobject('User').update({ Id: user.Id, IsActive: false });
                    SFPLogger.log(COLOR_TRACE(`Processing id ${user.Id}...`));
                    if (updateResult.success) {
                        userResultTable.push([user.Email, user.Alias, '✅', '']);
                        succesfullyDeactivatedCount++;
                    } else {
                        userResultTable.push([user.Email, user.Alias, '❌', updateResult.errors[0].message]);
                        failedDeactivatedCount++;
                    }
                } catch (error) {
                    userResultTable.push([user.Email, user.Alias, '❌', error.message]);
                    failedDeactivatedCount++;
                }
            });
        }

        SFPLogger.log(COLOR_KEY_MESSAGE(`Here the result 👇`));
        SFPLogger.log(userResultTable.toString());
        if (succesfullyDeactivatedCount > 0) {
            SFPLogger.log(COLOR_SUCCESS(`✅ Succesfully deactivated: ${succesfullyDeactivatedCount}`));
        }
        if (failedDeactivatedCount > 0) {
            SFPLogger.log(COLOR_ERROR(`❌ Failed to deactivate: ${failedDeactivatedCount}`));
        }
        return { succesfullyDeactivatedCount, failedDeactivatedCount };
    }
}
