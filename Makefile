# Runs the project. The driver binary comes from FSL (config.mk).
include config.mk

NODE ?= node
RUN = $(NODE) tools/run.mjs
SYSTEM = system

.PHONY: check staged record models test tutorial-test tutorial-host-test tutorial-record
# Run every running case and compare it with its recorded result.
check:
	@$(RUN) check $(SYSTEM)
# Run every staged case (a case for a feature the language does not have yet).
staged:
	@$(RUN) staged $(SYSTEM)
# Re-record system/expected/ from the driver. Never edit those files by hand.
record:
	@$(RUN) record $(SYSTEM)

# Regenerate the model from its description (interim, see README.md).
models:
	$(NODE) tools/model.mjs $(SYSTEM)/model/account.mjs $(SYSTEM)/model/project.semantic-ir.json

# Unit checks of the tutorial files, the steps runner and the tools. They need no driver.
test:
	$(NODE) --test tutorial/*.test.mjs tools/*.test.mjs

# Run tutorial/steps.md in a fresh copy of this project inside the toolchain
# image, and compare the output of each step with tutorial/expected (needs
# Docker). tutorial-record writes tutorial/expected from the real output.
IMAGE ?= ghcr.io/agent-ix/filament-toolchain:latest
STEPS_SHELL ?= bash
tutorial-test:
	$(NODE) tools/steps.mjs run tutorial/steps.md --image $(IMAGE) --shell $(STEPS_SHELL) --copy . --expected tutorial/expected
tutorial-host-test:
	$(NODE) tools/steps.mjs run tutorial/steps.md --host --shell $(STEPS_SHELL) --copy .
tutorial-record:
	$(NODE) tools/steps.mjs run tutorial/steps.md --image $(IMAGE) --shell $(STEPS_SHELL) --copy . --expected tutorial/expected --record
