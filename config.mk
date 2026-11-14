# FSL names the FSL command-line driver. The toolchain image has it as `fsl`.
# Override it on the command line: make check FSL=/path/to/driver
FSL ?= fsl
export FSL
