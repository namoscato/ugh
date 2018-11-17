import { github } from './../github';

export default function (vorpal) {

    vorpal
        .command('login')
        .description('Login to a GitHub account')
        .action(function (args) {
            return this.prompt({
                message: 'Username: ',
                name: 'username',
            }).then((input1) => {
                const username = input1.username;

                return this.prompt({
                    message: 'Password: ',
                    name: 'password',
                    type: 'password',
                }).then((input2) => {
                    return github.createAuthorization(username, input2.password);
                });
            }).catch((message) => {
                return Promise.reject(new Error(message));
            });
        });
}
