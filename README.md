[![tests](https://github.com/murolem/logger/actions/workflows/playwright.yml/badge.svg)](https://github.com/murolem/logger/actions)
[![coverage](https://codecov.io/gh/murolem/logger/branch/main/graph/badge.svg?token=TnonWYz4U8)](https://codecov.io/gh/murolem/logger)

# logger
 Logs messsages and arbitrary data to the console, can throw errors.

todo the rest :)

# feature requests
- support for logging only additional data, no separate main message — with "additional data" string replaced by provided message
**why**
less cluttered log messages

- support disabling log level prefix 
**why**
for logging things like delimiteres maybe?  

- support custom log levels
**why**
why not? 

- add option to log additional data in second argument

- add option (prob set in the constructor) for logError() to autothrow an error. add option to logError() to disable this behaviour.

- stringify with newlines and 2 spaces by default.

- log current time