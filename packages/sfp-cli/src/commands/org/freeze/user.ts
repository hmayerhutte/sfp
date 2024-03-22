import { Messages } from '@salesforce/core';
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
import Table from 'cli-table3';
import Bottleneck from 'bottleneck';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_freeze_user');

type User = {
    Id?: string;
    Name?: string;
    ProfileId?: string;
    Profile?: {
        Name?: string;
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

type UserLogin = {
    Id: string;
    UserId: string;
    IsFrozen: boolean;
};

export default class OrgFreezeUser extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;
    protected static requiresUsername = true;

    public static examples = ['$ sfp org:freeze:user -p "Base Profile" -o MyOrg'];
    public static readonly flags = {
        profiles: Flags.string({
            char: 'p',
            summary: messages.getMessage('flags.profiles.summary'),
            required: true,
        }),
        loglevel,
        requiredUserNameFlag,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org freeze user'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const conn = this.org.getConnection();

        let userList: User[] = [];
        let profilesList: string[] = [];
       
            profilesList = this.flags.profiles.split(',').map((i) => i.trim());
            if(!profilesList.includes('System Administrator')){
                profilesList.push('System Administrator');
            }
            SFPLogger.log(COLOR_KEY_MESSAGE(`Freeze users for this profiles 👇`));

            let sandboxInputTable = new Table({
                head: ['Profiles'],
                colWidths: [30],
                wordWrap: true,
            });

            for (const name of profilesList) {
                sandboxInputTable.push([name]);
            }

            SFPLogger.log(sandboxInputTable.toString(), LoggerLevel.INFO);
        
        SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch user infos for the given org 👉 ${conn._baseUrl()}`));
        let query = `Select Id, Name, Alias, Username, Email, IsActive, Profile.Name from User Where Profile.Name In ('${profilesList.join(`','`)}')`;
       

        try {
            const result = await conn.query<User>(query);

            userList = result.records ? result.records : [];
        } catch (error) {
            throw messages.createError('error.Default', [error]);
        }

        const userSet = new Set(userList.map((user) => user.Id));
        const userMap = new Map(userList.map((user) => [user.Id, user]));

        if (userList.length === 0) {
            throw messages.createError(`error.UserResultLength`, [this.flags.requiredUserNameFlag]);
        }

        SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch login infos for ${userSet.size} users`));

        query = `Select Id,UserId, IsFrozen from UserLogin Where UserId In ('${Array.from(userSet).join(`','`)}') And IsFrozen = false`;

        let userLoginList: UserLogin[] = [];

        try {
            const result = await conn.query<UserLogin>(query);

            userLoginList = result.records ? result.records : [];
        } catch (error) {
            throw messages.createError('error.Default', [error]);
        }

        if(userLoginList.length === 0) {
            throw messages.createError(`error.UserLoginResultLength`, [this.flags.requiredUserNameFlag]);
        }

        SFPLogger.log(COLOR_KEY_MESSAGE(`Found this users to freeze 👇`));

        let userInfoTable = new Table({
            head: ['Id', 'Email', 'Alias', 'Username', 'Profile'],
            colWidths: [20, 35, 15, 35, 30],
            wordWrap: true,
        });

        for (let user of userList) {
            for (let userLogin of userLoginList) {
                if (user.Id === userLogin.Id) {
                    userInfoTable.push([user.Id, user.Email, user.Alias, user.Username, user.Profile?.Name]);
                }
            }
        }

        SFPLogger.log(userInfoTable.toString());

        SFPLogger.log(COLOR_TRACE(`Start freezing users in the org ...`));

        let userResultTable = new Table({
            head: ['Email', 'Alias', 'Status', 'Error'],
            colWidths: [30, 12, 8, 50],
            wordWrap: true,
        });

        const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 500 });

        let succesfullyFreezedCount = 0;
        let failedFreezedCount = 0;

        for (let user of userLoginList) {
            await limiter.schedule(async () => {
                try {
                    const updateResult = await conn.sobject('UserLogin').update({ Id: user.Id, IsFrozen: true });
                    SFPLogger.log(COLOR_TRACE(`Processing id ${user.Id}...`));
                    if (updateResult.success) {
                        userResultTable.push([userMap.get(user.UserId).Email, userMap.get(user.UserId).Alias, '✅', '']);
                        succesfullyFreezedCount++;
                    } else {
                        userResultTable.push([userMap.get(user.UserId).Email, userMap.get(user.UserId).Alias, '❌', updateResult.errors[0].message]);
                        failedFreezedCount++;
                    }
                } catch (error) {
                    userResultTable.push([userMap.get(user.UserId).Email, userMap.get(user.UserId).Alias, '❌', error.message]);
                    failedFreezedCount++;
                }
            });
        }

        SFPLogger.log(COLOR_KEY_MESSAGE(`Here the result 👇`));
        SFPLogger.log(userResultTable.toString());
        if (succesfullyFreezedCount > 0) {
            SFPLogger.log(COLOR_SUCCESS(`✅ Succesfully freezed: ${succesfullyFreezedCount}`));
        }
        if (failedFreezedCount > 0) {
            SFPLogger.log(COLOR_ERROR(`❌ Failed to freeze: ${failedFreezedCount}`));
        }
        return { succesfullyFreezedCount, failedFreezedCount };
    }
}
