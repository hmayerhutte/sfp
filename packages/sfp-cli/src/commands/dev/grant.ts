import { Messages, Org } from '@salesforce/core';
import * as fs from 'fs-extra';
import SFPLogger, { LoggerLevel, Logger, COLOR_KEY_MESSAGE, COLOR_ERROR, COLOR_SUCCESS } from '@flxbl-io/sfp-logger';
import { loglevel, optionalDevHubFlag, requiredUserNameFlag, targetdevhubusername } from '../../flags/sfdxflags';
import SfpCommand from '../../SfpCommand';
import { Flags } from '@oclif/core';
import Ajv from 'ajv';
import path from 'path';
import QueryHelper from '../../core/queryHelper/QueryHelper';
const yaml = require('js-yaml');

export default class Grant extends SfpCommand {
    public static description = 'Grant a developer a specific access level in an environment';

    protected static requiresDevhubUsername = true;

    public static flags = {
        dev: Flags.string({
            required: true,
            description: 'The username of the developer',
        }),
        accesslevel: Flags.string({
            char: 'a',
            exclusive: ['useDefault'],
            description: 'The access level to be be granted to the developer',
        }),
        devConfig: Flags.string({
            char: 'f',
            required: true,
            description: 'The path to the dev configuration file',
            default: 'config/devconfig.yml',
        }),
        useDefault: Flags.boolean({
            char: 'd',
            exclusive: ['accesslevel'],
            description: 'Use the default access level defined in the configuration,useful for de-elevation',
        }),
        targetorg: requiredUserNameFlag,
        loglevel,
    };

    public async execute() {
        SFPLogger.log('command: dev grant', LoggerLevel.INFO);
        let org: Org = await Org.create({ aliasOrUsername: this.flags.targetorg });

         // Ensure exclusivity between accesslevel and useDefault flags
         if (this.flags.accesslevel && this.flags.useDefault) {
            throw new Error("Specify either 'accesslevel' or '--use-default', not both.");
        } else if (!this.flags.accesslevel && !this.flags.useDefault) {
            throw new Error("Specify either 'accesslevel' or '--use-default'.");
        }

        // Determine the access level based on the provided flags
        let accessLevel = this.flags.accesslevel; // Default to the provided access level, if any
        let fullConfig = yaml.load(fs.readFileSync(this.flags.devConfig, { encoding: 'utf-8' }));
        if (!fullConfig.devconfig) {
            throw new Error("The 'devconfig' key is missing in the configuration file.");
        }
        let devConfig: DeveloperConfiguration = fullConfig.devconfig;
        this.validateDevConfig(devConfig);
        if (this.flags.useDefault) {
            SFPLogger.log('Using default access level from configuration', LoggerLevel.INFO);
            accessLevel = devConfig.defaultAccessLevel;
        }

        SFPLogger.log('Org: ' + org.getUsername(), LoggerLevel.INFO);
        SFPLogger.log('Developer: ' + this.flags.dev, LoggerLevel.INFO);
        SFPLogger.log(`Acces Level: ${accessLevel}`, LoggerLevel.INFO);
        SFPLogger.log('Dev Config: ' + this.flags.devConfig, LoggerLevel.INFO);


        // Ensure the 'devconfig' key exists
        if (!fullConfig.devconfig) {
            throw new Error("The 'devconfig' key is missing in the configuration file.");
        }

       

        this.validateDevConfig(devConfig);
        const accessLevelConfig = this.checkAccessLevelAvailability(devConfig, accessLevel);
        await this.updateUserProfile(org, accessLevelConfig.profile, this.flags.dev, accessLevelConfig.settings);
        await this.assignPermissionSetLicenses(org, this.flags.dev, accessLevelConfig.permissionSetLicenses);
        await this.assignPermissionSets(org, this.flags.dev, accessLevelConfig.permissionSets);
        await this.assignPermissionSetGroups(org, this.flags.dev, accessLevelConfig.permissionSetGroups);
        SFPLogger.log(
            COLOR_SUCCESS(`Access level '${accessLevel}' granted to developer '${this.flags.dev}'`),
            LoggerLevel.INFO
        );
    }

