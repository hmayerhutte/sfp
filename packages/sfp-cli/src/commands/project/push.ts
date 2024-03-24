import SFPLogger, {
    LoggerLevel,
    COLOR_HEADER,
    COLOR_SUCCESS,
    COLOR_INFO,
    COLOR_ERROR,
    COLOR_TRACE,
    COLOR_WARNING,
} from '@flxbl-io/sfp-logger';
import { Messages, SfError, NamedPackageDir, SfProject } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../SfpCommand';
import { loglevel, requiredUserNameFlag } from '../../flags/sfdxflags';
import Table from 'cli-table3';
import { ComponentSet, DeployDetails, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import Bottleneck from 'bottleneck';
import dedent from 'dedent';

type DeployError = {
    LineNumber?: string;
    Name?: string;
    Type?: string;
    Status?: string;
    Message?: string;
};

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('@flxbl-io/sfp', 'project_push');

export default class ProjectPush extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresUsername = true;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfp project:push --path src/core -o myTargetOrg'];

    public static flags = {
        package: Flags.string({
            char: 'p',
            summary: messages.getMessage('flags.package.summary'),
            exclusive: ['path', 'domain'],
        }),
        domain: Flags.string({
            char: 'd',
            summary: messages.getMessage('flags.domain.summary'),
            exclusive: ['path', 'package'],
        }),
        'source-path': Flags.string({
            char: 's',
            summary: messages.getMessage('flags.path.summary'),
            exclusive: ['package', 'domain'],
        }),
        requiredUserNameFlag,
        loglevel,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: project push'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const { flags } = await this.parse(ProjectPush);

        const projectJson = (await SfProject.resolve()).getSfProjectJson();
        const packageDirs: NamedPackageDir[] = projectJson.getUniquePackageDirectories();
        let componentPath = '';

        if (flags.package) {
            const currentPackage: NamedPackageDir = packageDirs.find((pck) => pck.package === flags.package);
            if (!currentPackage) {
                throw new SfError(
                    COLOR_ERROR(`Package ${flags.package} not found in sfdx-project.json`),
                    'PACKAGE_NOT_FOUND'
                );
            }
            SFPLogger.log(`${COLOR_INFO.cyanBright('Push strategy: ')}${COLOR_INFO('Package')}`, LoggerLevel.INFO);
            SFPLogger.log(`${COLOR_INFO.cyanBright('Package: ')}${COLOR_INFO(flags.package)}`, LoggerLevel.INFO);
            SFPLogger.log(
                `${COLOR_INFO.cyanBright('Path: ')}${COLOR_INFO(path.normalize(currentPackage.path))}`,
                LoggerLevel.INFO
            );
            componentPath = path.normalize(currentPackage.path);
        } else if (flags.domain) {
            SFPLogger.log(`${COLOR_INFO.cyanBright('Push strategy: ')}${COLOR_INFO('Domain')}`, LoggerLevel.INFO);
            SFPLogger.log(`${COLOR_INFO.cyanBright('Domain: ')}${COLOR_INFO(flags.domain)}`, LoggerLevel.INFO);
            const domainPath = await this.findSubfolderByName(path.join(process.cwd(), 'src'), flags.domain);
            if (!domainPath) {
                throw new SfError(COLOR_ERROR(`Domain ${flags.domain} not found in "src" folder`), 'DOMAIN_NOT_FOUND');
            }
            SFPLogger.log(
                `${COLOR_INFO.cyanBright('Path: ')}${COLOR_INFO(path.normalize(domainPath))}`,
                LoggerLevel.INFO
            );
            componentPath = path.normalize(domainPath);
        } else if (flags['source-path']) {
            SFPLogger.log(`${COLOR_INFO.cyanBright('Push strategy: ')}${COLOR_INFO('Path')}`, LoggerLevel.INFO);
            SFPLogger.log(`${COLOR_INFO.cyanBright('Path: ')}${COLOR_INFO(flags['source-path'])}`, LoggerLevel.INFO);
            componentPath = path.normalize(flags['source-path']);
        }

        const limiter = new Bottleneck({
            maxConcurrent: 1,
        });

        // we need a retry mechanism for the ENOTFOUND error

        limiter.on('failed', async (error, jobInfo) => {
            if (jobInfo.retryCount < 5 && error.message.includes('ENOTFOUND')) {
                return 5000;
            } else if (jobInfo.retryCount >= 5 && error.message.includes('ENOTFOUND')) {
                throw new SfError(dedent(COLOR_ERROR(`Retry limit exceeded (25 seconds). Unable to start push because domain was not found.
                Please check the domain and try again later.`)), 'PUSH_FAILED');
            } else {
                throw new SfError(COLOR_ERROR(error?.message), 'PUSH_FAILED');
            }
        });

        limiter.on("retry", (error, jobInfo) =>  SFPLogger.log(
            COLOR_WARNING.dim.italic(`Domain was not found. Retrying (${jobInfo.retryCount + 1}/5) after 5 seconds...`),
            LoggerLevel.INFO,
        ));


        await limiter.schedule(async () => await this.deployFromPath(componentPath));

        return {};
    }

    private async deployFromPath(path: string): Promise<void> {
        const deploy: MetadataApiDeploy = await ComponentSet.fromSource(path).deploy({
            usernameOrConnection: this.org.getConnection().getUsername(),
        });
        // Attach a listener to check the deploy status on each poll
        let counter = 0;
        const urlSpinner = ora({
            text: COLOR_TRACE.italic(`Start push for path  ${path}`),
            spinner: 'clock',
        }).start();
        deploy.onUpdate((response) => {
            if (counter === 5) {
                const { status, numberComponentsDeployed, numberComponentsTotal } = response;
                const progress = `${numberComponentsDeployed}/${numberComponentsTotal}`;
                urlSpinner.text = COLOR_TRACE.italic(`Status: ${status} Progress: ${progress}`);
                counter = 0;
            } else {
                counter++;
            }
        });

        deploy.onCancel(() => {
            urlSpinner.fail(COLOR_ERROR(`Push canceled for path ${path}`));
            process.exit(1);
        });

        // Wait for polling to finish and get the DeployResult object
        const res = await deploy.pollStatus();
        if (!res.response.success) {
            urlSpinner.fail(COLOR_ERROR(`Push failed for path ${path} 👇`));
            await this.print(res.response.details);
        } else {
            urlSpinner.succeed(COLOR_SUCCESS(`Push for path ${path} successfully 👌`));
        }
    }

    private async print(input: DeployDetails): Promise<void> {
        var table = new Table({
            head: ['Component Name', 'Error Message'],
            colWidths: [60, 60], // Requires fixed column widths
            wordWrap: true,
        });
        //print deployment errors
        if (
            (Array.isArray(input.componentFailures) && input.componentFailures.length > 0) ||
            (typeof input.componentFailures === 'object' && Object.keys(input.componentFailures).length > 0)
        ) {
            let result: DeployError[] = [];
            if (Array.isArray(input.componentFailures)) {
                result = input.componentFailures.map((a) => {
                    const res: DeployError = {
                        Name: a.fullName,
                        Type: a.componentType,
                        Status: a.problemType,
                        Message: a.problem,
                    };
                    return res;
                });
            } else {
                const res: DeployError = {
                    Name: input.componentFailures.fullName,
                    Type: input.componentFailures.componentType,
                    Status: input.componentFailures.problemType,
                    Message: input.componentFailures.problem,
                };
                result = [...result, res];
            }
            result.forEach((r) => {
                let obj = {};
                obj[r.Name] = r.Message;
                table.push(obj);
            });
            console.log(table.toString());
            throw new SfError(
                COLOR_ERROR(`Push failed. Please check error messages from table and fix this issues from path.`),
                'PUSH_FAILED'
            );
            // print test run errors
        } else if (
            (input.runTestResult &&
                input.runTestResult.failures &&
                Array.isArray(input.runTestResult.failures) &&
                input.runTestResult.failures.length > 0) ||
            (input.runTestResult &&
                typeof input.runTestResult.failures === 'object' &&
                Object.keys(input.runTestResult.failures).length > 0)
        ) {
            let tableTest = new Table({
                head: ['Apex Class', 'Message', 'Stack Trace'],
                colWidths: [60, 60, 60], // Requires fixed column widths
                wordWrap: true,
            });
            if (Array.isArray(input.runTestResult.failures)) {
                input.runTestResult.failures.forEach((a) => {
                    tableTest.push([a.name, a.message, a.stackTrace]);
                });
            } else {
                tableTest.push([
                    input.runTestResult.failures.name,
                    input.runTestResult.failures.message,
                    input.runTestResult.failures.stackTrace,
                ]);
            }
            console.log(tableTest.toString());
            throw new SfError(
                `Testrun failed. Please check the testclass errors from table and fix this issues from package.`
            );
            // print code coverage error
        } else {
            throw new SfError(
                `Validation failed. No errors in the response. Please validate manual and check the errors on org (setup -> deployment status).`
            );
        }
    }

    private async findSubfolderByName(rootPath: string, targetFolderName: string): Promise<string | null> {
        const dirsToSearch: string[] = [rootPath];

        while (dirsToSearch.length > 0) {
            const currentDir = dirsToSearch.shift()!;
            const files = fs.readdirSync(currentDir);

            for (const file of files) {
                const filePath = path.join(currentDir, file);
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    if (file === targetFolderName) {
                        return filePath; // Found the target folder
                    } else {
                        // Add subdirectories to the list of directories to search
                        dirsToSearch.push(filePath);
                    }
                }
            }
        }

        return null; // Target folder not found
    }
}
