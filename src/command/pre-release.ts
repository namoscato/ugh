import * as SemVer from 'semver/classes/semver';
import Settings, { IMultipleRepositoryConfiguration } from '../settings';
import Hub from '../hub';

const COMMAND = 'pre-release';

const DEFAULT_BRANCH = 'master'; // TODO: get this dynamically?
const FINALIZE_KEYWORD = 'finalize';

/** set of valid release types */
const RELEASE_TYPES = [
    'patch',
    'minor',
];

class PreReleaseConfiguration implements IMultipleRepositoryConfiguration {
    public repos: string[];
}

interface IPullRequest {
    head: IPullRequestBranch;
    number: number;
    title: string;
    url: string;
}

interface IPullRequestBranch {
    sha: string;
}

export default function preRelease(vorpal): void {
    let type;

    vorpal
        .command(`${COMMAND} <branch> [type]`)
        .description(`Merges pull requests across repositories associated with the specified <branch> and upserts a release of the specified <type> (valid options: ${RELEASE_TYPES.map((t) => `"${t}"`).join(' or ')}, default: "${RELEASE_TYPES[0]}")`)
        .validate((input) => {
            type = input.type || RELEASE_TYPES[0];
            return RELEASE_TYPES.includes(type) ? true : `Invalid release type "${type}"`;
        })
        .action(function action(args) {
            const { branch } = args;
            const config = Settings.get<PreReleaseConfiguration>(COMMAND);
            const isFinalizeStep = (branch === FINALIZE_KEYWORD);

            Settings.getAbsoluteRepositoryPaths(config).forEach((cwd) => {
                let pr;

                // region 1. Find and merge the pull request.
                if (!isFinalizeStep) {
                    this.log(`[${cwd}] Checking if pull request for branch '${branch}' exists`);

                    const prList = Hub.api<IPullRequest[]>(
                        [`repos/{owner}/{repo}/pulls?head={owner}:${branch}&base=${DEFAULT_BRANCH}`],
                        cwd,
                    );

                    if (0 === prList.length) {
                        return;
                    }

                    [pr] = prList;
                    this.log(`[${cwd}] Merging pull request ${pr.url}`);

                    Hub.api(
                        [
                            `repos/{owner}/{repo}/pulls/${pr.number}/merge`,
                            '-X',
                            'PUT',
                            '-F',
                            'merge_method=squash',
                            '-F',
                            `sha=${pr.head.sha}`,
                        ],
                        cwd,
                    );

                    this.log(`[${cwd}] Merged`);
                }
                // endregion

                // region 2. Determine the target release.
                const releaseList = Hub.run(
                    ['release', '-f', '%T', '--exclude-prereleases', '-L', '1'],
                    cwd,
                );

                const previousRelease = releaseList || '1.0.0';
                const semver = new SemVer(previousRelease);
                const newRelease = semver.inc(type);
                // endregion

                // region 3. Determine if the target release has already been created as a draft.
                this.log(`[${cwd}] Checking if release '${newRelease}' exists`);

                const draftReleaseList = Hub.run(
                    ['release', '-f', '%S %t %T', '--exclude-prereleases', '--include-drafts', '-L', '1'],
                    cwd,
                );

                const newReleaseExists = draftReleaseList.startsWith(`draft ${newRelease} `);
                // endregion

                // region 4. If the target release exists as a draft, update it; if not, create it.
                if (newReleaseExists) {
                    this.log(`[${cwd}] Updating release '${newRelease}'`);

                    const tag = draftReleaseList.split(' ')[2];

                    const releaseBody = Hub.run(
                        ['release', 'show', '-f', '%b', tag],
                        cwd,
                    );

                    if (isFinalizeStep) {
                        Hub.run(
                            ['release', 'delete', tag],
                            cwd,
                        );

                        Hub.run(
                            [
                                'release',
                                'create',
                                '-p',
                                '-t',
                                DEFAULT_BRANCH,
                                '-m',
                                newRelease,
                                '-m',
                                releaseBody,
                                newRelease,
                            ],
                            cwd,
                        );
                    } else {
                        Hub.run(
                            [
                                'release',
                                'edit',
                                '-m',
                                '',
                                '-m',
                                `${releaseBody}\n* ${pr.title} #${pr.number}`,
                                tag,
                            ],
                            cwd,
                        );
                    }

                    this.log(`[${cwd}] Updated`);
                } else {
                    if (isFinalizeStep) {
                        throw new Error(`Unable to find release '${newRelease}' to finalize`);
                    }

                    this.log(`[${cwd}] Creating draft release '${newRelease}'`);

                    Hub.run(
                        [
                            'release',
                            'create',
                            '-d',
                            '-t',
                            DEFAULT_BRANCH,
                            '-m',
                            newRelease,
                            '-m',
                            `* ${pr.title} #${pr.number}`,
                            newRelease,
                        ],
                        cwd,
                    );

                    this.log(`[${cwd}] Created`);
                }
                // endregion
            });
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}
