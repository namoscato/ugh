import { spawnSync } from 'child_process';

export default class Hub {
    public static api<T>(args: string[], cwd: string): T {
        try {
            const result = this.run(['api'].concat(args), cwd);

            return JSON.parse(result) as T;
        } catch (e) {
            const response = JSON.parse(e.message);

            throw new Error(response.message);
        }
    }

    public static run(args: string[], cwd: string): string {
        const cmd = spawnSync(
            'hub',
            args,
            { cwd },
        );

        if (0 !== cmd.status) {
            throw new Error(cmd.stderr.toString());
        }

        return cmd.stdout.toString();
    }
}
