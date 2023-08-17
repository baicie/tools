#!/usr/bin/env node

function start() {
  try {
    return import('../dist/index.js')
  }
  catch (error) {
    console.error(error)
  }
}

start()
