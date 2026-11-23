BEGIN;

-- 1. Identify IDs of obsolete events to delete
CREATE TEMP TABLE obsolete_event_ids AS
SELECT id FROM events
WHERE slug NOT IN (
    'max-urbn-unmute-spotify-rap-91-chennai',
    'the-sing-along-night-hip-hop-tamizha-idam',
    'ilaiyaraaja-50-celebrating-50-years-jn-stadium',
    'aws-future-builders-connect-chennai-2026',
    'route-143-anuv-jain-live-chennai',
    'vir-das-sounds-of-india-chennai',
    'rolling-loud-india-2026-mumbai',
    'gorillaz-the-mountain-tour-bengaluru-2027'
);

-- Delete dependent records for obsolete events
DELETE FROM tickets WHERE event_id IN (SELECT id FROM obsolete_event_ids);
DELETE FROM order_items WHERE ticket_type_id IN (
    SELECT id FROM ticket_types WHERE event_id IN (SELECT id FROM obsolete_event_ids)
);
DELETE FROM orders WHERE event_id IN (SELECT id FROM obsolete_event_ids);
DELETE FROM seat_holds WHERE inventory_id IN (
    SELECT id FROM seat_inventory WHERE session_id IN (
        SELECT id FROM event_sessions WHERE event_id IN (SELECT id FROM obsolete_event_ids)
    )
);
DELETE FROM seat_inventory WHERE session_id IN (
    SELECT id FROM event_sessions WHERE event_id IN (SELECT id FROM obsolete_event_ids)
);
DELETE FROM ticket_types WHERE event_id IN (SELECT id FROM obsolete_event_ids);
DELETE FROM event_sessions WHERE event_id IN (SELECT id FROM obsolete_event_ids);
DELETE FROM coupons WHERE event_id IN (SELECT id FROM obsolete_event_ids);
DELETE FROM events WHERE id IN (SELECT id FROM obsolete_event_ids);

-- 2. Update the 8 events with exact headlines, banner URLs, categories, and verification flags

-- Event 1: MAX URBN UNMUTE × Spotify RAP 91 — Asal Kolaar & Dacalty
UPDATE events SET
    title = 'MAX URBN UNMUTE — Asal Kolaar & Dacalty',
    short_summary = 'High-energy Tamil hip-hop and street culture festival featuring Asal Kolaar, Dacalty, live rap battles, and street fashion.',
    category = 'CONCERT',
    banner_url = 'https://cdn.happeningnext.com/events1/banners/85103c10-bb1f-11f1-9913-21574437e213-rimg-w1200-h600-dc080808-gmir.jpg?v=1790587947',
    thumbnail_url = 'https://cdn.happeningnext.com/events1/banners/85103c10-bb1f-11f1-9913-21574437e213-rimg-w1200-h600-dc080808-gmir.jpg?v=1790587947',
    status = 'PUBLISHED',
    is_featured = true,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'EVENTPULSE_MANAGED'
WHERE slug = 'max-urbn-unmute-spotify-rap-91-chennai';

-- Event 2: Hip Hop Tamizha: The Sing-Along Night
UPDATE events SET
    title = 'Hip Hop Tamizha — The Sing-Along Night',
    short_summary = 'Tribute and sing-along night by Band Regal celebrating the timeless hits of Hip Hop Tamizha with collective audience chorus.',
    description = 'An intimate community sing-along and live tribute by Band Regal celebrating the timeless anthems of Tamil hip-hop pioneers Hip Hop Tamizha. Important: This is an authorized tribute and sing-along concert where Band Regal performs the greatest chartbusters with the audience serving as the collective chorus. The original artists are not performing in person.',
    category = 'CONCERT',
    banner_url = 'https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-hiphop-tamizha-the-sing-along-night-0-2026-10-11-t-16-38-59.jpg',
    thumbnail_url = 'https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-hiphop-tamizha-the-sing-along-night-0-2026-10-11-t-16-38-59.jpg',
    status = 'PUBLISHED',
    is_featured = true,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'EVENTPULSE_MANAGED'
WHERE slug = 'the-sing-along-night-hip-hop-tamizha-idam';

-- Event 3: Ilaiyaraaja: Live in Concert (Historical - Past Event)
UPDATE events SET
    title = 'Ilaiyaraaja — Live in Concert',
    short_summary = 'Historic orchestral celebration featuring Symphony No. 1 Valiant and 50 years of timeless cinematic melodies.',
    description = 'Concluded historical event. ACTC Events presented From Raaja With Love at the Jawaharlal Nehru Stadium on May 30-31, 2026. Day 1 featured the maestro''s full orchestral Symphony No. 1 Valiant; Day 2 brought five decades of legendary film music performed with a 100-piece international orchestra. This historic event is retained as an archival record only and is closed for bookings.',
    category = 'CONCERT',
    banner_url = 'https://actcevents.com/wp-content/uploads/2026/05/Ilaiyaraaja-Concert-1920x700.jpg-3.jpeg',
    thumbnail_url = 'https://actcevents.com/wp-content/uploads/2026/05/Ilaiyaraaja-Concert-1920x700.jpg-3.jpeg',
    status = 'COMPLETED',
    is_featured = false,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'COMPLETED'