    async updateUserProfile(org: Org, profileName, username, settings: Array<{ [key: string]: any }>) {
        const conn = org.getConnection(); // Get the Salesforce connection from the org

        try {
            // Step 1: Retrieve the ProfileId using the profile name
            const profiles = await QueryHelper.query<any>(
                `SELECT Id FROM Profile WHERE Name = '${profileName}'`,
                conn,
                false
            );
            if (profiles.length === 0) {
                throw new Error('Profile not found');
            }
            const profileId = profiles[0].Id;

            // Step 2: Retrieve the UserId using the username
            const users = await QueryHelper.query<any>(
                `SELECT Id FROM User WHERE Username = '${username}'`,
                conn,
                false
            );
            if (users.length === 0) {
                throw new Error('User not found');
            }
            const userId = users[0].Id;

            // Step 3: Update the user's ProfileId
            let userUpdateObj: { Id: string; ProfileId: string; [key: string]: any } = {
                Id: userId,
                ProfileId: profileId,
            };

            // Apply settings from the access level configuration
            settings?.forEach((setting) => {
                // Since each setting is an object with a single key-value pair, extract that pair and apply it to the userUpdateObj
                const [key, value] = Object.entries(setting)[0]; // Extract the first key-value pair from the setting object
                userUpdateObj[key] = value; // Apply the setting to the user update object
            });

            const updateResult = await conn.sobject('User').update(userUpdateObj);

            if (!updateResult.success) {
                throw new Error('Failed to update user profile');
            }
        } catch (error) {
            console.error(error.message);
        }
    }

    private validateDevConfig(devconfig: DeveloperConfiguration): void {
        let schema = fs.readJSONSync(
            path.join(__dirname, '..', '..', '..', 'resources', 'schemas', 'devconfig.schema.json'),
            { encoding: 'UTF-8' }
        );

        let validator = new Ajv({ allErrors: true }).compile(schema);
        let validationResult = validator(devconfig);

        if (!validationResult) {
            let errorMsg: string =
                `Dev Config provided does not meet schema requirements, ` +
                `found ${validator.errors.length} validation errors:\n`;

            validator.errors.forEach((error, errorNum) => {
                errorMsg += `\n${errorNum + 1}: ${error.instancePath}: ${error.message} ${JSON.stringify(
                    error.params,
                    null,
                    4
                )}`;
            });

            throw new Error(errorMsg);
        }
    }

    private checkAccessLevelAvailability(devConfig: DeveloperConfiguration, grant: string): AccessLevelConfig {
        const accessLevelConfig = devConfig.accessLevels[grant];
        if (!accessLevelConfig) {
            throw new Error(`Access level '${grant}' not found in the developer configuration.`);
        }
        return accessLevelConfig;
    }

    async applyUserSettings(org: Org, username: string, settings: { [key: string]: any }) {
        const conn = org.getConnection(); // Get the Salesforce connection from the org

        try {
            // Retrieve the UserId using the username
            const users = await QueryHelper.query<any>(
                `SELECT Id FROM User WHERE Username = '${username}'`,
                conn,
                false
            );
            if (users.length === 0) {
                throw new Error('User not found');
            }
            const userId = users[0].Id;

            // Prepare the settings with the user Id
            const userSettings = { Id: userId, ...settings };

            // Update the user settings
            const updateResult = await conn.sobject('User').update(userSettings);
            if (!updateResult.success) {
                throw new Error('Failed to update user settings');
            }
            console.log('User settings updated successfully');
        } catch (error) {
            console.error(error.message);
        }
    }

    async assignPermissionSets(org, username, permissionSets:string[]) {
        const conn = org.getConnection(); // Get the Salesforce connection from the org

        if(!permissionSets || permissionSets.length==0) 
        return;
        try {
            // Retrieve the UserId using the username
            const users = await QueryHelper.query<any>(
                `SELECT Id FROM User WHERE Username = '${username}'`,
                conn,
                false
            );
            if (users.length === 0) {
                throw new Error('User not found');
            }
            const userId = users[0].Id;

            for (const permissionSet of permissionSets) {
                try {
                    // Retrieve the PermissionSetId using the permission set name
                    const permissionSetsResult = await QueryHelper.query<any>(
                        `SELECT Id FROM PermissionSet WHERE Name = '${permissionSet}' OR Label = '${permissionSet}'`,
                        conn,
                        false
                    );
                    if (permissionSetsResult.length === 0) {
                        throw new Error(`Permission set ${permissionSet} not found`);
                    }
                    const permissionSetId = permissionSetsResult[0].Id;

                    // Assign the permission set to the user
                    const assignmentResult = await conn.sobject('PermissionSetAssignment').create({
                        AssigneeId: userId,
                        PermissionSetId: permissionSetId,
                    });
                    if (!assignmentResult.success) {
                        throw new Error(`Failed to assign permission set ${COLOR_ERROR(permissionSet)}`);
                    }
                    console.log(`Permission set '${COLOR_KEY_MESSAGE(permissionSet)}' assigned to user '${username}'`);
                } catch (error) {
                    SFPLogger.log(error.message,LoggerLevel.ERROR)
                }
            }
        } catch (error) {
            SFPLogger.log(`Error in processing user ${username}: ${error.message}`,LoggerLevel.ERROR);
        }
    }

