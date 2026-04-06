#!/usr/bin/env node

import process from "node:process";
import { runPhialCli } from "./lib/cli.js";

process.exitCode = await runPhialCli(process.argv.slice(2));
