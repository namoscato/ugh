import github from './../github';
import { Release, Repository } from './input';
import { getBranch } from './utils';

interface IArguments {
    options: {
        previous?: string;
    };
    repository: string;
    version: string;
}

export default function (vorpal) {
    let release: Release;
    let repository: Repository;

    vorpal
        .command('release:init <repository> <version>')
        .option('--previous <previous>', 'Optional previous version used during major releases')
        .description('Initialize the specified release version')
        .validate((args: IArguments) => {
            try {
                repository = Repository.parse(args.repository);
                release = Release.parse(args.version, args.options.previous);
                return true;
            } catch (e) {
                return e.message;
            }
        })
        .action(async function () {
            const newVersion = release.getVersion();
            const oldVersion = release.getPreviousVersion();

            this.log(`Initializing ${oldVersion}...${newVersion} release`);

            this.log(`Ensuring branch ${oldVersion} exists`);
            await getBranch(repository, oldVersion, 'Previous');

            this.log(`Ensuring branch ${newVersion} does not exist`);

            const newBranch = await getBranch(repository, newVersion).catch(() => null);

            if (newBranch) {
                throw new Error(`New branch lineage ${newVersion} already exists`);
            }

            const owner = repository.getOwner();
            const repo = repository.getRepository();

            this.log(`Fetching ${repository} default branch`);

            const defaultBranch = await github.repos.get({ owner, repo }).then((response) => {
                return response.data.default_branch;
            });

            const promptResponse = await this.prompt({
                default: false, // tslint:disable-next-line:prefer-template
                message: `Are you sure you want to initialize lineage ${newVersion}? This will:\n\n` +
                    // tslint:disable-next-line:max-line-length
                    `\t1. Merge ${oldVersion} into ${defaultBranch}\n` +
                    `\t2. Create ${newVersion}\n\n` +
                    'Proceed?',
                name: 'proceed',
                type: 'confirm',
            });

            if (!promptResponse.proceed) {
                throw new Error('User aborted action');
            }

            this.log(`Merging ${oldVersion} into ${defaultBranch}`);

            const merge = await github.repos.merge({
                base: defaultBranch,
                head: oldVersion.toString(),
                owner: repository.getOwner(),
                repo: repository.getRepository(),
            }).then(response => response.data);

            let sha: string;

            if (merge) {
                sha = merge.sha;
            } else {
                this.log(`Fetching latest ${defaultBranch} commit`);

                sha = await github.gitdata.getReference({
                    owner: repository.getOwner(),
                    ref: `heads/${defaultBranch}`,
                    repo: repository.getRepository(),
                }).then(response => response.data.object.sha);
            }

            this.log(`Creating branch ${newVersion}`);

            return github.gitdata.createReference({
                owner,
                repo,
                sha,
                ref: `refs/heads/${newVersion}`,
            });
        });
}
