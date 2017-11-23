export default class Version {

    public static parse(versionString: string): Version {
        const parts = versionString.split('.');

        if (parts.length < 2 || parts.length > 3) {
            throw new Error('Specified version is invalid (expected <major.minor[.patch]>');
        }

        return new Version(Number(parts[0]), Number(parts[1]));
    }

    constructor(private major: number, private minor: number) {
        if (isNaN(major) || major < 0) {
            throw new Error('Major version is not positive integer');
        } else if (isNaN(minor) || minor < 0) {
            throw new Error('Minor version is not positive integer');
        }
    }

    public equals(ref: string): boolean {
        return this.toString() === ref;
    }

    public getMajor(): number {
        return this.major;
    }

    public getMinor(): number {
        return this.minor;
    }

    public toString(): string {
        return `${this.major}.${this.minor}.x`;
    }
}
