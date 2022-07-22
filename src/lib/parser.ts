/* eslint-disable no-throw-literal */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-tabs */

export interface Item {
  key: string
  value: number
  unit: string
}
export interface Location {
  head: string
  site: string
}
export interface BinResult {
  binreg: string
  bitreg: string
}

export interface TestResult {
  eid: string
  binResult: BinResult
  location: Location
  items: Item[]
  itemDict: { [key: string]: Item }
  fileIndex: number
}
export class DeviceLog {
  constructor(
    public eid: string,
    public testResults: TestResult[] = [],
  ) {}
}

// APTINA_EID			0x00000000448000815780AD59E8820885
export const parseEID = (log: string) => {
  const [_, id] = log.match(/APTINA_EID\s+(0x.*)/) || []
  return id
}

// Bin Results    (1)         (1)
export const parseBinResult = (log: string): BinResult => {
  const [_, binreg, bitreg] = log.match(/Bin\sResults.*?\((\d)\).*?\((\d)\)/) || []
  return { binreg, bitreg }
}

export const parseHeadSite = (log: string): Location => {
  const [_, head, site] = log.match(/Head\((\d+)\)\sSite\((\d+)\)/) || []
  return { head, site }
}

export const parseItem = (log: string): Item[] => {
  return log
    .split('\n')
    .map((line) => {
      const [_, key, _value, unit = '', fail] = line.match(/(.*?)\s+(-?\d+\.?\d*?)\s(code|Code|mA|uA|V|v|ms|mS|ohms)(\s+F)?/) || []
      if (fail)
        throw `Fail: ${line}`
      const value = Number(_value)
      return { key, value, unit }
    })
    .filter(i => i.key && i.value)
}

export default (log: string, fileIndex: number) => {
  const tests = log.match(/\{[\s\S]*?\}/g)
  if (!tests)
    throw 'cannot find { and }'
  const dict: { [key: string]: DeviceLog } = {}
  for (const section of tests) {
    const eid = parseEID(section)
    if (!eid)
      continue
    const items = parseItem(section)
    const itemDict: { [key: string]: Item } = {}
    items.forEach(item => itemDict[item.key] = item)
    const result: TestResult = {
      eid,
      binResult: parseBinResult(section),
      location: parseHeadSite(section),
      items: parseItem(section),
      itemDict,
      fileIndex,
    }
    if (!dict[eid])
      dict[eid] = new DeviceLog(eid)

    dict[eid].testResults.push(result)
  }
  return dict
  // {
  //   "0x11111": deviceLog,
  //   "0x11112": deviceLog,
  //   "0x11113": deviceLog,
  //   "0x11114": deviceLog,
  //   "0x11114": deviceLog,
  // }
}
