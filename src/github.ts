import * as GitHubClient from '@octokit/rest';
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
        this.client = new GitHubClient();

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
            username,
            type: 'basic',
        });

        return this.client.oauthAuthorizations.createAuthorization({
            note: 'Node Command-line Utilities 2',
            note_url: 'https://github.com/namoscato/ugh',
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
