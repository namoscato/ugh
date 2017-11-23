import Version from './version';

export default class Release {

    public static parse(versionString: string, previousVersionString?: string): Release {
        return new Release(
            Version.parse(versionString),
            previousVersionString ? Version.parse(previousVersionString) : null,
        );
    }

    constructor(private version: Version, private previousVersion: Version = null) {}

    public getVersion(): Version {
        return this.version;
    }

    public getPreviousVersion(): Version {
        if (null !== this.previousVersion) {
            return this.previousVersion;
        }

        if (0 === this.version.getMinor()) {
            throw new Error('Major releases require a previous version to be specified');
        }

        return new Version(this.version.getMajor(), this.version.getMinor() - 1);
    }
}
