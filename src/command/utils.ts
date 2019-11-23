/* eslint-disable no-param-reassign */
import * as Octokit from '@octokit/rest';
import github from '../github';
import { Release, Repository, Version } from './input';

interface IArguments {
    options: {
        interaction?: boolean;
        previous?: string;
    };
    repository: string;
    version: string;
}

export interface IInput {
    interaction: boolean;
    release: Release;
    repository: Repository;
}

/**
 * Returns the lineage branch for the specified version
 */
export async function getBranch(repository: Repository, version: Version, branchQualifier = ''): Promise<Octokit.Response<Octokit.GitGetRefResponse>> {
    try {
        return await github.getClient().git.getRef({
            owner: repository.getOwner(),
            ref: `heads/${version}`,
            repo: repository.getRepository(),
        }).then((response) => {
            if (response.data instanceof Array) {
                return Promise.reject(null); // eslint-disable-line prefer-promise-reject-errors
            }

            return response;
        });
    } catch (e) {
        throw new Error(`${branchQualifier} branch lineage ${version} does not exist`);
    }
}

/**
 * Returns a function that validates the user input
 */
export function validateInput(input: Partial<IInput>) {
    return function validate(args: IArguments): boolean|string {
        try {
            input.interaction = args.options.interaction;

            if ('undefined' === typeof input.interaction) {
                input.interaction = true;
            }

            input.repository = Repository.parse(args.repository);
            input.release = Release.parse(args.version, args.options.previous);

            return true;
        } catch (e) {
            return e.message;
        }
    };
}
