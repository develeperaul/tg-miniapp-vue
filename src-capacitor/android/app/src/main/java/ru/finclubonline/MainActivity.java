package ru.finclubonline;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Metadata only controls initialization; also clear delegation persisted by older installs.
        // Asynchronous Task: no token access and no blocking the UI thread.
        FirebaseMessaging.getInstance().setNotificationDelegationEnabled(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "messages", "Сообщения", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Сообщения и уведомления FinClub Online");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}
