import * as jsonfile from 'jsonfile';
import * as os from 'os';
import * as path from 'path';

const SETTINGS_FILE = path.join(os.homedir(), '.amo-ugh');

class Settings {
    private readonly settings: object;

    constructor() {
        this.settings = jsonfile.readFileSync(SETTINGS_FILE, { throws: false }) || {};
    }

    public get<T>(name: string): T {
        return this.settings[name] || {};
    }
}

export default new Settings();
