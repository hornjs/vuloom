#!/usr/bin/env node

import process from "node:process";
import { runPhialCli } from "../dist/cli.js";

process.exitCode = await runPhialCli(process.argv.slice(2));
