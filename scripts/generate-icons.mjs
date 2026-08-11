import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'public/icons/icon.svg')
await sharp(source).resize(192, 192).png().toFile(resolve(root, 'public/icons/icon-192.png'))
await sharp(source).resize(512, 512).png().toFile(resolve(root, 'public/icons/icon-512.png'))
await sharp(source).extend({ top: 64, bottom: 64, left: 64, right: 64, background: '#173f35' })
  .resize(512, 512).png().toFile(resolve(root, 'public/icons/icon-maskable-512.png'))
