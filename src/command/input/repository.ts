export default class Repository {

    public static parse(versionString: string): Repository {
        const parts = versionString.split('/');

        if (2 !== parts.length) {
            throw new Error('Specified repository is invalid (expected <owner/repository>)');
        }

        return new Repository(parts[0], parts[1]);
    }

    constructor(private owner: string, private repository: string) {}

    public getOwner(): string {
        return this.owner;
    }

    public getRepository(): string {
        return this.repository;
    }

    public toString(): string {
        return `${this.owner}/${this.repository}`;
    }
}
