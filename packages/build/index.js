#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable no-undef */
try {
  import("./dist/es/cli.js");
} catch (error) {
  console.log(error);
}
