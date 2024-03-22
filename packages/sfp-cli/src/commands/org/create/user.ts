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
const messages = Messages.loadMessages('@flxbl-io/sfp', 'org_create_user');

type User = {
    Id?: string;
    Name?: string;
    ProfileId?: string;
    Profile?: {
        UserLicenseId: string;
    };
    Alias?: string;
    FirstName?: string;
    UserName?: string;
    LastName?: string;
    Email?: string;
    LocaleSidKey?: string;
    LanguageLocaleKey?: string;
    EmailEncodingKey?: string;
    TimeZoneSidKey?: string;
    IsActive?: boolean;
};

export default class OrgCreateUser extends SfpCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly description = messages.getMessage('description');
    public static enableJsonFlag = true;

    protected static requiresDevhubUsername = false;
    protected static requiresProject = false;

    public static examples = ['$ sfp org:create:user -o MyOrg -e mymail@gmail.com'];
    public static readonly flags = {
        email: Flags.string({
            char: 'e',
            summary: messages.getMessage('flags.email.summary'),
            required: true,
        }),
        resetInvokedUser: Flags.boolean({
            char: 'r',
            summary: messages.getMessage('flags.resetInvokedUser.summary'),
            default: false,
        }),
        loglevel,
        requiredUserNameFlag,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: org create user'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);

        let isTargetUserPasswordReset = false;

        try {
            const targetOrg = await Org.create({ aliasOrUsername: this.flags.requiredUserNameFlag });
            const connTargetOrg = targetOrg.getConnection();
            const defaultUsername = connTargetOrg.getUsername();
            SFPLogger.log(COLOR_KEY_MESSAGE(`Fetch user infos for the given username ${defaultUsername} 👇`));
            const query = `Select Id, Name, ProfileId, Profile.UserLicenseId from User WHERE Username='${defaultUsername}'`;
            const invokedUserDetails: User = await connTargetOrg.singleRecordQuery(query);

            if (!invokedUserDetails) {
                throw messages.createError(`error.UserResultLength`, [this.flags.requiredUserNameFlag]);
            }

            const firstName = faker.person.firstName().replace(/\s/g, '_');
            const lastName = faker.hacker.noun().replace(/\s/g, '_');

            let userName = faker.internet.exampleEmail({
                firstName: firstName,
                lastName: lastName,
            });

            const user: User = {
                ProfileId: invokedUserDetails.ProfileId,
                Alias: faker.hacker.noun().replace(/\s/g, '_').slice(0, 8),
                FirstName: firstName,
                LastName: lastName,
                UserName: userName,
                Email: this.flags.email,
                LocaleSidKey: 'en_AU',
                LanguageLocaleKey: 'en_US',
                EmailEncodingKey: 'ISO-8859-1',
                TimeZoneSidKey: 'Australia/Melbourne',
                IsActive: true,
            };

            let userInfoTable = new Table({
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
                colWidths: [20, 30],
                wordWrap: true,
            });

            userInfoTable.push([COLOR_KEY_MESSAGE('ProfileId:'), invokedUserDetails.ProfileId]);
            userInfoTable.push([COLOR_KEY_MESSAGE('Alias:'), user.Alias]);
            userInfoTable.push([COLOR_KEY_MESSAGE('FirstName:'), user.FirstName]);
            userInfoTable.push([COLOR_KEY_MESSAGE('LastName:'), user.LastName]);
            userInfoTable.push([COLOR_KEY_MESSAGE('UserName:'), user.UserName]);
            userInfoTable.push([COLOR_KEY_MESSAGE('Email:'), user.Email]);
            userInfoTable.push([COLOR_KEY_MESSAGE('LocaleSidKey:'), user.LocaleSidKey]);
            userInfoTable.push([COLOR_KEY_MESSAGE('LanguageLocaleKey:'), user.LanguageLocaleKey]);
            userInfoTable.push([COLOR_KEY_MESSAGE('EmailEncodingKey:'), user.EmailEncodingKey]);
            userInfoTable.push([COLOR_KEY_MESSAGE('TimeZoneSidKey:'), user.TimeZoneSidKey]);
            userInfoTable.push([COLOR_KEY_MESSAGE('IsActive:'), user.IsActive]);

            SFPLogger.log(userInfoTable.toString(), LoggerLevel.INFO);

            let userCreateResult = await connTargetOrg.sobject('User').create(user);

           

            if (userCreateResult.success) {
                SFPLogger.log(
                    COLOR_SUCCESS(`\nUser creation is succesfully created with id ${userCreateResult.id}!`),
                    LoggerLevel.INFO
                );
            } else if (!this.flags.resetInvokedUser) {
                if (Array.isArray(userCreateResult.errors) && userCreateResult.errors.length > 0) {
                    throw messages.createError(`error.UserCreationWithInfo`, [userCreateResult.errors[0].message]);
                } else {
                    throw messages.createError(`error.UserCreationWithoutInfo`);
                }
            } else {
                if (this.flags.resetInvokedUser) {
                    SFPLogger.log(
                        `\nUser creation is failed!, Proceeding to reset password for invoked user`,
                        LoggerLevel.INFO
                    );
                    SFPLogger.log(COLOR_KEY_MESSAGE(`Update email for the invoked user 👆`));
                    const user = [
                        {
                            Id: invokedUserDetails.Id,
                            Email: this.flags.email,
                        },
                    ];
                    const updateResult = await connTargetOrg.sobject('User').update(user);
                    isTargetUserPasswordReset = true;
                    if (updateResult[0].success) {
                        SFPLogger.log(
                            COLOR_SUCCESS(`\nUser email is succesfully updated for the invoked user!`),
                            LoggerLevel.INFO
                        );
                    } else {
                        throw messages.createError(`error.EmailUpdate`, [updateResult[0].errors[0].message]);
                    }
                    userCreateResult.id = invokedUserDetails.Id;
                }
            }

          
            const limiter = new Bottleneck({ maxConcurrent: 1 });

            limiter.on('failed', async (error, jobInfo) => {
                if (jobInfo.retryCount < 5) {
                    return 3000;
                } else {
                    SFPLogger.log(COLOR_ERROR(`Retry limit exceeded (15 seconds). Unable to reset the password.`));
                    SFPLogger.log(COLOR_ERROR(`Error: ${error}`), LoggerLevel.TRACE);
                }
            });

            limiter.on('retry', (error, jobInfo) =>
                SFPLogger.log(
                    `Password reset request runs on error. Retrying (${jobInfo.retryCount + 1}/5) after 3 seconds...`,
                    LoggerLevel.WARN
                )
            );

            //Don't reset password as email has to be accepted and the user has to manually reset password
            if (!isTargetUserPasswordReset) {

                SFPLogger.log(
                    COLOR_TRACE(
                        `Start resetting the password for the ${
                            this.flags.resetInvokedUser ? 'invoked' : 'created'
                        } user...`
                    ),
                    LoggerLevel.INFO
                );

                const url = `${connTargetOrg._baseUrl()}/sobjects/User/${userCreateResult.id}/password`;

                const passwordResetResult: any = await limiter.schedule(() =>
                    connTargetOrg.tooling.request({
                        method: 'DELETE',
                        url,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

                SFPLogger.log(
                    COLOR_SUCCESS(`Password reset sent successfully. An email is send to initiate the reset process`),
                    LoggerLevel.INFO
                );
            }

            return {
                lastName: user.LastName,
                firstName: user.FirstName,
                username: isTargetUserPasswordReset? defaultUsername: user.UserName,
                email: user.Email,
                isTargetUserPasswordReset: isTargetUserPasswordReset,
            };
        } catch (error) {
            SFPLogger.log(COLOR_ERROR(`\nUser creation is failed! due to ${error}`), LoggerLevel.INFO);
            throw messages.createError('error.Default', [error.message]);
        }
    }
}
