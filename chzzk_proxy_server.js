// chzzk_proxy_server.js
// 치지직 실시간 채팅 중계 백엔드 서버 (Socket.io & chzzk 라이브러리 기반)

try {
    const express = require('express');
    const http = require('http');
    const { Server } = require('socket.io');
    const { ChzzkClient } = require('chzzk');
} catch (e) {
    console.error("\n❌ 필수 npm 패키지가 누락되었습니다!");
    console.error("이 중계 서버를 실행하기 전에 아래 명령어를 실행하여 패키지를 설치해 주세요:");
    console.error("👉 npm install express socket.io chzzk\n");
    process.exit(1);
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ChzzkClient } = require('chzzk');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const client = new ChzzkClient();
// 연결된 채팅 인스턴스들을 관리하는 맵
const activeChats = new Map();

io.on('connection', (socket) => {
    console.log(`새로운 클라이언트 접속: ${socket.id}`);
    let currentChannelId = null;

    // 클라이언트에서 채널 ID를 보내며 연동을 요청했을 때
    socket.on('joinChannel', async (channelId) => {
        try {
            // 이미 연결된 다른 채널이 있다면 방에서 나감
            if (currentChannelId) {
                socket.leave(currentChannelId);
            }

            currentChannelId = channelId;
            socket.join(channelId); // 클라이언트를 해당 채널명으로 된 '방(room)'에 입장시킴

            console.log(`클라이언트 ${socket.id} 가 채널 [${channelId}] 연동 요청`);

            // 만약 서버 차원에서 아직 이 채널에 연결하지 않았다면 새로 연결 생성
            if (!activeChats.has(channelId)) {
                console.log(`새로운 치지직 채널 연결 시도: ${channelId}`);
                const chat = client.chat({
                    channelId: channelId,
                    pollInterval: 30 * 1000
                });

                chat.on('connect', () => {
                    console.log(`✅ 치지직 채널 연결 성공: ${channelId}`);
                });

                chat.on('chat', (chatData) => {
                    const nickname = chatData.profile.nickname;
                    const text = chatData.hidden ? "[블라인드 처리 됨]" : chatData.message; 
                    
                    let emojis = {};
                    if (chatData.extras && chatData.extras.emojis) {
                         emojis = chatData.extras.emojis; 
                    }

                    // 💡 핵심: 전체가 아닌, 해당 '방(채널)'에 접속 중인 클라이언트들에게만 메시지 전송
                    io.to(channelId).emit('chatMessage', { 
                        nickname: nickname, 
                        message: text,
                        emojis: emojis
                    });
                });

                await chat.connect();
                activeChats.set(channelId, chat);
            }

            // 연결 성공 시 클라이언트에게 알림
            socket.emit('channelConnected');

        } catch (error) {
            console.error("❌ 치지직 연동 에러:", error);
            socket.emit('channelError', error.message);
        }
    });

    // 치지직 채널명 검색 요청 처리
    socket.on('searchChannel', async (keyword) => {
        try {
            console.log(`[Search] 채널 검색 키워드: ${keyword}`);
            const response = await fetch(`https://api.chzzk.naver.com/service/v1/search/channels?keyword=${encodeURIComponent(keyword)}&size=8`);
            if (!response.ok) {
                throw new Error("네이버 검색 API 호출 실패");
            }
            const data = await response.json();
            
            const results = (data.content && data.content.data) ? data.content.data.map(item => ({
                channelId: item.channel.channelId,
                channelName: item.channel.channelName,
                channelImageUrl: item.channel.channelImageUrl,
                openLive: item.live ? item.live.openLive : false
            })) : [];
            
            socket.emit('searchResult', results);
        } catch (error) {
            console.error("❌ 채널 검색 에러:", error);
            socket.emit('searchError', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`클라이언트 접속 종료: ${socket.id}`);
    });
});

const PORT = process.env.PORT || process.argv[2] || 3000;

server.listen(PORT, () => {
    console.log("==========================================================");
    console.log(`🚀 치지직 실시간 다중 채널 중계 서버가 가동되었습니다.`);
    console.log(`   - 로컬 서버 주소: http://localhost:${PORT}`);
    console.log("==========================================================");
});
