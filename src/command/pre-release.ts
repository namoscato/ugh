import { spawnSync } from 'child_process';
import { join } from 'path';
import * as SemVer from 'semver/classes/semver';
import settings from '../settings';

const COMMAND = 'pre-release';

const DEFAULT_BRANCH = 'master'; // TODO: get this dynamically?
const FINALIZE_KEYWORD = 'finalize';

/** set of valid release types */
const RELEASE_TYPES = [
    'patch',
    'minor',
];

class PreReleaseConfiguration {
    public repos: string[];
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
            const isFinalizeStep = ticket === FINALIZE_KEYWORD;

            config.repos.map((dir) => ('~' === dir[0] ? join(process.env.HOME, dir.slice(1)) : dir)).forEach((cwd) => {
                let pr;

                if (!isFinalizeStep) {
                    this.log(`[${cwd}] Checking if pull request for ticket '${ticket}' exists`);

                    const prListCmd = spawnSync(
                        'hub',
                        ['api', `repos/{owner}/{repo}/pulls?head={owner}:${ticket}&base=${DEFAULT_BRANCH}`],
                        { cwd },
                    );

                    if (0 !== prListCmd.status) {
                        throw new Error(prListCmd.stderr.toString());
                    }

                    const prListResponse = JSON.parse(prListCmd.stdout.toString());

                    if (0 === prListResponse.length) {
                        return;
                    }

                    pr = prListResponse[0];
                    this.log(`[${cwd}] Merging pull request ${pr.url}`);

                    const prMergeCmd = spawnSync(
                        'hub',
                        [
                            'api',
                            `repos/{owner}/{repo}/pulls/${pr.number}/merge`,
                            '-X',
                            'PUT',
                            '-F',
                            'merge_method=squash',
                            '-F',
                            `sha=${pr.head.sha}`,
                        ],
                        { cwd },
                    );

                    if (0 !== prMergeCmd.status) {
                        const prMergeResponse = JSON.parse(prMergeCmd.stdout.toString());
                        throw new Error(prMergeResponse.message);
                    }

                    this.log(`[${cwd}] Merged`);
                }

                const releaseListCmd = spawnSync(
                    'hub',
                    ['release', '-f', '%T', '--exclude-prereleases', '-L', '1'],
                    { cwd },
                );

                if (0 !== releaseListCmd.status) {
                    throw new Error(releaseListCmd.stderr.toString());
                }

                const previousRelease = releaseListCmd.stdout.toString() || '1.0.0';
                const semver = new SemVer(previousRelease);
                const newRelease = semver.inc(type);

                this.log(`[${cwd}] Checking if release '${newRelease}' exists`);

                const draftReleaseListCmd = spawnSync(
                    'hub',
                    ['release', '-f', '%S %t %T', '--exclude-prereleases', '--include-drafts', '-L', '1'],
                    { cwd },
                );

                if (0 !== draftReleaseListCmd.status) {
                    throw new Error(draftReleaseListCmd.stderr.toString());
                }

                const draftReleaseList = draftReleaseListCmd.stdout.toString();

                if (draftReleaseList.startsWith(`draft ${newRelease} `)) {
                    this.log(`[${cwd}] Updating release '${newRelease}'`);

                    const tag = draftReleaseList.split(' ')[2];

                    const showReleaseCmd = spawnSync(
                        'hub',
                        [
                            'release',
                            'show',
                            '-f',
                            '%b',
                            tag,
                        ],
                        { cwd },
                    );

                    if (0 !== showReleaseCmd.status) {
                        throw new Error(showReleaseCmd.stderr.toString());
                    }

                    const releaseBody = showReleaseCmd.stdout.toString();

                    if (isFinalizeStep) {
                        const deleteReleaseCmd = spawnSync(
                            'hub',
                            [
                                'release',
                                'delete',
                                tag,
                            ],
                            { cwd },
                        );

                        if (0 !== deleteReleaseCmd.status) {
                            throw new Error(deleteReleaseCmd.stderr.toString());
                        }

                        const createReleaseCmd = spawnSync(
                            'hub',
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
                            { cwd },
                        );

                        if (0 !== createReleaseCmd.status) {
                            throw new Error(createReleaseCmd.stderr.toString());
                        }
                    } else {
                        const updateReleaseCmd = spawnSync(
                            'hub',
                            [
                                'release',
                                'edit',
                                '-m',
                                '',
                                '-m',
                                `${releaseBody}\n* ${pr.title} #${pr.number}`,
                                tag,
                            ],
                            { cwd },
                        );

                        if (0 !== updateReleaseCmd.status) {
                            throw new Error(updateReleaseCmd.stderr.toString());
                        }
                    }

                    this.log(`[${cwd}] Updated`);
                } else {
                    if (isFinalizeStep) {
                        throw new Error(`Unable to find release '${newRelease}' to finalize`);
                    }

                    this.log(`[${cwd}] Creating draft release '${newRelease}'`);

                    const createReleaseCmd = spawnSync(
                        'hub',
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
                        { cwd },
                    );

                    if (0 !== createReleaseCmd.status) {
                        throw new Error(createReleaseCmd.stderr.toString());
                    }

                    this.log(`[${cwd}] Created`);
                }
            });
        });
}
