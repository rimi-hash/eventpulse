-- EventPulse Database Cleanup Script
-- Retains authentic venues and verified events
-- Cleans all demonstration users, leaving exactly ONE secure platform administrator

BEGIN;

-- 1. Create or get Platform Administrator ID
DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_hash VARCHAR(255) := '$2a$12$4NFK5RbAgjdX4/VGaJpIwuibN6veD4Bci2r5EKxXz9ivfIZPXSp9u'; -- BCrypt hash for password
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@eventpulse.io') THEN
        INSERT INTO users (id, email, username, full_name, password_hash, role, is_verified, is_active, phone_number, created_at, updated_at)
        VALUES (v_admin_id, 'admin@eventpulse.io', 'admin', 'Platform Administrator', v_hash, 'PLATFORM_ADMIN', true, true, '+919876500000', NOW(), NOW());
    ELSE
        SELECT id INTO v_admin_id FROM users WHERE email = 'admin@eventpulse.io';
    END IF;

    -- 2. Reassign organization owner to admin
    UPDATE organizations SET owner_id = v_admin_id;

    -- 3. Remove demo transactional data
    DELETE FROM checkin_logs;
    DELETE FROM resale_listings;
    DELETE FROM ticket_transfers;
    DELETE FROM tickets;
    DELETE FROM payments;
    DELETE FROM coupon_redemptions;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM password_reset_tokens;
    DELETE FROM organization_members;
    DELETE FROM notifications;

    -- 4. Delete all demo and non-admin users
    DELETE FROM users WHERE email != 'admin@eventpulse.io';

    -- 5. Reset inventory status to AVAILABLE
    UPDATE seat_inventory SET status = 'AVAILABLE';
    UPDATE ticket_types SET sold_count = 0;

END $$;

COMMIT;
