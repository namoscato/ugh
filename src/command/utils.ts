import github from '../github';
import { Repository, Version } from './input';

/**
 * Returns the lineage branch for the specified version
 */
export async function getBranch(repository: Repository, version: Version, branchQualifier: string = '') {
    try {
        return await github.gitdata.getReference({
            owner: repository.getOwner(),
            ref: `heads/${version}`,
            repo: repository.getRepository(),
        });
    } catch (e) {
        throw new Error(`${branchQualifier} branch lineage ${version} does not exist`);
    }
}
