import * as SemVer from 'semver/classes/semver';
import Hub from '../hub';
import settings, { IMultipleRepositoryConfiguration } from '../settings';

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
    url: string;
}

export default function preRelease(vorpal): void {
    let type;

    vorpal
        .command(`${COMMAND} <ticket> [type]`)
        .description(`Merges pull requests across repositories associated with the specified <ticket> and upserts a release of the specified <type> (valid options: ${RELEASE_TYPES.map((t) => `"${t}"`).join(' or ')}, default: "${RELEASE_TYPES[0]}")`)
        .validate((input) => {
            type = input.type || RELEASE_TYPES[0];
            return RELEASE_TYPES.includes(type) ? true : `Invalid release type "${type}"`;
        })
        .action(function action(args) {
            const { ticket } = args;
            const config = settings.get<PreReleaseConfiguration>(COMMAND);
            const isFinalizeStep = (ticket === FINALIZE_KEYWORD);

            settings.getAbsoluteRepositoryPaths(config).forEach((cwd) => {
                let pr;

                if (!isFinalizeStep) {
                    this.log(`[${cwd}] Checking if pull request for ticket '${ticket}' exists`);

                    const prList = Hub.api<IPullRequest[]>(
                        [`repos/{owner}/{repo}/pulls?head={owner}:${ticket}&base=${DEFAULT_BRANCH}`],
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

                const releaseList = Hub.run(
                    ['release', '-f', '%T', '--exclude-prereleases', '-L', '1'],
                    cwd,
                );

                const previousRelease = releaseList || '1.0.0';
                const semver = new SemVer(previousRelease);
                const newRelease = semver.inc(type);

                this.log(`[${cwd}] Checking if release '${newRelease}' exists`);

                const draftReleaseList = Hub.run(
                    ['release', '-f', '%S %t %T', '--exclude-prereleases', '--include-drafts', '-L', '1'],
                    cwd,
                );

                if (draftReleaseList.startsWith(`draft ${newRelease} `)) {
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
            });
        });
}
