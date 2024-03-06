`@flxbl-io/sfp flow`
===================

Manage flows in your org

* [`@flxbl-io/sfp flow activate`](#flxbliosfp-flow-activate)
* [`@flxbl-io/sfp flow cleanup`](#flxbliosfp-flow-cleanup)
* [`@flxbl-io/sfp flow deactivate`](#flxbliosfp-flow-deactivate)

## `@flxbl-io/sfp flow activate`

Activate the flow on a target org

```
USAGE
  $ @flxbl-io/sfp flow activate -u <value> [-f <value>] [-p <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -f, --developername=<value>    The developer name of the flow
  -p, --namespaceprefix=<value>  Use to specify a specific namespace prefix
  -u, --targetorg=<value>        (required) Username or alias of the target org.
      --loglevel=<option>        [default: info] logging level for this command invocation
                                 <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

DESCRIPTION
  Activate the flow on a target org
```

_See code: [src/commands/flow/activate.ts](https://github.com/flxbl-io/sfp)_

## `@flxbl-io/sfp flow cleanup`

Cleanup inactive flows on a target org

```
USAGE
  $ @flxbl-io/sfp flow cleanup -u <value> [-f <value>] [-p <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -f, --developername=<value>    The developer name of the flow
  -p, --namespaceprefix=<value>  Use to specify a specific namespace prefix
  -u, --targetorg=<value>        (required) Username or alias of the target org.
      --loglevel=<option>        [default: info] logging level for this command invocation
                                 <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

DESCRIPTION
  Cleanup inactive flows on a target org
```

_See code: [src/commands/flow/cleanup.ts](https://github.com/flxbl-io/sfp)_

## `@flxbl-io/sfp flow deactivate`

Deactivate the flow on a target org

```
USAGE
  $ @flxbl-io/sfp flow deactivate -u <value> [-f <value>] [-p <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -f, --developername=<value>    The developer name of the flow
  -p, --namespaceprefix=<value>  Use to specify a specific namespace prefix
  -u, --targetorg=<value>        (required) Username or alias of the target org.
      --loglevel=<option>        [default: info] logging level for this command invocation
                                 <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

DESCRIPTION
  Deactivate the flow on a target org
```

_See code: [src/commands/flow/deactivate.ts](https://github.com/flxbl-io/sfp)_
