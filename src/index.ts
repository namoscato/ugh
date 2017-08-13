#!/usr/bin/env node

import * as Vorpal from 'vorpal';
import * as commands from './command';
import { github } from './github';

const vorpal = Vorpal();

for (const i in commands) {
    if (commands.hasOwnProperty(i) && 'function' === typeof commands[i]) {
        commands[i](vorpal);
    }
}

vorpal
    .on('client_command_executed', () => process.exit(0))
    .on('client_command_error', () => process.exit(1))
    .delimiter('$')
    .show()
    .parse(process.argv);
