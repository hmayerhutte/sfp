# Introduce Installation Keys for Package Versions
* Status:  Pending
* Deciders: @azlam-abdulsalam, @dieffrei
* Date: 20/05/2024


### Issue
[#?](https://github.com/user/repo/issues/?) ?

## Context and Problem Statement

When sfp generates a new package version, it doesn't support installation keys. Installation keys are important because:
- **Security**: Installation keys add an extra layer of security by ensuring that only authorized users or systems can install the package. This helps protect the package's contents and any sensitive data or logic it contains.
- **Controlled Distribution**: By requiring an installation key, you can control who has access to your package. This is particularly useful for commercial applications or internal tools that you want to restrict to specific customers or team members.

## Decision

We will introduce a new flag for the build command `sfp build --installation-keys` that will be used when creating new package versions. The installation-keys will be a path to a YAML file that contains the name of the package and the installation key.

The template of the YAML file will be as follows:
```yaml
default: 123456 # set default installation keys for all packages
package-b: 123456 # set installation key for an specific package
```

## Consequences

- **Security Enhancement**: Adding installation keys will improve the security of package installations by ensuring only authorized installations.
- **Controlled Access**: It will provide a mechanism to control and restrict access to packages, beneficial for commercial and internal use.
- **Implementation Complexity**: Introducing this feature will require changes to the build process and may add complexity in managing installation keys and YAML files.


## Links

- [Related Issue #?](https://github.com/user/repo/issues/?) (replace with the actual issue link once created)
