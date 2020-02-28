import { spawnSync } from 'child_process';

class Hub {
    public static api<T>(args: string[], cwd: string): T {
        let result: string;

        try {
            result = this.run(['api'].concat(args), cwd);
        } catch (e) {
            const response = JSON.parse(e.message);
            throw new Error(response.message);
        }

        return JSON.parse(result) as T;
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

export default Hub;
