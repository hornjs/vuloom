#!/usr/bin/env node

import process from "node:process";
import { runVuloomCli } from "./lib/cli.js";

process.exitCode = await runVuloomCli(process.argv.slice(2));
