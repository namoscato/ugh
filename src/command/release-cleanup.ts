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
        .command('release:cleanup <repository> <version>')
        .option('--previous <previous>', 'Optional previous version used during major releases')
        .description('Deprecate the previous branch lineage for the specified release version')
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

            this.log(`Initiating ${oldVersion}...${newVersion} release cleanup`);

            this.log(`Ensuring branch ${oldVersion} exists`);
            await getBranch(repository, oldVersion, 'Previous');

            this.log(`Ensuring branch ${newVersion} exists`);
            await getBranch(repository, newVersion, 'New');

            const owner = repository.getOwner();
            const repo = repository.getRepository();

            this.log(`Fetching pull requests affected by ${oldVersion} -> ${newVersion}`);

            const pullRequests = await github.pullRequests.getAll({
                owner,
                repo,
                per_page: 100,
            }).then(response => response.data);

            const affectedPullRequests = pullRequests.filter((pullRequest) => {
                return oldVersion.equals(pullRequest.base.ref as string);
            });

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

            const updatePromises = [];

            pullRequests.forEach((pullRequest) => {
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
