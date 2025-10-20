-- Fix card_reviews table constraint issue
-- This script adds the missing unique constraint on (user_id, card_id)

-- First, check if the constraint already exists
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'card_reviews_user_id_card_id_key' 
        AND table_name = 'card_reviews'
    ) THEN
        ALTER TABLE card_reviews 
        ADD CONSTRAINT card_reviews_user_id_card_id_key 
        UNIQUE (user_id, card_id);
        
        RAISE NOTICE 'Added unique constraint on (user_id, card_id) to card_reviews table';
    ELSE
        RAISE NOTICE 'Unique constraint on (user_id, card_id) already exists in card_reviews table';
    END IF;
END $$;
