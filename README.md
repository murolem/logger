[![npm version](https://badge.fury.io/js/@aliser%2Flogger.svg)](https://badge.fury.io/js/@aliser%2Flogger)
[![tests](https://github.com/murolem/logger/actions/workflows/test.yml/badge.svg)](https://github.com/murolem/logger/actions)
[![coverage](https://codecov.io/gh/murolem/logger/branch/main/graph/badge.svg?token=TnonWYz4U8)](https://codecov.io/gh/murolem/logger)

# logger

A simple logging utility.

Can log simple messages along with:

-   arbitrary data, presented «as is» to view in the browser console or formatted to a json (configurable).
-   ability to throw an error along with log messages, stopping execution.
-   ability to alert a message using browser «alert».

# Install

```shell
npm install @aliser/logger
```

# Usage

```ts
import Logger from "@aliser/logger";

// 1. log using one of the methods
const logger = new Logger();
logger.logInfo(msg);

// 2. or destructure the methods you need
const logger = new Logger();
const { logInfo, logError } = logger;
logInfo(msg);
```
