export const socketTestHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Socket.IO Notification Test Client</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; margin: 0; padding: 24px; color: #1c1e21; }
    .container { max-width: 760px; margin: 0 auto; }
    .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 20px; }
    h1 { margin-top: 0; font-size: 22px; color: #1877f2; display: flex; align-items: center; justify-content: space-between; }
    .status-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .status-connected { background: #e7f7ed; color: #0f8a3c; }
    .status-disconnected { background: #fde8e8; color: #e02424; }
    .dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; display: inline-block; }
    .dot-connected { background: #0f8a3c; }
    .dot-disconnected { background: #e02424; }
    label { font-weight: 600; font-size: 13px; color: #4b4f56; }
    input, textarea, button { width: 100%; padding: 10px 12px; border: 1px solid #ccd0d5; border-radius: 8px; font-size: 14px; box-sizing: border-box; margin-top: 6px; margin-bottom: 12px; }
    button { background: #1877f2; color: #fff; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #166fe5; }
    button.btn-disconnect { background: #e02424; }
    button.btn-disconnect:hover { background: #c81e1e; }
    .notif-item { background: #f7f8fa; border-left: 4px solid #1877f2; padding: 12px 16px; border-radius: 6px; margin-bottom: 10px; animation: slideIn 0.3s ease; }
    .notif-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .notif-time { font-size: 12px; color: #65676b; font-weight: normal; }
    .notif-content { font-size: 14px; color: #333; }
    .badge { background: #e02424; color: #fff; padding: 3px 9px; border-radius: 12px; font-size: 13px; font-weight: 700; }
    .empty-state { text-align: center; color: #8a8d91; padding: 30px; font-size: 14px; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>
        <span>🔔 Test Realtime Notification</span>
        <span id="statusBadge" class="status-badge status-disconnected">
          <span id="dot" class="dot dot-disconnected"></span>
          <span id="statusText">Chưa kết nối</span>
        </span>
      </h1>
      
      <label>Access Token (Bearer JWT)</label>
      <input type="text" id="tokenInput" placeholder="Dán accessToken của bạn vào đây..." />
      
      <button id="btnConnect" onclick="toggleConnect()">Kết Nối Socket.IO</button>
      <div id="connectionInfo" style="font-size: 12px; color: #65676b; display: none;"></div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px;">
          Hộp Thư Thông Báo 
          <span id="unreadBadge" class="badge" style="display: none;">0</span>
        </h2>
        <button onclick="clearNotifications()" style="width: auto; margin: 0; padding: 6px 12px; background: #e4e6eb; color: #050505;">Xoá màn hình</button>
      </div>

      <div id="notifList">
        <div class="empty-state">Chưa có thông báo nào. Hãy kết nối socket và gọi API từ Swagger để xem realtime nảy lên!</div>
      </div>
    </div>
  </div>

  <script>
    let socket = null;
    let unreadCount = 0;

    function toggleConnect() {
      if (socket && socket.connected) {
        socket.disconnect();
        return;
      }

      const token = document.getElementById('tokenInput').value.trim();
      if (!token) {
        alert('Vui lòng nhập Access Token!');
        return;
      }

      const btn = document.getElementById('btnConnect');
      btn.innerText = 'Đang kết nối...';
      btn.disabled = true;

      socket = io(window.location.origin, {
        auth: { token: token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        btn.innerText = 'Ngắt Kết Nối';
        btn.disabled = false;
        btn.className = 'btn-disconnect';

        const badge = document.getElementById('statusBadge');
        badge.className = 'status-badge status-connected';
        document.getElementById('dot').className = 'dot dot-connected';
        document.getElementById('statusText').innerText = 'ĐÃ KẾT NỐI REALTIME';

        const info = document.getElementById('connectionInfo');
        info.style.display = 'block';
        info.innerText = 'Socket ID: ' + socket.id;
      });

      socket.on('disconnect', (reason) => {
        btn.innerText = 'Kết Nối Socket.IO';
        btn.disabled = false;
        btn.className = '';

        const badge = document.getElementById('statusBadge');
        badge.className = 'status-badge status-disconnected';
        document.getElementById('dot').className = 'dot dot-disconnected';
        document.getElementById('statusText').innerText = 'Đã ngắt (' + reason + ')';
        document.getElementById('connectionInfo').style.display = 'none';
      });

      socket.on('connect_error', (err) => {
        alert('Kết nối thất bại: ' + err.message);
        btn.innerText = 'Kết Nối Socket.IO';
        btn.disabled = false;
        btn.className = '';
      });

      // Lắng nghe thông báo mới
      socket.on('notification:new', (notif) => {
        console.log('🔔 [Realtime Event notification:new]:', notif);
        appendNotification(notif);
      });

      // Lắng nghe cập nhật số lượng chưa đọc
      socket.on('notification:unread_count', (data) => {
        console.log('🔢 [Realtime Event notification:unread_count]:', data);
        updateUnreadCount(data.unreadCount);
      });
    }

    function appendNotification(notif) {
      const list = document.getElementById('notifList');
      if (list.querySelector('.empty-state')) {
        list.innerHTML = '';
      }

      const item = document.createElement('div');
      item.className = 'notif-item';
      const timeStr = new Date().toLocaleTimeString('vi-VN');

      item.innerHTML = 
        '<div class="notif-title">' +
          '<span>' + (notif.title || 'Thông báo mới') + '</span>' +
          '<span class="notif-time">' + timeStr + '</span>' +
        '</div>' +
        '<div class="notif-content">' + (notif.content || notif.body || '') + '</div>' +
        '<div style="margin-top: 6px; font-size: 11px; color: #888;">Type: ' + (notif.type || 'SYSTEM') + ' | Priority: ' + (notif.priority || 'NORMAL') + '</div>';

      list.prepend(item);
    }

    function updateUnreadCount(count) {
      unreadCount = count;
      const badge = document.getElementById('unreadBadge');
      if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    function clearNotifications() {
      document.getElementById('notifList').innerHTML = '<div class="empty-state">Hộp thư trống.</div>';
    }
  </script>
</body>
</html>`;
