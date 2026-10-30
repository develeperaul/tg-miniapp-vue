package ru.finclubonline;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

/** Pure Java legacy adapter. Returns only changes; unrelated Firebase extras stay untouched. */
public final class LegacyPushPayload {
    private static final int MAX_LENGTH = 100_000;
    private static final int MAX_DEPTH = 5;
    private LegacyPushPayload() {}

    public static Map<String, String> normalize(Map<String, String> extras) {
        Map<String, String> changes = new LinkedHashMap<>();
        List<JSONObject> explicit = new ArrayList<>();
        // Top-level canonical routing wins, followed by nested explicit data, then body JSON.
        explicit.add(new JSONObject(extras));
        collect(extras.get("data"), 0, explicit);
        List<JSONObject> body = new ArrayList<>();
        String bodyKey = extras.containsKey("gcm.n.body") ? "gcm.n.body" : "gcm.notification.body";
        collect(extras.get(bodyKey), 0, body);
        collect(extras.get("body"), 0, body);
        for (String key : new String[]{"chat_id", "message_id", "url"}) {
            String alias = key.equals("chat_id") ? "chatId" : key.equals("message_id") ? "messageId" : key;
            String value = first(explicit, key, alias);
            if (value == null) value = first(body, key, alias);
            if (value != null && !value.equals(extras.get(key))) changes.put(key, value);
        }
        // Never replace a plain notification or use arbitrary JSON as display text.
        List<JSONObject> sdkBody = new ArrayList<>();
        collect(extras.get(bodyKey), 0, sdkBody);
        String message = firstText(sdkBody, "message");
        if (message != null) changes.put(bodyKey, message);
        return changes;
    }

    private static void collect(Object value, int depth, List<JSONObject> out) {
        if (depth > MAX_DEPTH) return;
        if (value instanceof String) {
            String text = (String) value;
            if (text.length() > MAX_LENGTH || !text.trim().startsWith("{")) return;
            try { value = new JSONObject(text); } catch (JSONException ignored) { return; }
        }
        if (!(value instanceof JSONObject)) return;
        JSONObject object = (JSONObject) value;
        out.add(object);
        collect(object.opt("data"), depth + 1, out);
        collect(object.opt("body"), depth + 1, out);
    }

    private static String first(List<JSONObject> records, String key, String alias) {
        for (JSONObject record : records) {
            for (String name : new String[]{key, alias}) {
                Object value = record.opt(name);
                if (value instanceof String && !((String) value).trim().isEmpty()) return (String) value;
                if (value instanceof Number) return value.toString();
            }
        }
        return null;
    }

    private static String firstText(List<JSONObject> records, String key) {
        for (JSONObject record : records) {
            Object value = record.opt(key);
            if (value instanceof String && !((String) value).trim().isEmpty()) return (String) value;
        }
        return null;
    }
}
