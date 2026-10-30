package ru.finclubonline;

import android.content.Intent;
import android.os.Bundle;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;
import java.util.HashMap;
import java.util.Map;

public class LegacyMessagingService extends MessagingService {
    /**
     * Compatibility workaround for legacy JSON notification bodies only.
     * Firebase Messaging 25.0.1 exposes this public @hide hook (not a supported SDK API).
     * Revalidate before upgrading: normalization must run before SDK tray/PendingIntent creation.
     * Token refresh and foreground delivery remain inherited from Capawesome.
     */
    @Override
    public void handleIntent(Intent intent) {
        String action = intent.getAction();
        if ("com.google.android.c2dm.intent.RECEIVE".equals(action)
                || "com.google.firebase.messaging.RECEIVE_DIRECT_BOOT".equals(action)) {
            Bundle extras = intent.getExtras();
            if (extras != null) {
                Map<String, String> strings = new HashMap<>();
                for (String key : extras.keySet()) {
                    Object value = extras.get(key);
                    if (value instanceof String) strings.put(key, (String) value);
                }
                for (Map.Entry<String, String> change : LegacyPushPayload.normalize(strings).entrySet()) {
                    intent.putExtra(change.getKey(), change.getValue());
                }
            }
        }
        super.handleIntent(intent);
    }
}
