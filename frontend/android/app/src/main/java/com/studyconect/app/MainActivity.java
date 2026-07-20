package com.studyconect.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                // Kênh thông báo mặc định (High Importance)
                NotificationChannel defaultChannel = new NotificationChannel(
                    "default",
                    "Default",
                    NotificationManager.IMPORTANCE_HIGH
                );
                defaultChannel.setDescription("Kênh thông báo mặc định");
                defaultChannel.enableVibration(true);
                defaultChannel.setShowBadge(true);
                notificationManager.createNotificationChannel(defaultChannel);

                // Kênh cuộc gọi đến (Max Importance)
                NotificationChannel callsChannel = new NotificationChannel(
                    "calls",
                    "Cuộc gọi đến",
                    NotificationManager.IMPORTANCE_HIGH
                );
                callsChannel.setDescription("Kênh thông báo cho cuộc gọi đến");
                callsChannel.enableVibration(true);
                callsChannel.setShowBadge(true);
                notificationManager.createNotificationChannel(callsChannel);
            }
        }
    }
}
