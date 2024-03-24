# Changelog

## [38.0.1](https://github.com/flxbl-io/sfp-pro/compare/sfp-v38.0.0...sfp-v38.0.1) (2024-03-24)


### Bug Fixes

* **package:** add lerna to deps ([d185b36](https://github.com/flxbl-io/sfp-pro/commit/d185b36063c54d97094ff09bb1e2c9ddb5aa6957))

## 38.0.0 (2024-03-24)


### ⚠ BREAKING CHANGES

* **validate:** Changes the earlier behaviour across all validation modes
* **validate:** Changes the earlier behaviour across all validation modes
* **scope:** All existing alpha rc users has to do a fresh installation
* sfp-cli: Reorganize commands and topics
* **cleanup:** orchestrator topic is deprecated, use orchestrator commands without orchestrator topic directly such as sfp:build
* **release:** changelog will be written for each release config by computing the name, and will be pushed individually

### Features

* (BREAKING) hard break to sfp pro ([0d0d34f](https://github.com/flxbl-io/sfp-pro/commit/0d0d34f893a2149a640bff711e3e2d08cd99b02c))
* **build:** add support for building multiple domains ([5bb6580](https://github.com/flxbl-io/sfp-pro/commit/5bb6580a16f9ca23707821121081687c82572e60))
* **changelog:** add commit links in changelog markdown ([b06123f](https://github.com/flxbl-io/sfp-pro/commit/b06123ffad42d673a2d94a25f41b95cc4bb95f0b))
* **changelog:** display commits in changelog for dryrun ([5b34c62](https://github.com/flxbl-io/sfp-pro/commit/5b34c625b70b529f07baa6b440cea9f57f3dfdf6))
* **cleanup:** cleanup existing commands description and remove deprecated commands ([f01284c](https://github.com/flxbl-io/sfp-pro/commit/f01284cb859409c4a60d16232eaa553adc8fb9c7))
* **deploy:** flow activation and deactivation during package installation ([#17](https://github.com/flxbl-io/sfp-pro/issues/17)) ([05cb81f](https://github.com/flxbl-io/sfp-pro/commit/05cb81f2772dac7789ea058ace401e283dfdce50))
* **deps:** update to v6 of salesforce dependencies ([#3](https://github.com/flxbl-io/sfp-pro/issues/3)) ([9e71429](https://github.com/flxbl-io/sfp-pro/commit/9e714293effa3e0aac8ff1011515793fc0df097a))
* **impact:** add additional options to consider only changed files during release config impact ([3a5d87a](https://github.com/flxbl-io/sfp-pro/commit/3a5d87a558ad5ff592ff7cc9b2b12cd2575da0aa))
* **install:** install to support installation of  single artifact ([85f440c](https://github.com/flxbl-io/sfp-pro/commit/85f440c1bbd4c52e2a9666af11bf86bbe901814b))
* **orchestrator:** elevate orchestrator commands directly as the default commands ([a4a5c3a](https://github.com/flxbl-io/sfp-pro/commit/a4a5c3af97660299fcd4cef744ef19260775b2e1))
* **prepare-c-flag:** add noAnchestors option to config ([#9](https://github.com/flxbl-io/sfp-pro/issues/9)) ([ab8ca59](https://github.com/flxbl-io/sfp-pro/commit/ab8ca59d5f17d8ba89f13af08037043d30a62f5f))
* **prepare:** add a log to display packages that are restricted as per release config ([a3b021f](https://github.com/flxbl-io/sfp-pro/commit/a3b021f40335f7ac1d6bed519d54faae46025037))
* **release:** enhanced support for multiple release definitions in release command ([#14](https://github.com/flxbl-io/sfp-pro/issues/14)) ([d2dbe62](https://github.com/flxbl-io/sfp-pro/commit/d2dbe62ac3c22c56bbbb1ffcf0d3b3c08af019fb))
* **release:** introduce additional properties to release config and definition ([4f33fd4](https://github.com/flxbl-io/sfp-pro/commit/4f33fd4b876dd88ebbda17a5c2a13ee617284713))
* sfp-cli: Reorganize commands and topics ([71bdcde](https://github.com/flxbl-io/sfp-pro/commit/71bdcdeece1d15c46a1f485e735398c1590fe1c8))
* **sfp:** new org login url command ([#19](https://github.com/flxbl-io/sfp-pro/issues/19)) ([355488c](https://github.com/flxbl-io/sfp-pro/commit/355488cbea91c9e307909379a63fc326dc58bcf3))
* **validate:** add a header to show release configs used ([12d5e71](https://github.com/flxbl-io/sfp-pro/commit/12d5e7134a05cd590f355f7f8d3580dc8fb481f9))
* **validate:** change terminology of validate commands to validate org and validate pool ([24db5a3](https://github.com/flxbl-io/sfp-pro/commit/24db5a3cf3a068a4f05a10e751379d6ef4afacdf))
* **validate:** only trigger tests for impacted packages ([ef7220e](https://github.com/flxbl-io/sfp-pro/commit/ef7220e6d2b1ef6207161d6cb49d64a1ec6a1ed9)), closes [#5](https://github.com/flxbl-io/sfp-pro/issues/5)
* **validate:** only trigger tests for impacted packages ([a36ceed](https://github.com/flxbl-io/sfp-pro/commit/a36ceedda63dce5f2e131e7b9c34b04cd4b63cb2)), closes [#5](https://github.com/flxbl-io/sfp-pro/issues/5)
* **validate:** validate to support multiple release configs ([2b86b2e](https://github.com/flxbl-io/sfp-pro/commit/2b86b2ea968162491517a09f17cc068dcda40b37))


### Bug Fixes

* **apextest:** fix error message when apex test is cancelled in the org ([612ae62](https://github.com/flxbl-io/sfp-pro/commit/612ae62dacaf8b0c511084d2944bceab0cb8d4db))
* **changelog:** make repoUrl optional ([10fbdb2](https://github.com/flxbl-io/sfp-pro/commit/10fbdb2ba905094c27aebf86f2eb54e4a32a1848))
* **changelog:** revert creation of changelog during run as the table is broken ([5e4cb36](https://github.com/flxbl-io/sfp-pro/commit/5e4cb364da63534ca157851fe2a94d9f24544f74))
* **cicd:** fix repo name ([b445702](https://github.com/flxbl-io/sfp-pro/commit/b44570236e8ae8887bd12b62ee940b6912218f10))
* **config:** add public config ([811b30a](https://github.com/flxbl-io/sfp-pro/commit/811b30adca021475facd71dc6a251955645436a4))
* **deploy:** add props to fix incorrect auth ([70682a2](https://github.com/flxbl-io/sfp-pro/commit/70682a2dfd1c19985bfc90afff7cb54767dd792e))
* **deploy:** add reason to deployed packages ([92fd161](https://github.com/flxbl-io/sfp-pro/commit/92fd1617f595d36f08e62184a81c3b90e6faaaf3))
* **deploy:** change to badges ([005e547](https://github.com/flxbl-io/sfp-pro/commit/005e547da49139bb79f43072ff411a3b231f0c0d))
* **deploy:** fix blank logger being printed during prepare by deploy command ([3d2bfba](https://github.com/flxbl-io/sfp-pro/commit/3d2bfba70ce639a8016e76898f6d0bbecc1b3b01))
* **deploy:** fix header being incorrectly displayed to console log ([a23e023](https://github.com/flxbl-io/sfp-pro/commit/a23e023587a7a4716ab6511bd27e91b7be5f5a5d))
* **deploy:** incorrect reference used ([f841ad7](https://github.com/flxbl-io/sfp-pro/commit/f841ad766efc8255fdbac0e748cba1ad6e6bed61))
* **deploy:** print coverage warnings when source package fails ([3c3cacf](https://github.com/flxbl-io/sfp-pro/commit/3c3cacfbfda982384ecef1942d579c9c8524b8f8))
* **deploy:** shorten badges used ([399c015](https://github.com/flxbl-io/sfp-pro/commit/399c015ccaeac407e0915232074103f74096fb68))
* **diff:** ensure --no-renames is used for branchcompare ([8a59432](https://github.com/flxbl-io/sfp-pro/commit/8a594324b31a78f0bee7e707bc871d948749fc8e))
* **diff:** fix incorrect argument in diff calculation ([63ad7e4](https://github.com/flxbl-io/sfp-pro/commit/63ad7e4e3759a71e2a1f91a850159fbc88ec9d64))
* **diff:** various fixes in diff to support branch compare ([5070266](https://github.com/flxbl-io/sfp-pro/commit/507026625b798360523aed78d32d37151e1a57e9))
* **envvar:** revert env var to use SFPOWERSCRIPTS nomenclature for backward compatibility ([028a179](https://github.com/flxbl-io/sfp-pro/commit/028a179cb73aeca339694fde4cbddf03412e4903))
* **flow:** add additonal log info ([918d8d9](https://github.com/flxbl-io/sfp-pro/commit/918d8d9099d9f7df923df8afb772649167913665))
* **flow:** fix activation issue in production when a flow is deployed inactive ([6948c9d](https://github.com/flxbl-io/sfp-pro/commit/6948c9df58e27b5a80a1fb143350b28280d3024a))
* **flow:** handle multiple flows in the package ([e19cd77](https://github.com/flxbl-io/sfp-pro/commit/e19cd7709932021ba44893167b1cb2af8811b6a2))
* **flows:** add additional text when no flows are found in a package ([1b29028](https://github.com/flxbl-io/sfp-pro/commit/1b29028cf2099c2c9d8ab76565856d5d71db75b5))
* **flows:** fix incorrect activation sequence ([fe3e7c4](https://github.com/flxbl-io/sfp-pro/commit/fe3e7c4048b00bbe143450ae53dc7a102e8dec8e))
* **header:** incorporate review feedback to simplify header ([0588ab9](https://github.com/flxbl-io/sfp-pro/commit/0588ab97c822fd859808e19c65e6e2b55700c3de))
* **impact:** fix impacted files not accurately reported ([2be31ec](https://github.com/flxbl-io/sfp-pro/commit/2be31ec916c5daa8016d04c43bc0f747865973a5))
* **impact:** fix incorrect dependencyOnHandling ([252c3a4](https://github.com/flxbl-io/sfp-pro/commit/252c3a48ae3d867024104a23cb0903a7ecb2d62f))
* **impact:** fix typo with explict dependency check flag ([2521a41](https://github.com/flxbl-io/sfp-pro/commit/2521a4168edcc5fb2488d79456ef42f007e99285))
* **impact:** incorporate configs of dependencyOn accurately ([e0725f4](https://github.com/flxbl-io/sfp-pro/commit/e0725f4b7f94f82707f009e9b45ff5c88a94be5a))
* **impact:** remove hard requirement on branch flag ([d89db61](https://github.com/flxbl-io/sfp-pro/commit/d89db617121e601c9f65a42efb2afce6b0f777dd))
* incorrect logging values ([0a65cf6](https://github.com/flxbl-io/sfp-pro/commit/0a65cf6faffc59574c939baa7675b80dbfeef272))
* **install:** add older alias for easier refactoring in sfops ([73f6416](https://github.com/flxbl-io/sfp-pro/commit/73f64169adab9ac552928d071f7e53a1bf2b4dc7))
* **lint:** fix issues raised by linter ([9f7d9ab](https://github.com/flxbl-io/sfp-pro/commit/9f7d9ab9ba2cbf6a82ba33f1d567a8cba21ec377))
* **lint:** fix lint issues ([4784d5a](https://github.com/flxbl-io/sfp-pro/commit/4784d5a6b3cf5b5a6384aec4f8f2012027a7c0dc))
* **lint:** fix linter errors ([e3d123d](https://github.com/flxbl-io/sfp-pro/commit/e3d123d3ed867b576906133e1c0f827b4b78b521))
* **login:** fix bundle pathway used in org login ([9161f3f](https://github.com/flxbl-io/sfp-pro/commit/9161f3fd9e239e4a92229bb7dd6c00ecf21212ee))
* **markdown:** ensure markdown files have config name when multiple releases are handled ([e201376](https://github.com/flxbl-io/sfp-pro/commit/e201376f68a9c3d2052fe810d21bd86e052e372b))
* **metrics:** fix incorrect variable used in metrics ([549c334](https://github.com/flxbl-io/sfp-pro/commit/549c334d05954650d8227f1582101fb79dd3f23b))
* **metrics:** switch back to sfpowerscripts as prefix for backward maintainability ([dfff417](https://github.com/flxbl-io/sfp-pro/commit/dfff417e1c3c9be181ab168c7d8984d18b178554))
* **orginfodisplayer:** fix commands used in org info displayer ([8a2a19d](https://github.com/flxbl-io/sfp-pro/commit/8a2a19d2f4d5611a749eb16cf37ef858f5800704))
* **patch:** ensure path to artifact directory is correct ([#27](https://github.com/flxbl-io/sfp-pro/issues/27)) ([489fe3b](https://github.com/flxbl-io/sfp-pro/commit/489fe3b9eb995007f41f5ba81f7cee467fe3ea07))
* **picklist-background:** add retry counter to picklist update ([#8](https://github.com/flxbl-io/sfp-pro/issues/8)) ([a8a881b](https://github.com/flxbl-io/sfp-pro/commit/a8a881b759ec151d763345a217a8e0428756a987))
* **pool:** revert path used to .sfpowerscripts for backward compatibility ([625b39b](https://github.com/flxbl-io/sfp-pro/commit/625b39bf62c46c11571d333ca8b094cc2f2f7a39))
* **prepare:** add standalone alias for easier migration in sfops ([621114c](https://github.com/flxbl-io/sfp-pro/commit/621114c2e1ff03db7bbb23ae7d7d036bf32d2da7))
* **prepare:** fix incorrect path used in pooldefinition.schema.json ([250b97a](https://github.com/flxbl-io/sfp-pro/commit/250b97ae1159255ba820ae90e359e0a058282c16))
* **projectconfig:** incorrect use of package.name while filtering project config ([256c6bb](https://github.com/flxbl-io/sfp-pro/commit/256c6bb308d741b8be22ff0ebbe038dad0595822))
* **promote:** align terminology of artifacts vs package in description ([b3d4653](https://github.com/flxbl-io/sfp-pro/commit/b3d46536d4d8e34c2f246eeca5da44e17011c3b7))
* **publish:** fix artifact nomenclature used while publishing ([bd8e894](https://github.com/flxbl-io/sfp-pro/commit/bd8e89497e6f0d6c4e2dc3256d2bcf24243f9492))
* **release:** add additonal null check ([4d62bff](https://github.com/flxbl-io/sfp-pro/commit/4d62bffc97d559a361500d7407beb53576ce0983))
* **release:** use releaseconfig name to seperate out changelog creation rather than all ([533d932](https://github.com/flxbl-io/sfp-pro/commit/533d932b4c02fd5bfbe651cda69a77b9fa20c9ce))
* **scope:** change scope to flxbl-io to reflect github username of the flxbl-io org ([704d891](https://github.com/flxbl-io/sfp-pro/commit/704d891dddb208e01a70556a38e3208b14e76820))
* **sfp:** fix examples to demonstrate using -o shorthand notation ([45c1f55](https://github.com/flxbl-io/sfp-pro/commit/45c1f55c6901c9010d495937ce46b0ee1f985136))
* **sfporg:** add commit id to logger ([fa06980](https://github.com/flxbl-io/sfp-pro/commit/fa069801517358f80ebd1724ebc14907543a9781))
* **sfporg:** add error handling to update artifacts ([6c4806f](https://github.com/flxbl-io/sfp-pro/commit/6c4806f1beabb1216c88691175f2a95c9d19597d))
* **sfporg:** revert incorrect replacement of sfp artifact ([6172fe5](https://github.com/flxbl-io/sfp-pro/commit/6172fe578545f9079c9530baa9ba670ccb6be464))
* **sfppackage:** use tag__c in sfpowerscriptsArtifact2__c to store package type ([534bd4d](https://github.com/flxbl-io/sfp-pro/commit/534bd4deabc889d5fde0db0d59f131ffa3f48399))
* **sfp:** revert file locations to use .sfpowerscripts ([28c7642](https://github.com/flxbl-io/sfp-pro/commit/28c7642f00b3cde6b43fdb322046a99cbc13af4c))
* **sfp:** update header ([c28727a](https://github.com/flxbl-io/sfp-pro/commit/c28727a5d63d40d59357312d6c4378e016a6a556))
* **validateAgainstOrg:** fix incorrect path to message flag ([cad86ce](https://github.com/flxbl-io/sfp-pro/commit/cad86ce2d3b5273737310b7c35b2a9984889e571))
* **validateAgainstOrg:** utilize array flags as opposed to string ([1b6bace](https://github.com/flxbl-io/sfp-pro/commit/1b6bacecf3f507a9bac5030b9cdd4faee0495152))
* **validate:** ensure dependencyOn is respected ([616c637](https://github.com/flxbl-io/sfp-pro/commit/616c63771e25a3833fd1aef560f38bbd63f012a2))
* **validate:** ensure deprecated flag is mentioned during run ([e292c20](https://github.com/flxbl-io/sfp-pro/commit/e292c207152e44d9ca218ad335ef52460a23351c))
* **validate:** fix incorrect condition while packages are overriden ([5883ab6](https://github.com/flxbl-io/sfp-pro/commit/5883ab640bc61c53bee90650c2bf13f21bcea531))
* **validate:** fix incorrect syntax and version ([4e81088](https://github.com/flxbl-io/sfp-pro/commit/4e81088ce4351945d62ed6cc2085bb9ec0dea260))
* **validate:** fix old alias to have casing for validateAgainstOrg ([e1affe3](https://github.com/flxbl-io/sfp-pro/commit/e1affe356cc85ad57e1f3ad11df327e11d16f1ce))
* **validate:** only commit artifact after test have passed ([a2d17e9](https://github.com/flxbl-io/sfp-pro/commit/a2d17e976982bc02a05289ced7f7ef3419de0191))
* **validate:** remove duplicate logging of inclusive filter ([52dda28](https://github.com/flxbl-io/sfp-pro/commit/52dda286e6e1acdf25b3b04b34cbb269009e6ae6))
* **validate:** validate should use the target org as the baseline ([340a95c](https://github.com/flxbl-io/sfp-pro/commit/340a95c81e160108daab92fbc12a61aae820d036))
* **various:** fix typo in flxbl.io url ([0cfbe9d](https://github.com/flxbl-io/sfp-pro/commit/0cfbe9d32f47caf12c427f86c03bc1534efb955c))
