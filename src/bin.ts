#!/usr/bin/env node

import process from "node:process";
import { runPhialCli } from "./lib/cli/index.js";

process.exitCode = await runPhialCli(process.argv.slice(2));
