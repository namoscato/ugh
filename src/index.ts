#!/usr/bin/env node

import * as Vorpal from 'vorpal';
import preRelease from './command/pre-release';
import pullRequest from './command/pull-request';

const vorpal = Vorpal();

preRelease(vorpal);
pullRequest(vorpal);

vorpal
    .on('client_command_executed', () => process.exit(0))
    .on('client_command_error', () => process.exit(1))
    .delimiter('$')
    .show()
    .parse(process.argv);
