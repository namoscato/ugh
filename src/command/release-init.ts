import github from './../github';
import { getBranch, IInput, validateInput } from './utils';

export default function (vorpal) {
    const input: Partial<IInput> = {};

    vorpal
        .command('release:init <repository> <version>')
        .option('--previous <previous>', 'Optional previous version used during major releases')
        .option('--no-interaction', 'Do not ask any interactive questions')
        .description('Initialize the specified release version')
        .validate(validateInput(input))
        .action(async function () {
            const githubClient = github.getClient();
            const newVersion = input.release.getVersion();
            const oldVersion = input.release.getPreviousVersion();

            this.log(`Initializing ${oldVersion}...${newVersion} release`);

            this.log(`Ensuring branch ${oldVersion} exists`);
            await getBranch(input.repository, oldVersion, 'Previous');

            this.log(`Ensuring branch ${newVersion} does not exist`);

            const newBranch = await getBranch(input.repository, newVersion).catch(() => null);

            if (newBranch) {
                throw new Error(`New branch lineage ${newVersion} already exists`);
            }

            const owner = input.repository.getOwner();
            const repo = input.repository.getRepository();

            this.log(`Fetching ${input.repository} default branch`);

            const defaultBranch = await githubClient.repos.get({ owner, repo }).then((response) => {
                return response.data.default_branch;
            });

            if (input.interaction) {
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
            }

            this.log(`Merging ${oldVersion} into ${defaultBranch}`);

            const merge = await githubClient.repos.merge({
                owner,
                repo,
                base: defaultBranch,
                head: oldVersion.toString(),
            }).then(response => response.data);

            let sha: string;

            if (merge) {
                sha = merge.sha;
            } else {
                this.log(`Fetching latest ${defaultBranch} commit`);

                sha = await githubClient.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${defaultBranch}`,
                }).then(response => response.data.object.sha);
            }

            this.log(`Creating branch ${newVersion}`);

            return githubClient.git.createRef({
                owner,
                repo,
                sha,
                ref: `refs/heads/${newVersion}`,
            });
        });
}
