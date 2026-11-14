# Filament project template

The Filament project template is a GitHub template repository for a project written in the Filament Specification Language (FSL). It holds a small model, one rule about data, one rule about an operation, a passing and a failing case for each, and a `make check` command that runs them.

You copy it, run the checks in the toolchain image, then change the model and add rules for your own system.

## Getting started

You need Docker and a GitHub account.

1. Select **Use this template** on the repository page, create your repository, and clone it.

   ```
   git clone https://github.com/YOUR-NAME/YOUR-REPOSITORY
   cd YOUR-REPOSITORY
   ```

2. Open a shell in the toolchain image with the project folder mounted. Or open the folder in an editor that supports Dev Containers, which reads `.devcontainer/devcontainer.json`.

   ```
   docker run --rm -it --volume "$PWD:/work" --workdir /work ghcr.io/agent-ix/filament-toolchain bash
   ```

3. Run every case. Both rules pass their good case, and both rules reject their bad case.

   ```
   make check
   ```

   ```
   system/within-limit: exit 0 ok
   system/over-limit: exit 10 ok
   system/withdraw-right: exit 0 ok
   system/withdraw-wrong: exit 10 ok
   check: 4 passed, 0 failed
   ```

4. Run the failing data case by hand. Exit code 10 means the rule is violated.

   ```
   cd system
   fsl run requests/over-limit.json --format json
   echo "exit $?"
   cd ..
   ```

   ```
   {"artifacts":[],"category":"violation","diagnostics":[],"format":"quire-outcome/1","items":[{"category":"violation","cause":null,"clause":"WithinLimit","request_index":0,"result":"refuted"}],"last_stage":"S6a","operation":"monitor","result":null}
   exit 10
   ```

5. Break the passing data case, and watch the check fail. In `system/data/within-limit.json`, change the balance of the account from `"500"` to `"1500"`, which is above the limit of `"1000"`. Then run the check again.

   ```
   make check
   ```

   ```
   system/within-limit: exit 10, expected 0
   system/over-limit: exit 10 ok
   system/withdraw-right: exit 0 ok
   system/withdraw-wrong: exit 10 ok
   check: 3 passed, 1 failed
   make: *** [Makefile:11: check] Error 1
   ```

   Change the balance back to `"500"`.

## Usage

### Change the model

The model is the description in [system/model/account.mjs](system/model/account.mjs): one type, `Account`, with the fields `balance` and `limit` and the operation `withdraw`. The driver reads models as generated JSON today, and the generator in [tools/model.mjs](tools/model.mjs) writes that JSON until the language can declare a model.

1. Edit `system/model/account.mjs`. Add a field, a type or an operation.
2. Run `make models` to write `system/model/project.semantic-ir.json`.
3. Add the new field to every snapshot in `system/data/`.
4. Run `make check`.

### Add a rule

1. Write the rule in [system/rules/account.fsl](system/rules/account.fsl). An `invariant` is a rule about data, and a `post` is a rule about the result of an operation.
2. Add a data snapshot for a case that holds and one for a case that does not, in `system/data/`.
3. Add a request file for each case in `system/requests/`. Copy `within-limit.json` and change the clause name and the data path.
4. Add an entry for each case to [system/example.toml](system/example.toml). A case records the exit code it must give: 0 holds, 10 violated, 20 refused, 22 incomplete data, 21 not available yet.
5. Run `make record` to write the recorded output into `system/expected/`, then read it. A failing case must fail for the reason it is meant to show. Then run `make check`.

## Folder layout

Each folder of the project holds one kind of file.

| Path | Contents |
| --- | --- |
| `system/example.toml` | One entry per case |
| `system/model/` | The model description and the generated model |
| `system/rules/` | FSL source |
| `system/data/`, `system/requests/` | Snapshots and one request file per case |
| `system/expected/` | Recorded driver output for each case |
| `tools/` | The case runner, the model generator and the steps runner |

## Use a release binary

You can run the checks without Docker. Install the driver as `fsl` from a [filament-driver release](https://github.com/agent-ix/filament-driver/releases), with Node.js 20 or later and `make`. The [install steps](https://github.com/agent-ix/filament-examples/blob/main/install-test/steps.md) list each command, including the checksum check.

## Building and testing

The case runner [tools/run.mjs](tools/run.mjs), the generator [tools/model.mjs](tools/model.mjs) and the steps runner [tools/steps.mjs](tools/steps.mjs) are unmodified copies of the files of the same name in [filament-examples](https://github.com/agent-ix/filament-examples/tree/main/tools). A copy keeps the project working offline and in any checkout. To update them, copy the files again.

The Makefile reads the driver path from the variable `FSL`, set in [config.mk](config.mk). Its default is `fsl`, which the toolchain image provides. To use a driver you built yourself, run `make check FSL=/path/to/driver`.

The commands of the first-project tutorial are in [tutorial/steps.md](tutorial/steps.md), with the recorded output of each step in `tutorial/expected`. `make tutorial-test` runs every step in the toolchain image, in a fresh copy of the project, and compares the output with the recorded files. `make tutorial-record` writes the recorded files again. `make test` checks the tutorial files and needs no Docker.

The [check workflow](.github/workflows/check.yml) runs `make check staged` in the image. It also runs the tutorial test. It starts from the Actions tab.

## Contributing

Contributions to this template need a signed CLA. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Starting a project from this template

GitHub copies every file in this repository into your new project, and it cannot leave any out. Delete these three files from your project, which apply only to the template repository:

- `CONTRIBUTING.md`
- `.github/CODEOWNERS`
- `.github/workflows/cla.yml`

Then replace the license and `CONTENT_RIGHTS.md` with your own.

## License

MIT. See the [license file](LICENSE).
