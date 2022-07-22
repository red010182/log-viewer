import fs from 'fs'
import parser from './parser'

const log1 = fs.readFileSync('./1.log', 'utf-8')
console.log(log1.length, parser(log1, 1))
