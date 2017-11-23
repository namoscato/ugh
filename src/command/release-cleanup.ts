import * as Promise from 'bluebird';
import github from './../github';
import * as input from './input';

export default function(vorpal) {

    let defaultBranch: string;
    let release: input.Release;
    let repository: input.Repository;

    interface IArguments {
        options: {
            previous?: string;
        };
        repository: string;
        version: string;
    }

    vorpal
        .command('release:cleanup <repository> <version>')
        .option('--previous <previous>', 'Optional previous version used during major releases')
        .description('Deprecate the previous branch lineage for the specified release version')
        .validate((args: IArguments) => {
            try {
                repository = input.Repository.parse(args.repository);
                release = input.Release.parse(args.version, args.options.previous);
                return true;
            } catch (e) {
                return e.message;
            }
        })
        .action(function(args, callback) {
            const newVersion = release.getVersion();
            const oldVersion = release.getPreviousVersion();

            this.log(`Initiating ${oldVersion}...${newVersion} release cleanup`);
            this.log(`Fetching ${repository} default branch`);

            return github.repos.get({
                owner: repository.getOwner(),
                repo: repository.getRepository(),
            }).then((response) => {
                defaultBranch = response.data.default_branch;
                return response;
            }, () => {
                return Promise.reject(`Repository ${repository} does not exist`);
            }).then(() => {
                this.log(`Ensuring branch ${oldVersion} exists`);

                return github.gitdata.getReference({
                    owner: repository.getOwner(),
                    ref: `heads/${oldVersion}`,
                    repo: repository.getRepository(),
                }).catch(() => {
                    return Promise.reject(`Previous branch lineage ${oldVersion} does not exist`);
                });
            }).then(() => {
                this.log(`Ensuring branch ${newVersion} exists`);

                return github.gitdata.getReference({
                    owner: repository.getOwner(),
                    ref: `heads/${newVersion}`,
                    repo: repository.getRepository(),
                }).catch(() => {
                    return Promise.reject(`New branch lineage ${newVersion} does not exist`);
                });
            }).then(() => {
                this.log(`Fetching pull requests affected by ${oldVersion} -> ${newVersion}`);

                return github.pullRequests.getAll({
                    owner: repository.getOwner(),
                    per_page: 100,
                    repo: repository.getRepository(),
                }).then((response) => {
                    return response.data;
                });
            }).then((pullRequests) => {
                const affectedPullRequests = pullRequests.filter((pullRequest) => {
                    return oldVersion.equals(pullRequest.base.ref as string);
                });

                return this.prompt({
                    default: false,
                    message: `Are you sure you want to deprecate lineage ${oldVersion}? This will:\n\n` +
                        // tslint:disable-next-line:max-line-length
                        `\t1. Update the base branch of ${affectedPullRequests.length} pull request${1 === affectedPullRequests.length ? '' : 's'}\n` +
                        `\t2. Delete ${oldVersion}\n\n` +
                        'Proceed?',
                    name: 'proceed',
                    type: 'confirm',
                }).then((response) => {
                    return response.proceed ? affectedPullRequests : Promise.reject(null);
                });
            }).then((pullRequests) => {
                const updatePromises = [];

                pullRequests.forEach((pullRequest) => {
                    this.log(`Updating base of #${pullRequest.number} ${pullRequest.title}`);

                    updatePromises.push(github.pullRequests.update({
                        base: String(newVersion),
                        number: pullRequest.number,
                        owner: repository.getOwner(),
                        repo: repository.getRepository(),
                    }));
                });

                return Promise.all(updatePromises).then(() => updatePromises.length);
            }).then((pullRequestCount) => {
                this.log(`Deleting branch ${oldVersion}`);

                return github.gitdata.deleteReference({
                    owner: repository.getOwner(),
                    ref: `heads/${oldVersion}`,
                    repo: repository.getRepository(),
                });
            }).catch((message) => {
                return Promise.reject(new Error(message ? message : 'User aborted action'));
            });
        });
}
