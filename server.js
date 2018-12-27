// モジュール読み込み
const http = require('http')
const fs = require('fs')
const path = require('path')
const socketIO = require('socket.io')

let server = null
let io = null

/**
 * リクエストを処理する関数
 * @param {*} request 
 * @param {*} response 
 */
function requestListener (request, response) {
  const requestURL = request.url; // リクエストがあったURL
  const extensionName = path.extname(requestURL) // リクエストのあったファイルの拡張子
  
  switch (extensionName) {
    case '.html':
      readFileHandler(requestURL, 'text/html', false, response)
      break
    case '.css':
      readFileHandler(requestURL, 'text/css', false, response)
      break
    case '.js':
    case '.ts':
      readFileHandler(requestURL, 'text/javascript', false, response)
      break
    case '.png':
      readFileHandler(requestURL, 'image/png', false, response)
      break
    case '.jpg':
      readFileHandler(requestURL, 'image/jpg', false, response)
      break
    case '.gif':
      readFileHandler(requestURL, 'image/gif', false, response)
      break
    default:
      // 該当なしの場合はindex.htmlを読み込む
      readFileHandler('/index.html', 'text/html', false, response)
      break
  }
}

/**
 * ファイルの読み込み
 * @param {*} fileName 
 * @param {*} contentType 
 * @param {*} isBinary 
 * @param {*} response 
 */
function readFileHandler (fileName, contentType, isBinary, response) {
  const encoding = !isBinary ? 'utf8' : 'binary' // エンコード設定
  const filePath = __dirname + fileName // ファイルのフルパス

  fs.exists(filePath, (exits) => {
    if (exits) {
      // ファイルが存在する場合
      fs.readFile(filePath, { encoding: encoding }, (error, data) => {
        if (error) {
          response.statusCode = 500
          response.end('INternal Server Error')
        } else {
          response.statusCode = 200
          response.setHeader('Content-Type', contentType)
          if (!isBinary) {
            response.end(data)
          } else {
            response.end(data, 'binary')
          }
        }
      })
    } else {
      // ファイルが存在しない場合
      response.statusCode = 400
      response.end('400 Error')
    }
  })
}

// httpサーバーを立てて起動
server = http.createServer(requestListener)
server.listen((process.env.PORT || 5000), () => {
  console.log(`${(process.env.PORT || 5000)}でサーバーが起動しました`)
})

// socket.ioを使える状態に
io = socketIO.listen(server)

/**
 * サーバーへのアクセスを監視
 */
io.sockets.on('connection', (socket) => {
  let roomID

  // メイン画面からのデータ受信（メイン画面のペアリング）
  socket.on('pairingFromMain', (data) => {
    roomID = data.roomID
    socket.join(roomID)
    socket.emit('successLoginPC')
  })

  // メイン画面からのデータ受信（強制ペアリング）
  socket.on('forcePairingFromMain', (data) => {
    roomID = data.roomID
    socket.join(roomID)
    socket.emit('successPairing')
  })

  // コントローラーからのデータ受信
  socket.on('pairingFromController', (data) => {
    roomID = data.roomID
    socket.join(roomID)
    io.sockets.to(roomID).emit('successPairing') // ルームIDがroomIDのグループにsuccessPairingというデータを送信
  })

  // コントローラーを押した時のデータ受信
  socket.on('mouseDownFromControler', (data) => {
    socket.to(roomID).broadcast.emit('mouseDownToMain', data)
  })

  // コントローラーを押したまま動かした時のデータ受信
  socket.on('mouseMoveFromControler', (data) => {
    socket.to(roomID).broadcast.emit('mouseMoveToMain', data)
  })

  // コントローラーを離した時のデータ受信
  socket.on('mouseUpFromControler', (data) => {
    socket.to(roomID).broadcast.emit('mouseUpToMain', data)
  })
})

/**
 * 接続エラー
 */
io.sockets.on('connect_error', (socket) => {
  console.log('connect_error')
})

/**
 * 接続終了
 */
io.sockets.on('disconnect', (data) => {
  socket.emit('disconnectEvent')
  console.log('disconnecth')
})
