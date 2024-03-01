import { PrepareHookSchema, PATH } from '../eventStream/types'
import fs from 'fs'
import { Align, getMarkdownTable } from "markdown-table-ts";

export class PrepareJobMarkdown {
  public static async run(schema: PrepareHookSchema): Promise<void> {
    let markdownFile = `### :package:  <mark>sfp</mark>  prepare has finished! \n\n`;
    if(schema.payload.failed == 0){
        markdownFile += `#### :clap: Congratulations. The job was succesfully :rocket: \n\n`;
    } else {
        markdownFile += `#### :boom: The job has failed. :disappointed_relieved: Please check error details. :point_up: \n\n`;
    }
    markdownFile += `#### Please check prepare headers :point_down:\n\n`;

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

    markdownFile += `#### And here are the prepare details :point_down:\n\n`;

    const buildTable = getMarkdownTable({
        table: {
          head:
          ['Alias', 'Username', 'Url','Version','Status'],
          body: Object.entries(schema.payload.events).map(([key, value]) => {
            return [key, value.metadata.alias ?? ' ', value.metadata.username ?? ' ',value.metadata.loginURL ? `[Jump to Login](${value.metadata.loginURL} "${value.metadata.loginURL}")`: ' ',value.event.includes('success') ? ':white_check_mark:' : ':x:' ];
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
        fs.writeFileSync(PATH.PREPARE_MD, markdownFile, 'utf-8');
  }
}
