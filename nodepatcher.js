'use strict'

/*

USAGE:
node nodepatcher.js patchfile.txt input.dat

*/

const fs = require('fs')
const readline = require('readline')

const replaceInfo = []

function fileExists (filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch (err) {
    return false
  }
}

const Errors = []
const Changes = []

if (
  process.argv.length === 4 &&
  fileExists(process.argv[2]) &&
  fileExists(process.argv[3])
) {
  fs.writeFileSync('replaces.log', '', { encoding: 'utf8', flag: 'w' })
  main()
} else {
  fs.writeFileSync('replaces.log', '[Errors]\nInvalid command line', {
    encoding: 'utf8',
    flag: 'w'
  })
  console.log('Invalid command line.')
  process.exit()
}

async function main () {
  try {
    const fileSize = fs.statSync(process.argv[3])['size']

    await readfile(process.argv[2], fileSize)

    const newfilename = await copyfile(process.argv[3])

    const writeFileHandle = await openfile(newfilename, 'r+')

    const readFileHandle = await openfile(process.argv[3], 'r')

    for (let v of replaceInfo) {
      const buf = await readbyte(readFileHandle, v.offset.decimal)
      if (`0x${buf.toString('hex')}` !== v.find) {
        Errors.push(
          `offset ${v.offset.hex}: 0x${buf.toString('hex')} not found`
        )
      } else {
        await writebyte(writeFileHandle, v.offset.decimal, v.replace)
        Changes.push(
          `offset ${v.offset.hex}: ${v.find} was replaced with ${v.replace}`
        )
      }
    }

    await closefile(readFileHandle)

    await closefile(writeFileHandle)

    if (Errors.length > 0) {
      await write('replaces.log', `[Errors]\n${Errors.join('\n')}\n`, {
        encoding: 'utf8',
        flag: 'a'
      })
    }

    if (Changes.length > 0) {
      await write('replaces.log', `\n[Changes]\n${Changes.join('\n')}\n`, {
        encoding: 'utf8',
        flag: 'a'
      })
    }

    console.log(`Bytes replaced: ${Changes.length}`)
    console.log(`Errors: ${Errors.length}`)
    console.log(`See replaces.log for details`)
  } catch (err) {
    console.log(err)
  }
}

function readfile (inputfile, fileSize) {
  let count = 0
  return new Promise((resolve, reject) => {
    readline
      .createInterface({
        input: fs.createReadStream(inputfile, 'utf8'),
        terminal: false,
        historySize: 0,
        output: null,
        crlfDelay: Infinity
      })
      .on('line', line => {
        count++
        line = line.replace(/^\uFEFF/, '')
        let m

        if (/^#/.test(line)) {
        } else if (
          line.length < 100 &&
          (m = /^(0[xX][0-9a-fA-F]+)[ \t]+(0[xX][0-9a-fA-F]{2})[ \t]+(0[xX][0-9a-fA-F]{2})$/.exec(
            line
          ))
        ) {
          const offset = parseInt(m[1])
          const find = m[2].toLowerCase()
          const replace = m[3].toLowerCase()
          if (offset < fileSize) {
            replaceInfo.push({
              offset: { decimal: offset, hex: m[1].toLowerCase() },
              find: find,
              replace: replace
            })
          } else {
            Errors.push(`Line ${count}: ${m[1]} - Invalid offset`)
          }
        } else {
          Errors.push(`Line ${count}: Invalid format`)
        }
      })
      .on('close', () => {
        resolve()
      })
  })
}

function copyfile (file) {
  return new Promise((resolve, reject) => {
    const newfile = `${file}.new`
    fs.copyFile(file, newfile, err => {
      if (err) reject(err)
      resolve(newfile)
    })
  })
}

function readbyte (fd, offset) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.alloc(1)
    fs.read(fd, buf, 0, 1, offset, (err, bytesRead, buf) => {
      if (err) reject(err)
      resolve(buf)
    })
  })
}

function writebyte (fd, offset, replace_byte_hex) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(replace_byte_hex.replace(/0x/, ''), 'hex')
    fs.write(fd, buf, 0, 1, offset, err => {
      if (err) reject(err)
      resolve()
    })
  })
}

function write (file, data, options) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, data, options, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function closefile (fd) {
  return new Promise((resolve, reject) => {
    fs.close(fd, err => {
      if (err) reject(err)
      resolve()
    })
  })
}

function openfile (path, flag) {
  return new Promise((resolve, reject) => {
    fs.open(path, flag, (err, fd) => {
      if (err) reject(err)
      resolve(fd)
    })
  })
}
