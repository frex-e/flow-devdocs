// import open from './node_modules/open/index.js';
// import fuzzysort from './node_modules/fuzzysort/fuzzysort.js';
// import fetch from './node_modules/node-fetch/src/index.js';
import fuzzysort from 'fuzzysort'
import fetch from 'node-fetch'

import * as fs from 'fs'
import { json } from 'stream/consumers'

const { method, parameters } = JSON.parse(process.argv[2])

const DEFAULT_OPTIONS = {
  installedLangs: []
}

let docs;

// Get docs.
try {
  docs = JSON.parse(fs.readFileSync("./docs.json").toString())

} catch (err) {
  // File does not exist or something
  const response = await fetch("https://devdocs.io/docs/docs.json")
  docs = await response.json()

  fs.writeFile("./docs.json", JSON.stringify(docs), (err) => { })
}

let opts = DEFAULT_OPTIONS;

// Get options
try {
  opts = {
    ...DEFAULT_OPTIONS,
    ...JSON.parse(fs.readFileSync("./opts.json").toString())
  }
} catch (err) {
  opts = DEFAULT_OPTIONS
  fs.writeFile("./opts.json", JSON.stringify(opts), (err) => { })
}


if (method === "query") {
  if (parameters[0].toLowerCase().startsWith("install")) {
    const searchQuery = parameters[0].toLowerCase().slice("install".length);

    const res = fuzzysort.go(searchQuery, docs, { key: "slug", limit: 5, threshold: -50 })

    const langs = res.map((v) => ({
      Title: v.obj.name + " " + (v.obj.version || ""),
      Subtitle: (opts.installedLangs.includes(v.obj.slug)) ? "Disable" : "Enable",
      JsonRPCAction: {
        method: "toggle",
        parameters: [v.obj.slug, v.obj.name]
      },
      score: Math.floor(v.score) + 100,
      IcoPath: "Images\\icon.png"
    }))

    console.log(JSON.stringify(
      {
        result: langs
      }
    ))
    //  {
    //   console.log(JSON.stringify(
    //     {
    //       "result": [{
    //         "Title": "Found Nothing :(",
    //         "Subtitle": JSON.stringify(langs),
    //         "JsonRPCAction": {
    //           "method": "do_something_for_query",
    //           "parameters": ["https://github.com/Flow-Launcher/Flow.Launcher"]
    //         },
    //         "IcoPath": "Images\\app.png"
    //       }]
    //     }
    //   ))
    // }

  } else {
    console.log(JSON.stringify({ result: [] }))
  }
}

if (method == "toggle") {
  console.log("TOGGLE!")
  const slug = parameters[0]
  const name = parameters[1]

  console.log(slug)

  if (!opts.installedLangs.includes(slug)) {
    // Enabling
    const response = await fetch("https://documents.devdocs.io/cpp/index.json")
    const index = await response.json()
    console.log(index.entries[0])
    opts.installedLangs.push(slug)
  } else {
    // Disabling
  }
}

function do_something_for_query(url) {
  open(url);
}



