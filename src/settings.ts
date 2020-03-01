import * as jsonfile from 'jsonfile';
import * as os from 'os';
import * as path from 'path';

const SETTINGS_FILE = path.join(os.homedir(), '.amo-ugh');

export interface IMultipleRepositoryConfiguration {
    repos: string[];
}

export default class Settings {
    private static settings = jsonfile.readFileSync(SETTINGS_FILE, { throws: false }) || {};

    public static get<T>(name: string): T {
        return this.settings[name] || {};
    }

    public static getAbsoluteRepositoryPaths(config: IMultipleRepositoryConfiguration): string[] {
        return config.repos.map((dir) => ('~' === dir[0] ? path.join(process.env.HOME, dir.slice(1)) : dir));
    }
}
