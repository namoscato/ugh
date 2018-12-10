import github from './../github';
import { getBranch, IInput, validateInput } from './utils';

export default function (vorpal) {
    const input: Partial<IInput> = {};

    vorpal
        .command('release:cleanup <repository> <version>')
        .option('--previous <previous>', 'Optional previous version used during major releases')
        .option('--no-interaction', 'Do not ask any interactive questions')
        .description('Deprecate the previous branch lineage for the specified release version')
        .validate(validateInput(input))
        .action(async function () {
            const newVersion = input.release.getVersion();
            const oldVersion = input.release.getPreviousVersion();

            this.log(`Initiating ${oldVersion}...${newVersion} release cleanup`);

            this.log(`Ensuring branch ${oldVersion} exists`);
            await getBranch(input.repository, oldVersion, 'Previous');

            this.log(`Ensuring branch ${newVersion} exists`);
            await getBranch(input.repository, newVersion, 'New');

            const owner = input.repository.getOwner();
            const repo = input.repository.getRepository();

            this.log(`Fetching pull requests affected by ${oldVersion} -> ${newVersion}`);

            const pullRequests = await github.pullRequests.getAll({
                owner,
                repo,
                per_page: 100,
            }).then(response => response.data);

            const affectedPullRequests = pullRequests.filter((pullRequest) => {
                return oldVersion.equals(pullRequest.base.ref as string);
            });

            if (input.interaction) {
                const promptResponse = await this.prompt({
                    default: false, // tslint:disable-next-line:prefer-template
                    message: `Are you sure you want to deprecate lineage ${oldVersion}? This will:\n\n` +
                        // tslint:disable-next-line:max-line-length
                        `\t1. Update the base branch of ${affectedPullRequests.length} pull request${1 === affectedPullRequests.length ? '' : 's'}\n` +
                        `\t2. Delete ${oldVersion}\n\n` +
                        'Proceed?',
                    name: 'proceed',
                    type: 'confirm',
                });

                if (!promptResponse.proceed) {
                    throw new Error('User aborted action');
                }
            }

            const updatePromises = [];

            affectedPullRequests.forEach((pullRequest) => {
                this.log(`Updating base of #${pullRequest.number} ${pullRequest.title}`);

                updatePromises.push(github.pullRequests.update({
                    owner,
                    repo,
                    base: String(newVersion),
                    number: pullRequest.number,
                }));
            });

            await Promise.all(updatePromises);

            this.log(`Deleting branch ${oldVersion}`);

            return await github.gitdata.deleteReference({
                owner,
                repo,
                ref: `heads/${oldVersion}`,
            });
        });
}