    async assignPermissionSetLicenses(org, username, permissionSetLicenses:string[]) {
        const conn = org.getConnection();
        if(!permissionSetLicenses || permissionSetLicenses.length==0) 
            return;

        try {
            const users = await QueryHelper.query<any>(
                `SELECT Id FROM User WHERE Username = '${username}'`,
                conn,
                false
            );
            if (users.length === 0) throw new Error('User not found');
            const userId = users[0].Id;

            for (const license of permissionSetLicenses) {
                try {
                    const licenses = await QueryHelper.query<any>(
                        `SELECT Id FROM PermissionSetLicense WHERE MasterLabel = '${license}'`,
                        conn,
                        false
                    );
                    if (licenses.length === 0) throw new Error(`License ${COLOR_ERROR(license)}  not found`);
                    const licenseId = licenses[0].Id;

                    const assignmentResult = await conn.sobject('PermissionSetLicenseAssign').create({
                        AssigneeId: userId,
                        PermissionSetLicenseId: licenseId,
                    });
                    if (!assignmentResult.success) throw new Error(`Failed to assign license ${COLOR_ERROR(license)}`);
                    console.log(`License '${COLOR_KEY_MESSAGE(license)}' assigned to user '${username}'`);
                } catch (error) {
                   SFPLogger.log(error.message,LoggerLevel.ERROR)
                }
            }
        } catch (error) {
            SFPLogger.log(`Error in processing user ${username}: ${error.message}`,LoggerLevel.ERROR);
        }
    }

    async assignPermissionSetGroups(org, username, permissionSetGroups:string[]) {
        const conn = org.getConnection();
        if(!permissionSetGroups || permissionSetGroups.length==0) 
          return;

        try {
            const users = await QueryHelper.query<any>(
                `SELECT Id FROM User WHERE Username = '${username}'`,
                conn,
                false
            );
            if (users.length === 0) throw new Error('User not found');
            const userId = users[0].Id;

            for (const group of permissionSetGroups) {
                try {
                    const groups = await QueryHelper.query<any>(
                        `SELECT Id FROM PermissionSetGroup WHERE DeveloperName = '${group}' OR MasterLabel = '${group}'`,
                        conn,
                        false
                    );
                    if (groups.length === 0) throw new Error(`Permission Set Group ${group} not found`);
                    const groupId = groups[0].Id;

                    const assignmentResult = await conn.sobject('PermissionSetAssignment').create({
                        AssigneeId: userId,
                        PermissionSetGroupId: groupId,
                    });
                    if (!assignmentResult.success) throw new Error(`Failed to assign Permission Set Group ${group}`);
                    console.log(`Permission Set Group ${COLOR_KEY_MESSAGE(group)} assigned to user '${username}'`);
                } catch (error) {
                    SFPLogger.log(error.message,LoggerLevel.ERROR)
                }
            }
        } catch (error) {
              SFPLogger.log(`Error in processing user ${username}: ${error.message}`,LoggerLevel.ERROR);
        }
    }
}

interface AccessLevelConfig {
    profile: string; // The profile assigned for this access level.
    permissionSets?: string[]; // Optional permission sets for this access level.
    permissionSetLicenses?: string[]; // Optional permission set licenses for this access level.
    permissionSetGroups?: string[]; // Optional permission set groups for this access level.
    duration?: number; // Optional maximum duration (in hours) granted for this access level.
    settings?: { [key: string]: boolean }[]; // Optional additional settings for this access level.
}

interface DeveloperConfiguration {
    accessLevels: {
        [levelName: string]: AccessLevelConfig; // Dynamic access level keys
    };
    defaultAccessLevel: string; // The default access level for developers
    [key: string]: any; // Additional arbitrary properties at the top level
}
