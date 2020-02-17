# ugh [![Actions Status](https://github.com/namoscato/ugh/workflows/Node%20CI/badge.svg)](https://github.com/namoscato/ugh/actions)

Command-line **u**tilities for **G**it**H**ub

## Installation

```
npm i -g amo-ugh
```

### Dependencies

This utility depends on [hub](https://hub.github.com/), which must also be installed.

### Configuration

Command-specific configuration is defined in an `~/.amo-ugh` JSON file located in the user's home directory.

## Usage

```
ugh <command>
```

## Commands

### `pull-request [--base <base>] <template> <head> <message>`

Create a `<base>...<head>` pull request across repositories with the specified `<message>` where `<template>` references a configuration property, i.e.

```json
{
  "pull-request": {
    "my-template": {
      "defaults": {
        "assign": "namoscato",
        "labels": "automation"
      },
      "repos": [
        "~/dev/git/ugh"
      ]
    }
  }
}
```

_See [`hub-pull-request`](https://hub.github.com/hub-pull-request.1.html)_
