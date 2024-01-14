import { Command, Flags } from '@oclif/core';
import { StateAggregator, Connection, AuthInfo } from '@salesforce/core';

import SFPLogger, {
    COLOR_ERROR,
    COLOR_HEADER,
    COLOR_KEY_MESSAGE,
    COLOR_SUCCESS,
    COLOR_WARNING,
    COLOR_TRACE,
    LoggerLevel,
} from '@flxblio/sfp-logger';

export type Flow = {
    Id: string;
    VersionNumber: number;
    Status: string;
    MasterLabel: string;
};

export type AggregateResult = {
    expr0: number;
    MasterLabel: string;
};

export default class PackageValidate extends Command {
    static description = 'Delete flow versions from org';

    static examples = ['eon flow delete --label csc_cockpit --behind 2 --alias <org>'];

    static flags = {
        label: Flags.string({ char: 'l', description: 'MasterLabel', exclusive: ['extra-flag'] }),
        orgAlias: Flags.string({ char: 'o', description: 'OrgAlias', required: true }),
        rest: Flags.integer({ char: 'r', description: 'Startpoint to delete versions', required: true }),
        all: Flags.boolean({ char: 'a', description: 'Delete all versions', exclusive: ['label'] }),
    };

    // eslint-disable-next-line complexity
    async run(): Promise<void> {
        SFPLogger.log(COLOR_KEY_MESSAGE('Delete flow version(s)...'));

        const { flags } = await this.parse(PackageValidate);
        const flowCountSet = new Set<string>();
        const flowDeleteSet = new Set<string>();
        const promises: Promise<unknown>[] = [];
        const flowMap = new Map<string, Flow[]>();
        const stateAggregator = await StateAggregator.getInstance();
        const userName = stateAggregator.aliases.resolveUsername(flags.orgAlias);
        const connection = await Connection.create({
            authInfo: await AuthInfo.create({ username: userName }),
        });

        SFPLogger.log(COLOR_HEADER(`🧐 Fetch package versions for username ${userName}`), LoggerLevel.INFO);
        SFPLogger.log(
            COLOR_TRACE(`First check how many flows have more than ${flags.rest} versions.`),
            LoggerLevel.INFO
        );

        const queryFlowCount = `SELECT COUNT(Id),MasterLabel FROM Flow WHERE ManageableState = 'unmanaged' GROUP BY MasterLabel HAVING COUNT(Id) > ${flags.rest} ORDER BY MasterLabel DESC`;

        const responseFlowCount = await connection.tooling.query<AggregateResult>(queryFlowCount);
        const flowCount =
            responseFlowCount.records && responseFlowCount.records.length > 0 ? responseFlowCount.records : [];

        if (flowCount.length === 0) {
            SFPLogger.log(
                COLOR_WARNING(`👆 No flow versions found on org with more than ${flags.rest} versions. Skip command!`),
                LoggerLevel.INFO
            );
            return;
        }

        for (const flow of flowCount) {
            flowCountSet.add(flow.MasterLabel);
        }

        const query = flags.all
            ? `Select Id,MasterLabel, VersionNumber, Status from Flow where MasterLabel In ('${[
                  ...flowCountSet.values(),
              ].join(`','`)}') And ManageableState = 'unmanaged' Order by VersionNumber desc`
            : `Select Id,MasterLabel, VersionNumber, Status from Flow where MasterLabel = '${flags.label}' And ManageableState = 'unmanaged' Order by VersionNumber desc`;

        const response = await connection.tooling.query<Flow>(query);

        const flowVersions = response.records && response.records.length > 0 ? response.records : [];

        // Loop trough flow and create a map with the MasterLabel as key and the flow as value
        for (const flow of flowVersions) {
            if (flowMap.has(flow.MasterLabel)) {
                flowMap.get(flow.MasterLabel)?.push(flow);
            } else {
                flowMap.set(flow.MasterLabel, [flow]);
            }
        }

        // extra function to add a timeout to avoid too many requests this resoves salesforce lock errors
        async function deleteFlowVersion(id: string) {
            // await a new promise with timeout to avoid too many requests
            // eslint-disable-next-line no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 200));
            await connection.tooling.delete('Flow', id);
        }

        if (flowVersions.length === 0) {
            SFPLogger.log(COLOR_WARNING(`No flow versions found for this settings. Skip command!`), LoggerLevel.INFO);
            return;
        }

        for (const [label, flows] of flowMap) {
            SFPLogger.log(COLOR_TRACE(`👍 Found ${flows.length} flow versions for label ${label}`), LoggerLevel.INFO);
            // First check if a version is active
            const activeFlow = flows.some((flow) => flow.Status === 'Active');
            if (activeFlow)
                SFPLogger.log(
                    COLOR_TRACE(`👉 Found active version. So counter starts behind the active version!`),
                    LoggerLevel.INFO
                );
            else
                SFPLogger.log(
                    COLOR_TRACE(`👆 No active version found. So counter starts from the beginning!`),
                    LoggerLevel.INFO
                );

            let isActive = false;
            let versionCounter = 0;

            for (const flow of flows) {
                // iterate over all flow versions with index and delete them

                if ((activeFlow && flow.Status === 'Active') || !activeFlow) {
                    isActive = true;
                    continue;
                }

                if (isActive) {
                    versionCounter++;
                }

                if (versionCounter > flags.rest) {
                    SFPLogger.log(
                        COLOR_TRACE(`Add flow ${flow.MasterLabel} with flow version ${flow.VersionNumber} to delete list`),
                        LoggerLevel.TRACE
                    );
                    promises.push(deleteFlowVersion(flow.Id));
                    flowDeleteSet.add(flow.MasterLabel);
                }
            }

            // Add a delay after each batch of delete operations
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(promises).then(async () => {
                // Add a delay between batches to avoid lock errors
                // eslint-disable-next-line no-promise-executor-return
                await new Promise((resolve) => setTimeout(resolve, 200));
            });
        }

        if (flowDeleteSet.size === 0) {
            SFPLogger.log(
                COLOR_WARNING(`👆 No flow versions to delete found for this settings. Skip command!`),
                LoggerLevel.INFO
            );
            return;
        }

        SFPLogger.log(COLOR_KEY_MESSAGE('Ready to delete the flow version(s): ⌛️'), LoggerLevel.INFO);
        SFPLogger.log(`Flow(s) to delete: ${[...flowDeleteSet.values()].join(', ')}`, LoggerLevel.INFO);

        await Promise.all(promises)
            .then(() => {
                SFPLogger.log(COLOR_SUCCESS(`✅ Deleted ${flowDeleteSet.size} flows`), LoggerLevel.INFO);
                SFPLogger.log(COLOR_SUCCESS(`Bye bye 👋`));
            })
            .catch((error) => {
                SFPLogger.log(COLOR_ERROR(`👎 Error while deleting flow versions 👇`), LoggerLevel.INFO);
                SFPLogger.log(COLOR_ERROR(error), LoggerLevel.INFO);
                this.exit(1);
            });
    }
}
