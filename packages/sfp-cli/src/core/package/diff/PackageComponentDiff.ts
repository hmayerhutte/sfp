import * as xml2js from 'xml2js';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as rimraf from 'rimraf';
import * as _ from 'lodash';
import simplegit from 'simple-git';
import SFPLogger, { Logger, LoggerLevel } from '@flxbl-io/sfp-logger';
import ProjectConfig from '../../project/ProjectConfig';
import MetadataFiles from '../../metadata/MetadataFiles';
import { SOURCE_EXTENSION_REGEX, MetadataInfo, METADATA_INFO } from '../../metadata/MetadataInfo';
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';
import GitDiffUtils, { DiffFile, DiffFileStatus } from '../../git/GitDiffUtil';

const deleteNotSupported = ['RecordType'];
const git = simplegit();
let sfdxManifest;

export default class PackageComponentDiff {
    private gitDiffUtils: GitDiffUtils;

    destructivePackageObjPre: any[];
    destructivePackageObjPost: any[];
    resultOutput: {
        action: string;
        metadataType: string;
        componentName: string;
        message: string;
        path: string;
    }[];
    public constructor(
        private logger: Logger,
        private sfdxPackage: string,
        private revisionFrom?: string,
        private revisionTo?: string,
        private isDestructive?: boolean
    ) {
        if (this.revisionTo == null || this.revisionTo.trim() === '') {
            this.revisionTo = 'HEAD';
        }
        if (this.revisionFrom == null) {
            this.revisionFrom = '';
        }
        this.destructivePackageObjPost = [];
        this.destructivePackageObjPre = [];
        this.resultOutput = [];

        sfdxManifest = ProjectConfig.getSFDXProjectConfig(null);
        this.gitDiffUtils = new GitDiffUtils();
    }

    public async build(outputFolder: string) {
        rimraf.sync(outputFolder);

        const sepRegex = /\n|\r/;
        let data = '';

        //check if same commit
        const commitFrom = await git.raw(['rev-list', '-n', '1', this.revisionFrom]);
        const commitTo = await git.raw(['rev-list', '-n', '1', this.revisionTo]);
        if (commitFrom === commitTo) {
            throw new Error(`Unable to compute diff, as both commits are same`);
        }
        //Make it relative to make the command works from a project created as a subfolder in a repository
        data = await git.diff([
            '--raw',
            this.revisionFrom,
            this.revisionTo,
            '--relative',
            ProjectConfig.getPackageDescriptorFromConfig(this.sfdxPackage, sfdxManifest).path,
        ]);

        let content = data.split(sepRegex);
        let diffFile: DiffFile = await this.parseContent(content);
        await this.gitDiffUtils.fetchFileListRevisionTo(this.revisionTo, this.logger);

        let filesToCopy = diffFile.addedEdited;
        let deletedFiles = diffFile.deleted;

        deletedFiles = deletedFiles.filter((deleted) => {
            let found = false;
            let deletedMetadata = MetadataFiles.getFullApiNameWithExtension(deleted.path);
            for (let i = 0; i < filesToCopy.length; i++) {
                let addedOrEdited = MetadataFiles.getFullApiNameWithExtension(filesToCopy[i].path);
                if (deletedMetadata === addedOrEdited) {
                    found = true;
                    break;
                }
            }
            return !found;
        });

        if (fs.existsSync(outputFolder) == false) {
            fs.mkdirSync(outputFolder);
        }

        const resolver = new MetadataResolver();

        if (filesToCopy && filesToCopy.length > 0) {
            for (let i = 0; i < filesToCopy.length; i++) {

                try {
                    let filePath = filesToCopy[i].path;

                    let sourceComponents = resolver.getComponentsFromPath(filePath);
                    for (const sourceComponent of sourceComponents) {
                        if (sourceComponent.type.strategies?.adapter == AdapterId.MatchingContentFile) {
                            await this.gitDiffUtils.copyFile(sourceComponent.xml, outputFolder, this.logger);
                            await this.gitDiffUtils.copyFile(sourceComponent.content, outputFolder, this.logger);
                        } else if (sourceComponent.type.strategies?.adapter == AdapterId.MixedContent) {
                            await this.gitDiffUtils.copyFile(sourceComponent.xml, outputFolder, this.logger);
                            if(path.extname(sourceComponent.content))
                              await this.gitDiffUtils.copyFile(sourceComponent.content, outputFolder, this.logger);
                            else
                              await this.gitDiffUtils.copyFolder(sourceComponent.content, outputFolder, this.logger);
                        } else if (sourceComponent.type.strategies?.adapter == AdapterId.Decomposed) {
                            await this.gitDiffUtils.copyFile(sourceComponent.xml, outputFolder, this.logger);
                        } else if (sourceComponent.type.strategies?.adapter == AdapterId.Bundle) {
                            await this.gitDiffUtils.copyFolder(sourceComponent.content, outputFolder, this.logger);
                        } else {
                            await this.gitDiffUtils.copyFile(sourceComponent.xml, outputFolder, this.logger);
                        }
                    }
                } catch (error) {
                    
                   if(error.message.includes(`Unable to find the required file`))
                    throw error;

                    //Metadata resolver is not respecting forceignores at this stage
                    // So it fails on diff packages with post deploy, so lets ignore and move on
                    SFPLogger.log(
                        `Error while inferencing type of  ${filesToCopy[i].path} to ${outputFolder} : ${error.message}`,
                        LoggerLevel.TRACE,
                        this.logger
                    );
                }
            }
        }

       

        //Folder is empty after all this operations, return without copying additional files
        if (fs.readdirSync(outputFolder).length === 0) {
            rimraf.sync(outputFolder);
            return null;
        }

        SFPLogger.log(`Generating output summary`, LoggerLevel.TRACE, this.logger);

        return this.resultOutput;
    }

