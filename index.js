const express = require('express')
const app = express()

const { readFileSync } = require('fs')
const login = require('facebook-chat-api')

const loginPath = { appState: JSON.parse(readFileSync(__dirname + "/src/appState.json", "utf-8")) }

const admin = require('firebase-admin')
const serviceAccount = require('./src/firebase.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://Paste_YOUR_FIREBASE_URL.firebasedatabase.app',
})

const db = admin.database()

function saveMsg(nameKey, timeValue, msgValue) {
  let data = {}
  data[timeValue] = msgValue
  db.ref(nameKey).once('value', (snapshot) => {
    if (snapshot.exists()) {
      db.ref(nameKey).update(data, () => {})
    } else {
      let newData = {}
      newData[nameKey] = data
      db.ref().update(newData, () => {})
    }
  })
}


login(loginPath, (err, api) => {
  if (err) return console.log(err)
  api.listenMqtt((err, message) => {
    let attachment = message.attachments
    let threadID = message.threadID
    let userId = message.senderID
    let mess = message.body
    if (mess || attachment) {
      api.getThreadInfo(threadID, (err, info) => {
        // Nếu đoạn chat có hơn 2 người thì gán nameKey là id đoạn chat
        let nameKey = info.participantIDs.length > 2 ? threadID : null
        let timeValue = message.timestamp
        let attachmentOrMsg = attachment.length ? attachment : mess
        let msgValue = Array.isArray(attachmentOrMsg) ? attachmentOrMsg.map(item => item.url).join(' | ') : mess
        api.getUserInfo(userId, (err, info) => {
          if (!nameKey) {
            nameKey = info[userId].name
          }
          saveMsg(nameKey, timeValue, msgValue)
        })
      })
    }
  })
})


app.get('/', (req, res) => {
  res.send('Unseen Messages')
})
app.use((req, res) => {
  res.status(404).send('Trang không tồn tại')
})
app.listen(3000, () => {
  console.log("App is running on http://localhost:3000")
})