export default (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file, 'utf-8')
    reader.onload = (e) => {
      const str = e.target?.result
      if (str && typeof str === 'string')
        resolve(str as string)
      else
        reject(new Error(`load file error: ${file.name}`))
    }
    reader.onerror = reject
  })
}
