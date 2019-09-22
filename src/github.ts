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
        this.settings = jsonfile.readFileSync(SETTINGS_FILE, { throws: false }) || {};
    }

    public createAuthorization(username: string, password: string, on2fa: () => Promise<string>) {
        const client = new GitHubClient({
            auth: {
                on2fa,
                password,
                username,
            },
        });

        return client.oauthAuthorizations.createAuthorization({
            note: 'Node Command-line Utilities',
            note_url: 'https://github.com/namoscato/ugh',
            scopes: ['repo'],
        }).then((response) => {
            this.settings.token = response.data.token;
            jsonfile.writeFileSync(SETTINGS_FILE, this.settings);
        });
    }

    public getClient() {
        if ('undefined' === typeof this.client) {
            const options: GitHubClient.Options = {};

            if (this.isAuthenticated()) {
                options.auth = `token ${this.settings.token}`;
            }

            this.client = new GitHubClient(options);
        }

        return this.client;
    }

    public isAuthenticated(): boolean {
        return 'undefined' !== typeof this.settings.token;
    }
}

export default new GitHub();
