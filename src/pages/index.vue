<script setup lang="ts">
import type { DeviceLog } from '~/lib/parser'
import parseLog from '~/lib/parser'
import readFileSync from '~/lib/readFileSync'

const LOG_NUM = 4
const TEST_NUM = 20
const files = ref<File[]>([])
const once = ref(false)
const parsing = ref(false)
const parsedNum = ref(0)
const parseTime = ref(0)
const selectedItem = ref('')
const filter = ref({
  device: '',
  item: '',
})
const deviceLogs = ref<DeviceLog[]>()

const deviceIDs = computed(() => deviceLogs.value?.map(log => log.eid))
const itemNames = computed(() => {
  const out: { [key: string]: boolean } = {}
  const [firstLog] = deviceLogs.value || []
  firstLog?.testResults.forEach((r) => {
    r.items.forEach(i => out[i.key] = true)
  })
  return Object.keys(out).sort()
})
const timesTable = computed(() => {
  const rowsDict: { [key: string]: number[] } = {}
  deviceLogs.value?.forEach((log) => {
    rowsDict[log.eid] = Array(files.value.length).fill(0)
  })
  deviceLogs.value?.forEach((log) => {
    log.testResults.forEach((r) => {
      const site = Number(r.location.site)
      if (site < rowsDict[log.eid].length)
        rowsDict[log.eid][site] += 1
      else
        console.error(`site number (${site}) > file length (${files.value.length})`)
    })
  })
  return rowsDict
})

const run = async () => {
  const fileCount = files.value.length
  if (fileCount !== LOG_NUM)
    return alert(`Please pick ${LOG_NUM} log files.`)
  if (parsing.value || once.value)
    return
  once.value = true
  parsing.value = true
  const start = +new Date()
  try {
    for (const [fileIndex, file] of files.value.entries()) {
      const logString = await readFileSync(file)
      const deviceLogDict = parseLog(logString, fileIndex)
      if (!deviceLogs.value) {
        deviceLogs.value = Object.values(deviceLogDict)
      }
      // merge deviceLogDict into existing deviceLogs
      else {
        Object.entries(deviceLogDict).forEach(([eid, newDeviceLog]) => {
          const [target] = deviceLogs.value!.filter(log => log.eid === eid)
          if (!target)
            deviceLogs.value!.push(newDeviceLog)

          else
            target.testResults = target.testResults.concat(newDeviceLog.testResults)
        })
      }
      parsedNum.value += 1
    }
    parsing.value = false
    const end = +new Date()
    parseTime.value = end - start
  }
  catch (e) {
    alert(e)
  }
}
const itemTableDict = computed(() => {
  const itemName = filter.value.item
  const dict: { [key: string]: number[] } = {}
  if (deviceLogs.value && itemName) {
    const logs = !filter.value.device ? deviceLogs.value : deviceLogs.value.filter(log => log.eid === filter.value.device)
    logs.forEach(log => dict[log.eid] = log.testResults.map(r => +r.itemDict[itemName].value))
  }
  return dict
})
const downloadExcel = () => alert('施工中')
const clearFiles = () => window.location = '/'
</script>

<template lang="pug">
.p4
  .flex.space-x-2.items-center
    q-file.flex-grow(
      @keydown.enter="run"
      v-model='files',
      label='Pick 4 Log Files',
      outlined,
      multiple,
      max-files='4',
      counter,
      use-chips,
      clearable,
      @clear="clearFiles")
  .flex
    div
      q-btn.h-8(v-show='!parsing', @click='run', color='primary') Run
    .ml-4(v-show='once')
      p.text-sm Parse {{ parsedNum }} files, found {{ deviceIDs?.length}} devices.
      small(v-show='parseTime > 0') Use {{ Number(parseTime / 1000).toFixed(1) }} seconds.

  .mt-4(v-show='!parsing && once')
    .my-4
      .text-xl Test Times
      table.text-base.table.text-center.font-mono.border
        thead
          tr
            td Device
            td.text-center(:colspan="files.length") Site
          tr.border-b
            td EID
            td.w-8(v-for='i in files.length') {{ i }}
        tbody
          tr.border-b(v-for='[id, row] in Object.entries(timesTable)', :key='id')
            td.border-r.px2 {{ id }}
            td.px2(v-for='j in row.length') {{ row[j-1] }}
    .mt-12
      .flex.justify-between.items-center(v-if='deviceLogs && deviceLogs?.length > 0')
        .flex.space-x-2.items-center
          q-select.w-80(
            filled,
            v-model='filter.device',
            label='EID',
            :options='deviceIDs',
            clearable)
            template(v-slot:no-option)
              q-item: q-item-section No Results
          q-select.w-80(
            filled,
            v-model='filter.item',
            @input-value="(val) => selectedItem = val"
            use-input,
            label='Test Item',
            :options='itemNames.filter(n => n.toLowerCase().match(selectedItem.toLowerCase()))',
            clearable)

          //- q-btn(@click='updateItemTable(filter.item)') Check Test Item
        q-btn.h-8.px-2(@click='downloadExcel', dense) Download Excel
      div(v-else) Parse Fail. No Results.
    .w-full.overflow-x-scroll(v-show='Object.keys(itemTableDict).length > 0')
      table.mt-2
        tr.border.text-center
          td Device EID
          td.border-x(:colspan="TEST_NUM", v-for='i in files.length') Log {{ i }}
        tr.font-mono.border-b(v-for='[key, value] in Object.entries(itemTableDict)')
          td.border.px2 {{key}}
          td.px2(v-for='(v, i) in value', :class='{"bg-gray-200": Math.floor(i / 20) % 2 === 0}') {{ v }}
</template>

<style lang="scss">
.mono {
  font-family: monospace;
}
</style>
