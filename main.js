// I apologise
import fuzzysort from 'fuzzysort'
import fetch from 'node-fetch'
import open from 'open'

import * as fs from 'fs'
import { json } from 'stream/consumers'

const { method, parameters } = JSON.parse(process.argv[2])

const DEFAULT_OPTIONS = {
  installedLangs: []
}

let opts = DEFAULT_OPTIONS;

// LOAD OPTIONS //////////////////////////////////////
try {
  opts = {
    ...DEFAULT_OPTIONS,
    ...JSON.parse(fs.readFileSync("./opts.json").toString())
  }
} catch (err) {
  opts = DEFAULT_OPTIONS
  fs.writeFile("./opts.json", JSON.stringify(opts), (err) => {
    if (err) throw err
  })
}

const saveOpts = () => {
  fs.writeFile("./opts.json", JSON.stringify(opts), (err) => {
    if (err) throw err
  })
}

let docs;

// LOAD DOCS ///////////////////////////////////////
try {
  docs = JSON.parse(fs.readFileSync("./docs.json").toString())

} catch (err) {
  // File does not exist or something
  const response = await fetch("https://devdocs.io/docs/docs.json")
  docs = await response.json(`indexes`)

  fs.writeFile("./docs.json", JSON.stringify(docs), (err) => {
    if (err) throw err;
  })
}


if (method === "query") {
  if (parameters[0].toLowerCase().startsWith("toggle")) {
    const searchQuery = parameters[0].toLowerCase().slice("toggle".length);

    const res = fuzzysort.go(searchQuery, docs, { key: "slug", limit: 5 })

    const langs = res.map((v) => ({
      Title: v.obj.name + " " + (v.obj.version || ""),
      Subtitle: (opts.installedLangs.includes(v.obj.slug)) ? "Disable" : "Enable",
      JsonRPCAction: {
        method: "toggle",
        parameters: [v.obj.slug, v.obj.name + " " + (v.obj.version || "")]
      },
      score: Math.floor(v.score) + 100,
      IcoPath: "Images\\icon.png"
    }))

    console.log(JSON.stringify(
      {
        result: langs
      }
    ))

  } else {
    // LOAD ENTRIES
    let entries = (await Promise.all(
      opts.installedLangs.map(async s =>
        JSON.parse(
          (await fs.promises.readFile(`indexes/${s}.json`)).toString())
      )
    )).flat();
    const res = fuzzysort.go(parameters[0], entries, {
      keys: ["slug", "name", "type"], limit: 4,
      scoreFn: a => Math.max(a[0] ? a[0].score : -30, -30) * 3 + Math.max(a[1] ? a[1].score : -50, -50) + Math.max(a[2] ? a[2].score : -50, -50) / 2
    })

    const resFormatted = res.map(v => ({
      Title: v.obj.name,
      Subtitle: v.obj.type + " - " + v.obj.lang,
      JsonRPCAction: {
        method: "open",
        parameters: [v.obj.url]
      },
      IcoPath: "Images\\icon.png"
    }))

    resFormatted.push({
      Title: `Seach for ${parameters[0]}`,
      Subtitle: "",
      JsonRPCAction: {
        method: "open",
        parameters: [`https://devdocs.io/#q=${parameters[0]}`]
      },
      IcoPath: "Images\\icon.png"
    })

    console.log(JSON.stringify({ result: resFormatted }))
  }
}

// TOGGLE ////////////////////////////////////////////
if (method == "toggle") {
  // console.log("TOGGLE!")
  const slug = parameters[0]
  const name = parameters[1]

  // console.log(slug)

  if (!opts.installedLangs.includes(slug)) {
    // console.log("enabling")

    // Enabling
    const response = await fetch(`https://documents.devdocs.io/${slug}/index.json`)
    const index = (await response.json()).entries.map((v) => ({
      slug: slug,
      lang: name,
      url: `https://devdocs.io/${slug}/${v.path}`,
      ...v
    }))

    fs.mkdir("indexes", (err) => {
      fs.writeFileSync(`indexes/${slug}.json`, JSON.stringify(index))
      opts.installedLangs.push(slug)
      saveOpts()
    })

  } else {
    // Disabling
    fs.rm(`indexes/${slug}.json`, (err) => { })
    opts.installedLangs.splice(opts.installedLangs.indexOf(slug))
    saveOpts()
  }
}

// OPEN
if (method === "open") {
  const url = parameters[0]
  open(url)
}
