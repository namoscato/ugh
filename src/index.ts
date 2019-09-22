#!/usr/bin/env node

import * as Vorpal from 'vorpal';
import login from './command/login';
import releaseCleanup from './command/release-cleanup';
import releaseInit from './command/release-init';

const vorpal = Vorpal();

login(vorpal);
releaseCleanup(vorpal);
releaseInit(vorpal);

vorpal
    .on('client_command_executed', () => process.exit(0))
    .on('client_command_error', () => process.exit(1))
    .delimiter('$')
    .show()
    .parse(process.argv);
