import { ReleaseHookSchema, PATH } from '../eventStream/types'
import fs from 'fs'
import { Align, getMarkdownTable } from "markdown-table-ts";

export class DeployJobMarkdown {
  public static async run(schema: ReleaseHookSchema): Promise<void> {
    let markdownFile = `### :package:  <mark>sfp</mark>  deploy has finished! \n\n`;
    if(schema.payload.failed == 0){
        markdownFile += `#### :clap: Congratulations. The job was succesfully :rocket: \n\n`;
    } else {
        markdownFile += `#### :boom: The job has failed. :disappointed_relieved: Please check error details. :point_up: \n\n`;
    }
    markdownFile += `#### Please check deploy headers :point_down:\n\n`;

    const headerTable = getMarkdownTable({
        table: {
          head:
          ['Event Type', 'Job Id','Instance Url'],
          body: [
            [schema.eventType, schema.jobId, schema.payload.instanceUrl],
          ],
        },
        alignment: [Align.Left, Align.Center, Align.Right],
    });


    markdownFile += headerTable + "\n\n";

    markdownFile += `#### And here are the deploy details :point_down:\n\n`;

    const buildTable = getMarkdownTable({
        table: {
          head:
          ['Package', 'Type', 'Id','Version','Status'],
          body: Object.entries(schema.payload.events).map(([key, value]) => {
            return [key, value.metadata.type ?? ' ', value.metadata.versionId ?? ' ',value.metadata.targetVersion ?? ' ',value.event.includes('success') ? ':white_check_mark:' : ':x:' ];
          })
        },
        alignment: [Align.Left, Align.Center, Align.Right],
    });

    markdownFile += buildTable + "\n\n";

    if(schema.payload.failed > 0){
        markdownFile += `#### :heavy_exclamation_mark: Error Details :heavy_exclamation_mark: \n`;
        Object.entries(schema.payload.events).forEach(([key, value]) => {
            if(value.event.includes('failed')){
                markdownFile += `##### :point_right: ${key} \n`;
                markdownFile += `${value.metadata.message} \n`;
            }
        });
    }

    if (!fs.existsSync(PATH.DEFAULT)) {
        fs.mkdirSync(PATH.DEFAULT);
    }
        fs.writeFileSync(PATH.DEPLOY_MD, markdownFile, 'utf-8');
  }
}