    //TODO: Refactor using proper ignore
    private checkForIngore(pathToIgnore: any[], filePath: string) {
        pathToIgnore = pathToIgnore || [];
        if (pathToIgnore.length === 0) {
            return true;
        }

        let returnVal = true;
        pathToIgnore.forEach((ignore) => {
            if (
                path.resolve(ignore) === path.resolve(filePath) ||
                path.resolve(filePath).includes(path.resolve(ignore))
            ) {
                returnVal = false;
            }
        });
        return returnVal;
    }



  

    private async parseContent(fileContents): Promise<DiffFile> {
        const statusRegEx = /\sA\t|\sM\t|\sD\t/;
        const renamedRegEx = /\sR[0-9]{3}\t|\sC[0-9]{3}\t/;
        const tabRegEx = /\t/;
        const deletedFileRegEx = new RegExp(/\sD\t/);
        const lineBreakRegEx = /\r?\n|\r|( $)/;

        let metadataFiles = new MetadataFiles();

        let diffFile: DiffFile = {
            deleted: [],
            addedEdited: [],
        };

        for (let i = 0; i < fileContents.length; i++) {
            if (statusRegEx.test(fileContents[i])) {
                let lineParts = fileContents[i].split(statusRegEx);

                let finalPath = path.join('.', lineParts[1].replace(lineBreakRegEx, ''));
                finalPath = finalPath.trim();
                finalPath = finalPath.replace('\\303\\251', 'é');

                if (!(await metadataFiles.isInModuleFolder(finalPath))) {
                    continue;
                }

                if (!metadataFiles.accepts(finalPath)) {
                    continue;
                }

                let revisionPart = lineParts[0].split(/\t|\s/);

                if (deletedFileRegEx.test(fileContents[i])) {
                    //Deleted
                    diffFile.deleted.push({
                        revisionFrom: revisionPart[2].substring(0, 9),
                        revisionTo: revisionPart[3].substring(0, 9),
                        path: finalPath,
                    });
                } else {
                    // Added or edited
                    diffFile.addedEdited.push({
                        revisionFrom: revisionPart[2].substring(0, 9),
                        revisionTo: revisionPart[3].substring(0, 9),
                        path: finalPath,
                    });
                }
            } else if (renamedRegEx.test(fileContents[i])) {
                let lineParts = fileContents[i].split(renamedRegEx);

                let paths = lineParts[1].trim().split(tabRegEx);

                let finalPath = path.join('.', paths[1].trim());
                finalPath = finalPath.replace('\\303\\251', 'é');
                let revisionPart = lineParts[0].split(/\t|\s/);

                if (!(await metadataFiles.isInModuleFolder(finalPath))) {
                    continue;
                }

                if (!metadataFiles.accepts(paths[0].trim())) {
                    continue;
                }

                diffFile.addedEdited.push({
                    revisionFrom: '0000000',
                    revisionTo: revisionPart[3],
                    renamedPath: path.join('.', paths[0].trim()),
                    path: finalPath,
                });

                //allow deletion of renamed components
                diffFile.deleted.push({
                    revisionFrom: revisionPart[2],
                    revisionTo: '0000000',
                    path: paths[0].trim(),
                });
            }
        }
        return diffFile;
    }
}
enum AdapterId {
    Bundle = 'bundle',
    Decomposed = 'decomposed',
    Default = 'default',
    MatchingContentFile = 'matchingContentFile',
    MixedContent = 'mixedContent',
}
