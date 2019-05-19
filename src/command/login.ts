import github from './../github';

export default function (vorpal) {
    vorpal
        .command('login')
        .description('Login to a GitHub account')
        .action(async function () {
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
                () => {
                    return this.prompt({
                        message: 'Two-factor authentication Code: ',
                        name: 'code',
                        type: 'password',
                    }).then((input: any) => {
                        console.log(input)
                        return input.code;
                    });
                },
            );
        });
}
