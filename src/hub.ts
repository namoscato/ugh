import { spawnSync } from 'child_process';

export default class Hub {
    public static api<T>(args: string[], cwd: string): T|null {
        try {
            const result = this.run(['api'].concat(args), cwd);

            if ('' === result) {
                return null;
            }

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
            let errorMessage = cmd.stderr.toString();

            if ('' === errorMessage) {
                errorMessage = cmd.stdout.toString();
            }

            throw new Error(errorMessage);
        }

        return cmd.stdout.toString();
    }
}
