#!/bin/bash
set -e

mongosh <<EOF
use notification_db;

# Tạo collection và index
db.createCollection("notifications");
db.notifications.createIndex({ userId: 1, createdAt: -1 });

# Tạo user riêng cho Notification Service
db.createUser({
  user: "notif_user",
  pwd: "notif_pass",
  roles: [{ role: "readWrite", db: "notification_db" }]
});
EOF
