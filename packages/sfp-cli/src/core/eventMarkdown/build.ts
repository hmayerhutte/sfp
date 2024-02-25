import { BuildHookSchema, PATH } from './../eventStream/types'
import fs from 'fs'
import { Align, getMarkdownTable } from "markdown-table-ts";

export class BuildJobMarkdown {
  public static async run(schema: BuildHookSchema): Promise<void> {
    let markdownFile = `### :package:  <mark>sfp</mark>  orchestrator:build has finished! \n\n`;
    if(schema.payload.failed == 0){
        markdownFile += `#### :clap: Congratulations. The job was succesfully :rocket: \n\n`;
    } else {
        markdownFile += `#### :boom: The job has failed. :disappointed_relieved: Please check error details. :point_up: \n\n`;
    }
    markdownFile += `#### Please check build headers :point_down:\n\n`;

    const headerTable = getMarkdownTable({
        table: {
          head:
          ['Event Type', 'Job Id','DevHub Alias'],
          body: [
            [schema.eventType, schema.jobId, schema.devhubAlias],
          ],
        },
        alignment: [Align.Left, Align.Center, Align.Right],
    });


    markdownFile += headerTable + "\n\n";

    markdownFile += `#### And here are the build details :point_down:\n\n`;

    const buildTable = getMarkdownTable({
        table: {
          head:
          ['Package', 'Type', 'Version','Status'],
          body: Object.entries(schema.payload.events).map(([key, value]) => {
            return [key, value.metadata.type, value.metadata.versionNumber, value.event.includes('success') ? ':white_check_mark:' : ':x:' ];
          })
        },
        alignment: [Align.Left, Align.Center, Align.Right],
    });

    markdownFile += buildTable + "\n\n";

    if(schema.payload.failed > 0){
        markdownFile += `> ####:warning: Error Details :warning: \n\n`;
        Object.entries(schema.payload.events).forEach(([key, value]) => {
            if(value.event.includes('error')){
                markdownFile += `> #####${key} \n`;
                markdownFile += `> - ${value.metadata.message} \n`;
            }
        });
    }

    if (!fs.existsSync(PATH.DEFAULT)) {
        fs.mkdirSync(PATH.DEFAULT);
    }
        fs.writeFileSync(PATH.BUILD_MD, markdownFile, 'utf-8');
  }
}
