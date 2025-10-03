const { app, globalShortcut } = require('electron')
app.whenReady().then(() => {
  const success = globalShortcut.register('Z', () => {
    console.log('shortcut triggered at', Date.now())
  })
  console.log('register success?', success)
})
