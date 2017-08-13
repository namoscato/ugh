import * as Promise from 'bluebird';
import * as GitHubClient from 'github';
import * as jsonfile from 'jsonfile';
import * as os from 'os';
import * as path from 'path';

const SETTINGS_FILE = path.join(os.homedir(), '.amo-ugh');

interface ISettings {
    token: string;
}

class GitHub {
    private client: GitHubClient;
    private settings: ISettings;

    constructor() {
        this.client = new GitHubClient({
            Promise: Promise as any,
        });

        this.settings = jsonfile.readFileSync(SETTINGS_FILE, { throws: false }) || {};

        if (this.isAuthenticated()) {
            this.client.authenticate({
                token: this.settings.token,
                type: 'token',
            });
        }
    }

    public createAuthorization(username, password) {
        this.client.authenticate({
            password,
            type: 'basic',
            username,
        });

        return this.client.authorization.create({
            note: 'Node Command-line Utilities',
            note_url: 'https://github.com/namoscato',
            scopes: ['repo'],
        }).then((response) => {
            this.settings.token = response.data.token;
            jsonfile.writeFileSync(SETTINGS_FILE, this.settings);
        });
    }

    public getClient() {
        return this.client;
    }

    public isAuthenticated(): boolean {
        return 'undefined' !== typeof this.settings.token;
    }
}

export const github = new GitHub();
export default github.getClient();
