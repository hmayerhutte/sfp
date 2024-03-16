import FHTAnalyser from './FHTAnalyzer';
import FTAnalyser from './FTAnalyzer';
import { PackageAnalyzer } from './PackageAnalyzer';
import PicklistAnalyzer from './PicklistAnalyzer';
import PostDestructiveChangeAnalyzer from './PostDestructiveChangeAnalyzer';
import PreDestructiveChangeAnalyzer from './PreDestructiveChangeAnalyzer';

export class AnalyzerRegistry {
    static getAnalyzers(): PackageAnalyzer[] {
        let packageAnalyzers: PackageAnalyzer[] = [];

        //TODO: Make dynamic
        let fhtAnalyzer = new FHTAnalyser();
        let ftAnalyser = new FTAnalyser();
        let picklistAnalyzer = new PicklistAnalyzer();
        let preDestructiveChangeAnalyzer = new PreDestructiveChangeAnalyzer();
        let postDestructiveChangeAnalyzer = new PostDestructiveChangeAnalyzer();
        packageAnalyzers.push(fhtAnalyzer);
        packageAnalyzers.push(ftAnalyser);
        packageAnalyzers.push(picklistAnalyzer);
        packageAnalyzers.push(preDestructiveChangeAnalyzer);
        packageAnalyzers.push(postDestructiveChangeAnalyzer);
        return packageAnalyzers;
    }
}
