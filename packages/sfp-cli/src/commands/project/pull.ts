import SFPLogger, {
    LoggerLevel,
    COLOR_HEADER,
    COLOR_SUCCESS,
    COLOR_INFO,
    COLOR_ERROR,
    COLOR_TRACE,
    COLOR_WARNING,
    COLOR_KEY_MESSAGE,
} from '@flxbl-io/sfp-logger';
import { Messages, SfError, NamedPackageDir, SfProject } from '@salesforce/core';
import { Flags } from '@oclif/core';
import SfpCommand from '../../SfpCommand';
import { loglevel, requiredUserNameFlag } from '../../flags/sfdxflags';
import Table from 'cli-table3';
import { ComponentSet, RetrieveMessage, FileProperties, MetadataApiRetrieve } from '@salesforce/source-deploy-retrieve';
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

const messages = Messages.loadMessages('@flxbl-io/sfp', 'project_pull');

export default class ProjectPull extends SfpCommand {
    public static description = messages.getMessage('commandDescription');

    protected static requiresUsername = true;
    protected static requiresProject = false;
    public static enableJsonFlag = true;

    public static examples = ['$ sfp project:pull -o myTargetOrg'];

    public static flags = {
        package: Flags.string({
            char: 'p',
            summary: messages.getMessage('flags.package.summary'),
            exclusive: ['source-path', 'domain'],
        }),
        domain: Flags.string({
            char: 'd',
            summary: messages.getMessage('flags.domain.summary'),
            exclusive: ['source-path', 'package'],
        }),
        'source-path': Flags.string({
            char: 's',
            summary: messages.getMessage('flags.path.summary'),
            exclusive: ['package', 'domain'],
        }),
        merge: Flags.boolean({
            char: 'm',
            summary: messages.getMessage('flags.merge.summary'),
            exclusive: ['package', 'domain'],
            default: true,
        }),
        'retrieve-path': Flags.string({
            char: 'r',
            summary: messages.getMessage('flags.output.summary'),
        }),
        requiredUserNameFlag,
        loglevel,
    };

    public async execute(): Promise<any> {
        if (this.flags.json) {
            SFPLogger.disableLogs();
        }
        SFPLogger.log(COLOR_HEADER('command: project pull'));
        SFPLogger.printHeaderLine('', COLOR_HEADER, LoggerLevel.INFO);
        const { flags } = await this.parse(ProjectPull);

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
            SFPLogger.log(`${COLOR_INFO.cyanBright('Pull strategy: ')}${COLOR_INFO('Package')}`, LoggerLevel.INFO);
            SFPLogger.log(`${COLOR_INFO.cyanBright('Package: ')}${COLOR_INFO(flags.package)}`, LoggerLevel.INFO);
            SFPLogger.log(
                `${COLOR_INFO.cyanBright('Path: ')}${COLOR_INFO(path.normalize(currentPackage.path))}`,
                LoggerLevel.INFO
            );
            componentPath = path.normalize(currentPackage.path);
        } else if (flags.domain) {
            SFPLogger.log(`${COLOR_INFO.cyanBright('Pull strategy: ')}${COLOR_INFO('Domain')}`, LoggerLevel.INFO);
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
            SFPLogger.log(`${COLOR_INFO.cyanBright('Pull strategy: ')}${COLOR_INFO('Path')}`, LoggerLevel.INFO);
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
                throw new SfError(dedent(COLOR_ERROR(`Retry limit exceeded (25 seconds). Unable to start retrieve because domain was not found.
                Please check the domain and try again later.`)), 'DEPLOYMENT_FAILED');
            } else {
                throw new SfError(COLOR_ERROR(error?.message), 'DEPLOYMENT_FAILED');
            }
        });

        limiter.on("retry", (error, jobInfo) =>  SFPLogger.log(
            COLOR_WARNING.dim.italic(`Domain was not found. Retrying (${jobInfo.retryCount + 1}/5) after 5 seconds...`),
            LoggerLevel.INFO,
        ));


        await limiter.schedule(async () => await this.pullFromPath(componentPath, flags['retrieve-path']));

        return {};
    }

    private async pullFromPath(path: string, output: string): Promise<void> {
        const retrieve: MetadataApiRetrieve = await ComponentSet.fromSource(path).retrieve({
            usernameOrConnection: this.org.getConnection().getUsername(),
            output: output ?? path,
            merge: this.flags.merge,
        });
        // Attach a listener to check the deploy status on each poll
        let counter = 0;
        const urlSpinner = ora({
            text: COLOR_TRACE.italic(`Start pull for path  ${path}`),
            spinner: 'clock',
        }).start();
        retrieve.onUpdate((response) => {
            if (counter === 5) {
                const { status, fileProperties } = response;
                let fileCount = 0;
                if(Array.isArray(fileProperties)) { 
                    fileCount = fileProperties.length;
                } else if(typeof fileProperties === 'object') {
                    fileCount = 1;
                }
                urlSpinner.text = COLOR_TRACE.italic(`Status: ${status} Pulled: ${fileCount} files`);
                counter = 0;
            } else {
                counter++;
            }
        });

        retrieve.onError((error) => {
            urlSpinner.fail(COLOR_ERROR(`Pull failed for path ${path}`));
            throw new SfError(COLOR_ERROR(error?.message));
        });

        retrieve.onCancel(() => {
            urlSpinner.fail(COLOR_ERROR(`Pull canceled for path ${path}`));
            process.exit(1);
        });

        // Wait for polling to finish and get the DeployResult object
        const res = await retrieve.pollStatus();
        if (!res.response.success) {
            urlSpinner.fail(COLOR_ERROR(`Pull failed for path ${path} 👇`));
            await this.printProblem(res.response.messages);
        } else {
            urlSpinner.succeed(COLOR_SUCCESS(`Pull for path ${path} successfully 👌. Here the details 👇`));
            await this.printFiles(res.response.fileProperties);
        }
    }

    private async printProblem(input: RetrieveMessage[] | RetrieveMessage): Promise<void> {
        var table = new Table({
            head: ['File Name', 'Problem'],
            colWidths: [60, 60], // Requires fixed column widths
            wordWrap: true,
        });
        //print deployment errors
        if (
            (Array.isArray(input) && input.length > 0) ||
            (typeof input === 'object' && Object.keys(input).length > 0)
        ) {
            if (Array.isArray(input)) {
                for (const file of input) {
                    table.push([file.fileName, file.problem]);
                }
            } else {
                table.push([input.fileName, input.problem]);
            }
            
            console.log(table.toString());
            throw new SfError(
                COLOR_ERROR(`Pull failed. Please check problems from table and fix this issues from path.`),
                'PULL_FAILED'
            )
            // print code coverage error
        } else {
            throw new SfError(
                `Pull failed. No errors in the response. Please retrieve again.`
            );
        }
    }

    private async printFiles(input: FileProperties | FileProperties[]): Promise<void> {
        var table = new Table({
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
            head: [COLOR_SUCCESS('Full Name'), COLOR_SUCCESS('Type')],
            colWidths: [60, 60], // Requires fixed column widths
            wordWrap: true,
        });
        //print deployment errors
        if (
            (Array.isArray(input) && input.length > 0) ||
            (typeof input === 'object' && Object.keys(input).length > 0)
        ) {
            if (Array.isArray(input)) {
                for (const file of input) {
                    table.push([file.fullName, file.type]);
                }
            } else {
                table.push([input.fullName, input.type]);
            }
            
            console.log(table.toString());
           
            // print code coverage error
        } else {
            throw new SfError(
                `Pull failed. No errors in the response. Please retrieve again.`
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
