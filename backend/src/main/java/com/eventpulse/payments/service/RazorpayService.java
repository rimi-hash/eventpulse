package com.eventpulse.payments.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.orders.model.Order;
import com.eventpulse.payments.dto.RazorpayOrderResponse;
import com.eventpulse.payments.model.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;
    private final RestTemplate restTemplate;

    public RazorpayService(
            @Value("${eventpulse.razorpay.key-id:rzp_test_ToFUKFviPA02pH}") String keyId,
            @Value("${eventpulse.razorpay.key-secret:Hf8YKAGbpgXP5w25cP3qW2d6}") String keySecret,
            @Value("${eventpulse.razorpay.webhook-secret:ep_rzp_webhook_secret_2027}") String webhookSecret,
            RestTemplateBuilder restTemplateBuilder
    ) {
        this.keyId = keyId != null ? keyId.trim() : "";
        this.keySecret = keySecret != null ? keySecret.trim() : "";
        this.webhookSecret = webhookSecret != null ? webhookSecret.trim() : "";
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String getKeyId() {
        return keyId;
    }

    public String getKeySecret() {
        return keySecret;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    /**
     * Authoritatively creates an order on Razorpay servers using the order's backend total amount.
     */
    public RazorpayOrderResponse createRazorpayOrder(Order order, Payment payment) {
        if (keyId.isEmpty() || keySecret.isEmpty()) {
            throw new BadRequestException("Razorpay gateway credentials are not configured on the server");
        }

        // Authoritative server-side calculation: Convert to lowest currency unit (paise)
        long amountInPaise = order.getTotalAmount()
                .multiply(new BigDecimal("100"))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();

        String currency = "INR"; // Standard Razorpay test currency

        // If in test execution mode with mock keys
        if (keySecret.startsWith("test-dummy-secret-")) {
            String mockOrderId = "order_test_" + order.getOrderNumber().replace("-", "");
            payment.setGatewayPaymentIntentId(mockOrderId);
            return new RazorpayOrderResponse(
                    payment.getId(),
                    order.getId(),
                    mockOrderId,
                    keyId,
                    amountInPaise,
                    currency,
                    order.getOrderNumber(),
                    order.getContactEmail(),
                    order.getContactPhone(),
                    order.getEvent().getTitle()
            );
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(keyId, keySecret);

            Map<String, Object> payload = new HashMap<>();
            payload.put("amount", amountInPaise);
            payload.put("currency", currency);
            payload.put("receipt", "rcpt_" + order.getOrderNumber().substring(0, Math.min(order.getOrderNumber().length(), 40)));

            Map<String, String> notes = new HashMap<>();
            notes.put("orderId", order.getId().toString());
            notes.put("orderNumber", order.getOrderNumber());
            notes.put("customerEmail", order.getContactEmail());
            payload.put("notes", notes);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    RAZORPAY_ORDERS_URL,
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("id")) {
                throw new BadRequestException("Razorpay did not return a valid order ID");
            }

            String razorpayOrderId = (String) body.get("id");
            payment.setGatewayPaymentIntentId(razorpayOrderId);

            log.info("Created Razorpay Order {} for EventPulse Order {}", razorpayOrderId, order.getOrderNumber());

            return new RazorpayOrderResponse(
                    payment.getId(),
                    order.getId(),
                    razorpayOrderId,
                    keyId,
                    amountInPaise,
                    currency,
                    order.getOrderNumber(),
                    order.getContactEmail(),
                    order.getContactPhone(),
                    order.getEvent().getTitle()
            );

        } catch (HttpStatusCodeException ex) {
            log.error("Razorpay API order creation failed HTTP {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BadRequestException("Failed to create Razorpay payment order: " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            log.error("Unexpected error contacting Razorpay API", ex);
            throw new BadRequestException("Failed to initiate Razorpay checkout: " + ex.getMessage());
        }
    }

    /**
     * Verifies the cryptographic HMAC SHA256 payment signature returned by the client-side checkout.
     * Algorithm: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret) == razorpay_signature
     */
    public boolean verifyPaymentSignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        if (razorpayOrderId == null || razorpayPaymentId == null || razorpaySignature == null) {
            return false;
        }
        String payload = razorpayOrderId + "|" + razorpayPaymentId;
        String expectedSignature = calculateHmacSha256(payload, keySecret);
        return constantTimeEquals(expectedSignature, razorpaySignature);
    }

    /**
     * Verifies the cryptographic HMAC SHA256 signature for incoming Razorpay webhook events.
     * Algorithm: HMAC-SHA256(raw_request_body, webhook_secret) == X-Razorpay-Signature header
     */
    public boolean verifyWebhookSignature(String rawBody, String signatureHeader) {
        if (rawBody == null || signatureHeader == null || webhookSecret.isEmpty()) {
            return false;
        }
        String expectedSignature = calculateHmacSha256(rawBody, webhookSecret);
        return constantTimeEquals(expectedSignature, signatureHeader);
    }

    public static String calculateHmacSha256(String data, String secret) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to compute HMAC SHA256", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }
}
