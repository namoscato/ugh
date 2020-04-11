import { spawnSync } from 'child_process';
import { join } from 'path';
import settings from '../settings';

const COMMAND = 'pull-request';

/** set of configurable options */
const OPTIONS = [
    'reviewer',
    'assign',
    'labels',
];

export default function pullRequest(vorpal): void {
    let config;

    vorpal
        .command(`${COMMAND} <template> <head> <message>`)
        .option('-b, --base <base>', 'The base branch in the "[OWNER:]BRANCH" format. Defaults to the default branch of the upstream repository (usually "master").')
        .description('Create a <base>...<head> pull request across repositories with the specified <message>')
        .validate((input) => {
            const { template } = input;

            config = settings.get(COMMAND)[template];

            return config ? true : `${COMMAND}.${template} configuration not defined`;
        })
        .action(async function action(args) {
            const { head } = args;

            const repos = config.repos.map((dir) => ('~' === dir[0] ? join(process.env.HOME, dir.slice(1)) : dir)).filter((cwd) => {
                this.log(`[${cwd}] Checking if branch '${head}' exists`);

                const ref = spawnSync(
                    'hub',
                    ['api', `repos/{owner}/{repo}/git/ref/heads/${head}`],
                    { cwd },
                );

                return 0 === ref.status;
            });

            if (0 === repos.length) {
                throw new Error(`Branch '${head}' does not exist in any of the configured repositories`);
            }

            const { base } = args.options;
            const title = `${head} ${args.message}`;

            const prompt = await this.prompt({
                default: false,
                message: `Are you sure you want to create a pull request across ${repos.length} repositor${1 === repos.length ? 'y' : 'ies'}?\n\n`
                    + `${base ? ` base: ${base}\n` : ''}`
                    + ` head: ${head}\n`
                    + `title: ${title}\n\n`
                    + `Create pull request${1 === repos.length ? '' : 's'}`,
                name: 'proceed',
                type: 'confirm',
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            if (!prompt.proceed) {
                throw new Error('User aborted action');
            }

            const defaults = config.defaults || {};
            const options = [
                'pull-request',
                '--message', `${title}`,
                '--head', head,
            ];

            if (base) {
                options.push('--base', base);
            }

            OPTIONS.forEach((option) => {
                if ('undefined' === typeof defaults[option]) {
                    return;
                }

                options.push(`--${option}`, defaults[option]);
            });

            repos.forEach((cwd) => {
                this.log(`[${cwd}] Creating pull request`);

                const pr = spawnSync(
                    'hub',
                    options,
                    {
                        cwd,
                        encoding: 'utf-8',
                        stdio: 'pipe',
                    },
                );

                if (0 !== pr.status) {
                    throw new Error(pr.stderr.toString());
                }

                this.log(pr.stdout);
            });
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}