WHERE slug = 'ilaiyaraaja-50-celebrating-50-years-jn-stadium';

-- Event 4: AWS Builder Center: Future Builders Connect
UPDATE events SET
    title = 'AWS Builder Center — Future Builders Connect',
    short_summary = 'Hands-on generative AI, cloud infrastructure labs, and student developer challenges at Chennai Trade Centre.',
    description = 'AWS Builder Center: Future Builders Connect brings hands-on learning, AI workshops, the interactive Builder Zone, and swag challenges to Chennai Trade Centre. Verification Notice: City-specific Chennai edition date is currently pending final venue allocation. Ticket bookings are disabled until confirmed.',
    category = 'CONFERENCE',
    banner_url = 'https://prod-assets.cosmic.aws.dev/a/3JWzHdq5uHO24qWWEs3eXQ68T2t/Chat.webp',
    thumbnail_url = 'https://prod-assets.cosmic.aws.dev/a/3JWzHdq5uHO24qWWEs3eXQ68T2t/Chat.webp',
    status = 'PUBLISHED',
    is_featured = false,
    verification_status = 'PENDING_VERIFICATION',
    ticket_sale_status = 'UNVERIFIED_PENDING'
WHERE slug = 'aws-future-builders-connect-chennai-2026';

-- Event 5: Route 143: Anuv Jain
UPDATE events SET
    title = 'Route 143 — Anuv Jain',
    short_summary = 'Soulful indie music performance by Anuv Jain featuring Baarishein, Husn, and Alag Aasmaan under the open sky at EVP Film City.',
    category = 'CONCERT',
    banner_url = 'https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-route-143-anuv-jain-0-2026-9-26-t-20-49-21.jpg',
    thumbnail_url = 'https://assets-in.bmscdn.com/nmcms/events/banner/desktop/media-desktop-route-143-anuv-jain-0-2026-9-26-t-20-49-21.jpg',
    status = 'PUBLISHED',
    is_featured = true,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'EVENTPULSE_MANAGED'
WHERE slug = 'route-143-anuv-jain-live-chennai';

-- Event 6: Vir Das: Sounds of India
UPDATE events SET
    title = 'Vir Das — Sounds of India',
    short_summary = 'Emmy-winning comedian Vir Das performs his acclaimed audio-visual stand-up world tour in Chennai.',
    category = 'COMEDY',
    banner_url = 'https://images.squarespace-cdn.com/content/v1/57590b2fc6fc08a4c1687fa8/c0b3c4b4-1577-41ea-9906-5669e6113f38/SOI%2BBMS%2BAdapts%2B1-01.png?format=2500w',
    thumbnail_url = 'https://images.squarespace-cdn.com/content/v1/57590b2fc6fc08a4c1687fa8/c0b3c4b4-1577-41ea-9906-5669e6113f38/SOI%2BBMS%2BAdapts%2B1-01.png?format=2500w',
    status = 'PUBLISHED',
    is_featured = true,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'EVENTPULSE_MANAGED'
WHERE slug = 'vir-das-sounds-of-india-chennai';

-- Event 7: Rolling Loud India 2026
UPDATE events SET
    title = 'Rolling Loud India 2026',
    short_summary = 'The premier international hip-hop festival returns to Mumbai with multi-stage rap showcases.',
    description = 'Rolling Loud India returns to Mumbai for a massive hip-hop showcase. Verification Notice: Exact Mumbai venue and full artist lineup are currently pending official festival announcement. Ticket purchases remain disabled until verified.',
    category = 'CONCERT',
    banner_url = 'https://media.insider.in/image/upload/c_crop%2Cg_custom/v1763907067/qo3p5qdqtolndsg29xdx.png',
    thumbnail_url = 'https://media.insider.in/image/upload/c_crop%2Cg_custom/v1763907067/qo3p5qdqtolndsg29xdx.png',
    status = 'PUBLISHED',
    is_featured = false,
    verification_status = 'VENUE_UNCONFIRMED',
    ticket_sale_status = 'UNVERIFIED_PENDING'
WHERE slug = 'rolling-loud-india-2026-mumbai';

-- Event 8: Gorillaz: The Mountain Tour
UPDATE events SET
    title = 'Gorillaz — The Mountain Tour',
    short_summary = 'Damon Albarn and Jamie Hewlett''s iconic virtual band perform their historic first-ever live concert in India at District Arena.',
    category = 'CONCERT',
    banner_url = 'https://media.insider.in/image/upload/c_crop%2Cg_custom/v1775721351/jj6rpwaua5tc4ztw4zx0.jpg',
    thumbnail_url = 'https://media.insider.in/image/upload/c_crop%2Cg_custom/v1775721351/jj6rpwaua5tc4ztw4zx0.jpg',
    status = 'PUBLISHED',
    is_featured = true,
    verification_status = 'VERIFIED_OFFICIAL',
    ticket_sale_status = 'EVENTPULSE_MANAGED'
WHERE slug = 'gorillaz-the-mountain-tour-bengaluru-2027';

-- 3. Delete obsolete demo accounts if present
DELETE FROM users WHERE email IN ('priya@eventpulse.io', 'vikram@events.com', 'sarah@platform.com', 'marcus@gate.eventpulse.io');

-- Clean up temp table
DROP TABLE obsolete_event_ids;

COMMIT;
