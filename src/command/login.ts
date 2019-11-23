import github from '../github';

interface ITwoFactorAuthenticationInput {
    code: string;
}

export default function login(vorpal): void {
    vorpal
        .command('login')
        .description('Login to a GitHub account')
        .action(async function action() {
            const input1 = await this.prompt({
                message: 'Username: ',
                name: 'username',
            });

            const input2 = await this.prompt({
                message: 'Password: ',
                name: 'password',
                type: 'password',
            });

            return github.createAuthorization(
                input1.username,
                input2.password,
                () => this.prompt({
                    message: 'Two-factor authentication Code: ',
                    name: 'code',
                    type: 'password',
                }).then((input: ITwoFactorAuthenticationInput) => input.code),
            );
        });
}
