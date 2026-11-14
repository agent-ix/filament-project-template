# Runs the project. The driver binary comes from FSL (config.mk).
include config.mk

NODE ?= node
RUN = $(NODE) tools/run.mjs
SYSTEM = system

.PHONY: check staged record models
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
