package ru.finclubonline;

import static org.junit.Assert.*;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;
import org.junit.Test;

public class LegacyPushPayloadTest {
    private static final String CHAT = "019cb94e-73c1-710f-9208-cfef55ef91e8";
    private static final String LEGACY = "{\"data\":{\"message\":\"test 8\",\"chat_id\":\"" + CHAT + "\"}}";

    @Test public void screenshotPayloadBecomesTrayTextAndClickRoute() {
        Map<String, String> input = Map.of("gcm.n.body", LEGACY);
        Map<String, String> result = LegacyPushPayload.normalize(input);
        assertEquals("test 8", result.get("gcm.n.body"));
        assertEquals(CHAT, result.get("chat_id"));
        assertEquals(LEGACY, input.get("gcm.n.body"));
    }
    @Test public void explicitRoutingWinsOverLegacyBody() {
        Map<String, String> result = LegacyPushPayload.normalize(Map.of(
            "gcm.n.body", LEGACY, "chat_id", "canonical", "data", "{\"chat_id\":\"nested\"}"));
        assertFalse(result.containsKey("chat_id"));
        assertEquals("test 8", result.get("gcm.n.body"));
        assertEquals("nested", LegacyPushPayload.normalize(Map.of(
            "gcm.n.body", LEGACY, "data", "{\"chat_id\":\"nested\"}")).get("chat_id"));
    }
    @Test public void stringifiedNestedBodyAndLegacySdkPrefix() throws Exception {
        String json = new JSONObject().put("body", new JSONObject().put("data",
            new JSONObject().put("message", "nested text").put("chatId", 42).toString()).toString()).toString();
        Map<String, String> result = LegacyPushPayload.normalize(Map.of("gcm.notification.body", json));
        assertEquals("nested text", result.get("gcm.notification.body"));
        assertEquals("42", result.get("chat_id"));
    }
    @Test public void preservesPlainMalformedUnrecognizedAndOversizedBodies() {
        for (String body : new String[]{"ordinary text", "{broken", "[]", "{\"message\":7}",
                "{\"title\":\"hello\"}", "{" + " ".repeat(100_000) + "}"}) {
            assertTrue(LegacyPushPayload.normalize(Map.of("gcm.n.body", body)).isEmpty());
        }
    }
    @Test public void boundsRecursion() throws Exception {
        String json = LEGACY;
        for (int i = 0; i < 7; i++) json = new JSONObject().put("data", new JSONObject(json)).toString();
        assertTrue(LegacyPushPayload.normalize(Map.of("gcm.n.body", json)).isEmpty());
    }
    @Test public void preservesSdkMetadataAndDoesNotReplacePlainBodyFromData() {
        Map<String, String> original = Map.of("gcm.n.body", "plain", "gcm.n.title", "Title",
            "gcm.n.android_channel_id", "messages", "google.c.a.e", "1", "google.message_id", "id",
            "data", "{\"message\":\"data text\",\"chat_id\":\"route\"}");
        Map<String, String> merged = new HashMap<>(original);
        merged.putAll(LegacyPushPayload.normalize(original));
        for (String key : original.keySet()) assertEquals(original.get(key), merged.get(key));
        assertEquals("route", merged.get("chat_id"));
    }
}
